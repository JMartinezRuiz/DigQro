import test from "node:test";
import assert from "node:assert/strict";
import { lanAccessUrls } from "../lan-access.js";
const entry = (address) => ({ address, family: "IPv4", internal: false });
const interfaces = { tun0: [entry("10.8.0.2")], en0: [entry("192.168.1.68")], lo0: [{ ...entry("127.0.0.1"), internal: true }] };
const request = (address = "0.0.0.0", localAddress = "127.0.0.1") => ({ headers: { host: "incorrect:9999" }, socket: { localAddress, server: { address: () => ({ address, port: 5174 }) } } });
test("WiFi takes priority over VPN and uses the actual listener port", () => {
  const result = lanAccessUrls(request(), interfaces);
  assert.equal(result.preferredUrl, "http://192.168.1.68:5174/");
  assert.deepEqual(result.urls, ["http://192.168.1.68:5174/", "http://10.8.0.2:5174/"]);
});
test("loopback-only servers never advertise an unreachable LAN QR", () => {
  for (const bind of ["127.0.0.1", "::1"]) {
    const result = lanAccessUrls(request(bind), interfaces);
    assert.equal(result.localOnly, true);
    assert.equal(result.preferredUrl, "");
    assert.deepEqual(result.urls, []);
  }
});
test("retain address already reached by the phone and respect specific binding", () => {
  assert.equal(lanAccessUrls(request("0.0.0.0", "::ffff:10.8.0.2"), interfaces).preferredUrl, "http://10.8.0.2:5174/");
  assert.deepEqual(lanAccessUrls(request("192.168.1.68"), interfaces).urls, ["http://192.168.1.68:5174/"]);
});
test("no network never falls back to localhost; link-local addresses are excluded", () => {
  assert.equal(lanAccessUrls(request(), {}).preferredUrl, "");
  assert.deepEqual(lanAccessUrls(request(), { en0: [entry("169.254.1.2")] }).urls, []);
});
