// Gladia — async pre-recorded transcription (upload → submit → poll result_url).
// Imported from OmniRoute catalog (2026-08). Auth via custom x-gladia-key header.
export default {
  id: "gladia",
  priority: 30,
  alias: "gladia",
  display: {
    name: "Gladia",
    icon: "record_voice_over",
    color: "#F97316",
    textIcon: "GL",
    website: "https://gladia.io",
    notice: {
      apiKeyUrl: "https://app.gladia.io",
      text: "Async transcription (solaria-1 / solaria-mini). Free tier: 10 hours/month, no credit card. Auth header: x-gladia-key.",
    },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["stt"],
  models: [
    { id: "solaria-1", name: "Solaria 1", kind: "stt" },
    { id: "solaria-mini", name: "Solaria Mini", kind: "stt" },
  ],
  sttConfig: {
    baseUrl: "https://api.gladia.io/v2/pre-recorded",
    authType: "apikey",
    authHeader: "x-gladia-key",
    format: "gladia",
  },
};
