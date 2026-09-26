// Speechmatics — async batch speech-to-text (submit multipart job → poll → fetch transcript).
// Imported from OmniRoute catalog (2026-08). Port of OmniRoute's speechmatics
// audioTranscription handler (open-sse/handlers/sttCore.js "speechmatics" case).
// Streaming (WebSocket) mode is out of scope — batch REST only.
export default {
  id: "speechmatics",
  priority: 30,
  alias: "speechmatics",
  display: {
    name: "Speechmatics",
    icon: "record_voice_over",
    color: "#6366F1",
    textIcon: "SM",
    website: "https://speechmatics.com",
    notice: {
      apiKeyUrl: "https://portal.speechmatics.com",
      text: "Async batch STT (enhanced). Free tier: 8 hours/month, no credit card.",
    },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["stt"],
  models: [
    { id: "enhanced", name: "Enhanced", kind: "stt" },
  ],
  sttConfig: {
    baseUrl: "https://asr.api.speechmatics.com/v2/jobs",
    authType: "apikey",
    authHeader: "bearer",
    format: "speechmatics",
  },
};
