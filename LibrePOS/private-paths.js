// The data folder sits inside the root Vite serves, so no URL may ever reach it.
const DATA_FOLDER = /\.librepos/i;
// Windows can expose that same folder through its short name (LIBREP~1).
const WINDOWS_SHORT_NAME = /(^|[\\/])librep~\d/i;
// Vite route that opens files in an editor on the server computer; nothing on the network needs it.
const EDITOR_ROUTE = /\/__open-in-editor/i;

function fullyDecoded(value) {
  let current = value;
  for (let round = 0; round < 3; round += 1) {
    const next = decodeURIComponent(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

export function isPrivateRequest(rawUrl = "/") {
  let target;
  try {
    target = fullyDecoded(String(rawUrl));
  } catch {
    return true; // A malformed URL does not name any resource of the app.
  }
  return DATA_FOLDER.test(target) || WINDOWS_SHORT_NAME.test(target) || EDITOR_ROUTE.test(target);
}
