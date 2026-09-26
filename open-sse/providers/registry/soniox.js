// Soniox — async batch speech-to-text (upload → create job → poll → transcript).
// Imported from OmniRoute catalog (2026-08). Port of OmniRoute's soniox
// audioTranscription handler (open-sse/handlers/sttCore.js "soniox" case).
export default {
  id: "soniox",
  priority: 30,
  alias: "soniox",
  display: {
    name: "Soniox",
    icon: "record_voice_over",
    color: "#0EA5E9",
    textIcon: "SX",
    website: "https://soniox.com",
    notice: {
      apiKeyUrl: "https://platform.soniox.com",
      text: "Async batch STT (stt-async-v5/v4). API key from platform.soniox.com.",
    },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["stt"],
  models: [
    { id: "stt-async-v5", name: "Soniox STT Async v5", kind: "stt" },
    { id: "stt-async-v4", name: "Soniox STT Async v4", kind: "stt" },
  ],
  sttConfig: {
    baseUrl: "https://api.soniox.com/v1/transcriptions",
    authType: "apikey",
    authHeader: "bearer",
    format: "soniox",
  },
};
