// Gemini Business (business.gemini.google) — Google's enterprise Gemini web.
// Ported from OmniRoute catalog + executor (open-sse/executors/gemini-business.js).
// Auth: __Secure-1PSID + __Secure-1PSIDTS cookies from an enterprise account;
// requests go through the internal StreamGenerate endpoint with the user's
// entry URL prefix (providerSpecificData.entryUrl) for account-chooser routing.
export default {
  id: "gemini-business",
  priority: 150,
  alias: "gembiz",
  uiAlias: "gembiz",
  display: {
    name: "Gemini Business (Enterprise)",
    icon: "auto_awesome",
    color: "#4285F4",
    textIcon: "GB",
    website: "https://business.gemini.google",
    notice: {
      signupUrl: "https://business.gemini.google",
      apiKeyUrl: "https://business.gemini.google",
      text: "Gemini Business for Google Workspace enterprise accounts — enterprise Gemini models (Pro, Flash, image, video) via the internal StreamGenerate HTTP API, no subscription required (just enterprise SSO). Paste __Secure-1PSID + __Secure-1PSIDTS from business.gemini.google (DevTools → Application → Cookies). If your entry URL is not the default /home, provide it via connection settings (entryUrl) so the CID prefix is routed correctly. ⚠️ Reverse-engineered protocol — upstream may change without notice.",
    },
  },
  category: "webCookie",
  authType: "cookie",
  authHint:
    "From your enterprise account: open business.gemini.google/home/cid/{your-cid}, then copy __Secure-1PSID and __Secure-1PSIDTS cookies from DevTools → Application → Cookies. Paste as a cookie header (or JSON credential) below.",
  transport: {
    baseUrl: "https://business.gemini.google",
    format: "gemini-business",
    authType: "cookie",
  },
  models: [
    { id: "gemini-3-pro", name: "Gemini 3 Pro" },
    { id: "gemini-3-ultra", name: "Gemini 3 Ultra" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-thinking", name: "Gemini 2.5 Flash Thinking" },
    { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-thinking", name: "Gemini 2.0 Flash Thinking" },
  ],
  passthroughModels: true,
};
