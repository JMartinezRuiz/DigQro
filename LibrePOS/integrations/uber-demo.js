// A synthetic v2 fixture, never sent to Uber. Used only in disposable demo data.
export function demoUberOrder(id) {
  const price = amount => ({ amount, currency_code: 'MXN' });
  return { id, display_id: id.slice(-5).toUpperCase(), current_state: 'CREATED', type: 'DELIVERY_BY_UBER', store: { id: 'librepos-demo-store' },
    eater: { first_name: 'Cliente de prueba' }, placed_at: new Date().toISOString(),
    estimated_ready_for_pickup_at: new Date(Date.now() + 20 * 60000).toISOString(),
    cart: { special_instructions: 'Pedido ficticio. Preparar para llevar.', items: [{ id: 'demo-cafe-uber', instance_id: 'item-1', title: 'Café de prueba', quantity: 2,
      special_instructions: 'Sin azúcar', selected_modifier_groups: [], price: { total_price: price(8000), unit_price: price(4000) } }] },
    payment: { charges: { sub_total: price(8000), tax: price(1103), total: price(8000) } } };
}
