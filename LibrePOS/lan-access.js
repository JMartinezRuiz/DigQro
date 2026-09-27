import { networkInterfaces } from "node:os";

// The listening socket, rather than the Host header, defines reachable addresses.
export function lanAccessUrls(req, interfaces = networkInterfaces()) {
  const listener = req.socket?.server?.address?.();
  const port = listener?.port || req.socket?.localPort || 5173;
  const bind = listener?.address;
  const protocol = req.socket?.encrypted ? "https" : "http";
  const localOnly = bind === "::1" || bind?.startsWith("127.");
  const candidates = [];
  if (!localOnly) for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (!["IPv4", 4].includes(entry.family) || entry.internal || !entry.address || entry.address.startsWith("169.254.")) continue;
      if (bind && !["0.0.0.0", "::", entry.address].includes(bind)) continue;
      const virtual = /utun|tun|tap|vpn|tailscale|docker|veth|virbr|vmnet|vbox|vethernet|wsl|bridge/i.test(name);
      candidates.push({ address: entry.address, virtual });
    }
  }
  candidates.sort((a, b) => Number(a.virtual) - Number(b.virtual));
  // Preserve an address that the requesting device has already reached.
  const reached = req.socket?.localAddress?.replace(/^::ffff:/, "");
  const urls = [...new Set(candidates.map(({ address }) => `${protocol}://${address}:${port}/`))];
  const reachedUrl = candidates.some(({ address }) => address === reached) ? `${protocol}://${reached}:${port}/` : "";
  return { preferredUrl: reachedUrl || urls[0] || "", urls, localOnly, port };
}
