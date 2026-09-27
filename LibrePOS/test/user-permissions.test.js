import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mayCorrectSalePayment, normalizeUserPermissions } from '../src/user-permissions.js';

const sessions = [{ id:'open', status:'open', openedAt:'2026-09-27' }, { id:'closed', status:'closed' }];
const openSale = { id:'s1', cashSessionId:'open', paymentMethod:'Tarjeta' };
const closedSale = { id:'s2', cashSessionId:'closed', paymentMethod:'Tarjeta' };
const admin = { id:'admin', name:'Admin demo', username:'admin', functions:['admin'], password:'test-admin', active:true };
const cashier = { id:'cashier', name:'Caja demo', username:'caja', functions:['caja'], password:'test-caja', active:true };

test('only active administrators can correct by default, including legacy Caja users', () => {
  for (const sale of [openSale, closedSale]) {
    assert.equal(mayCorrectSalePayment(admin, sale, sessions), true);
    assert.equal(mayCorrectSalePayment(cashier, sale, sessions), false);
    assert.equal(mayCorrectSalePayment({ role:'Caja' }, sale, sessions), false);
    assert.equal(mayCorrectSalePayment({ role:'Administrador' }, sale, sessions), true);
    assert.equal(mayCorrectSalePayment({ ...admin, active:false }, sale, sessions), false);
  }
  assert.equal(mayCorrectSalePayment(null, openSale, sessions), false);
  assert.equal(mayCorrectSalePayment(admin, null, sessions), false);
  assert.deepEqual(normalizeUserPermissions({ correctPayments:'invalid' }), { correctPayments:'none' });
});
test('grants are explicit, revocable and scoped to current open or any cash session', () => {
  const user = { ...cashier, permissions:{ correctPayments:'open' } };
  assert.equal(mayCorrectSalePayment(user, openSale, sessions), true);
  assert.equal(mayCorrectSalePayment(user, closedSale, sessions), false);
  assert.equal(mayCorrectSalePayment(user, { cashSessionId:'missing' }, sessions), false);
  assert.equal(mayCorrectSalePayment(user, openSale, [...sessions, { id:'new', status:'open', openedAt:'2026-09-28' }]), false);
  user.permissions.correctPayments = 'all';
  assert.equal(mayCorrectSalePayment(user, closedSale, sessions), true);
  assert.equal(mayCorrectSalePayment({ ...user, functions:['mesero'] }, openSale, sessions), false);
  user.permissions.correctPayments = 'none';
  assert.equal(mayCorrectSalePayment(user, openSale, sessions), false);
});
test('server enforces grants with authenticated identity, rejects forged roles and applies revocation', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'librepos-permissions-'));
  const savedDir = process.env.LIBREPOS_DATA_DIR;
  process.env.LIBREPOS_DATA_DIR = dir;
  let createSyncMiddleware;
  try { ({ createSyncMiddleware } = await import(`../sync-store.js?permissions=${Date.now()}`)); }
  finally { if (savedDir === undefined) delete process.env.LIBREPOS_DATA_DIR; else process.env.LIBREPOS_DATA_DIR = savedDir; }
  const middleware = createSyncMiddleware();
  const server = createServer((req,res) => void middleware(req,res,() => res.end('test')));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(dir,{recursive:true,force:true}); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const cookie = (await fetch(origin)).headers.get('set-cookie').split(';')[0];
  const post = async (endpoint, payload, token='') => {
    const response = await fetch(origin+endpoint,{method:'POST',headers:{cookie,'Content-Type':'application/json','X-LibrePOS-Session':token},body:JSON.stringify(payload)});
    return { status:response.status, ...await response.json() };
  };
  let snapshot = await post('/api/state',{baseVersion:0,state:{ settings:{},users:[admin,cashier],sales:[openSale,closedSale],cashSessions:sessions,orders:[],cancellations:[],inventory:[],ingredientCategories:[],inventoryMovements:[],expenses:[],menuProducts:[],extraCatalog:[],attendance:[] }});
  assert.equal(snapshot.status,200);
  const adminLogin = await post('/api/login',{username:'admin',password:'test-admin'});
  const cajaLogin = await post('/api/login',{username:'caja',password:'test-caja'});
  assert.ok(adminLogin.sessionToken);
  const save = async (mutate,token) => { const next=structuredClone(snapshot.state); mutate(next); return post('/api/state',{baseVersion:snapshot.version,state:next},token); };
  const correct = (id,author) => state => { const sale=state.sales.find(s=>s.id===id); sale.paymentMethod=sale.paymentMethod==='Tarjeta'?'Efectivo':'Tarjeta'; sale.paymentCorrections=[...(sale.paymentCorrections||[]),{createdBy:author,reason:'Prueba permiso'}]; };
  assert.equal((await save(correct('s1','admin'))).status,403,'claiming admin without login is insufficient');
  assert.equal((await save(correct('s1','cashier'),cajaLogin.sessionToken)).status,403);
  assert.equal((await save(s=>{s.users[1].permissions={correctPayments:'all'};},cajaLogin.sessionToken)).status,403);
  assert.equal((await save(s=>{s.users[1].functions=['admin'];},cajaLogin.sessionToken)).status,403);
  assert.equal((await save(s=>{s.users[0].password='hacked';},cajaLogin.sessionToken)).status,403);
  snapshot=await save(s=>{s.users[1].permissions={correctPayments:'open'};},adminLogin.sessionToken);
  assert.equal(snapshot.status,200);
  snapshot=await save(correct('s1','cashier'),cajaLogin.sessionToken);assert.equal(snapshot.status,200);
  assert.equal((await save(correct('s2','cashier'),cajaLogin.sessionToken)).status,403);
  assert.equal((await save(s=>{s.cashSessions[1].status='open';correct('s2','cashier')(s);},cajaLogin.sessionToken)).status,403);
  snapshot=await save(s=>{s.users[1].permissions={correctPayments:'all'};},adminLogin.sessionToken);assert.equal(snapshot.status,200);
  snapshot=await save(correct('s2','cashier'),cajaLogin.sessionToken);assert.equal(snapshot.status,200);
  snapshot=await save(s=>{s.users[1].permissions={correctPayments:'none'};},adminLogin.sessionToken);assert.equal(snapshot.status,200);
  assert.equal((await save(correct('s1','cashier'),cajaLogin.sessionToken)).status,403,'existing sessions must respect revoked grants');
  snapshot=await save(correct('s2','admin'),adminLogin.sessionToken);assert.equal(snapshot.status,200);
  const concurrent = await Promise.all([
    save(s=>{s.settings.note='first';},adminLogin.sessionToken),
    save(s=>{s.settings.note='second';},adminLogin.sessionToken),
  ]);
  assert.deepEqual(concurrent.map(result=>result.status).sort(),[200,409],'only one state write may use a given base version');
  snapshot=concurrent.find(result=>result.status===200);
  await post('/api/logout',{},adminLogin.sessionToken);
  assert.equal((await save(correct('s2','admin'),adminLogin.sessionToken)).status,403);
});
