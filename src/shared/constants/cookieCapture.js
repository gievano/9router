// Providers that support one-click session capture from the user's running
// Chromium browser (see the /api/providers/capture backend). Keyed by provider
// id; each value carries the button label shown in the Add API Key modal.
//
// Empty because upstream's 304-provider commit (a782471f) shipped the capture
// frontend but not the backend route — add entries here as the endpoint lands.
export const COOKIE_CAPTURE = {};
