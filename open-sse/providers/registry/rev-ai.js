// Rev AI — async batch speech-to-text (submit multipart job → poll → fetch transcript).
// Imported from OmniRoute catalog (2026-08). Port of OmniRoute's rev-ai
// audioTranscription handler (open-sse/handlers/sttCore.js "rev-ai" case).
export default {
  id: "rev-ai",
  priority: 30,
  alias: "revai",
  display: {
    name: "Rev AI",
    icon: "record_voice_over",
    color: "#E5484D",
    textIcon: "RV",
    website: "https://rev.ai",
    notice: {
      apiKeyUrl: "https://www.rev.ai/access-token",
      text: "Async STT (machine / low_cost / fusion). API key from rev.ai.",
    },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["stt"],
  models: [
    { id: "machine", name: "Reverb ASR", kind: "stt" },
    { id: "low_cost", name: "Low-Cost ASR", kind: "stt" },
    { id: "fusion", name: "Fusion ASR", kind: "stt" },
  ],
  sttConfig: {
    baseUrl: "https://api.rev.ai/speechtotext/v1",
    authType: "apikey",
    authHeader: "bearer",
    format: "rev-ai",
  },
};
