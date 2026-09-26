// Post-capture warning shown after a session is grabbed from the user's
// Chromium browser (started with --remote-debugging-port). The debug port
// exposes the browser's cookies to any local process until it is closed.
export function buildCdpWarning(cdpUpSinceMs) {
  const since = cdpUpSinceMs ? new Date(cdpUpSinceMs).toLocaleTimeString() : null;
  return {
    text:
      "Heads up — the browser was started with a debug port, so any local process can read its cookies until you close it." +
      (since ? ` (up since ${since})` : ""),
  };
}
