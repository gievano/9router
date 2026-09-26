// Fish Audio — text-to-speech (model passed as HTTP header, JSON body → binary audio).
// Imported from OmniRoute catalog (2026-08). Port of OmniRoute's fishaudio
// audioSpeech handler (open-sse/handlers/ttsProviders/genericFormats.js "fishaudio").
export default {
  id: "fishaudio",
  priority: 30,
  alias: "fish",
  display: {
    name: "Fish Audio",
    icon: "record_voice_over",
    color: "#00C2A8",
    textIcon: "FA",
    website: "https://fish.audio",
    notice: {
      apiKeyUrl: "https://fish.audio/account",
      text: "TTS (Fish Speech S1 / 1.6 / 1.5). API key from fish.audio — model id is sent as an HTTP header.",
    },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["tts"],
  models: [
    { id: "s1", name: "Fish Speech S1", kind: "tts" },
    { id: "speech-1.6", name: "Fish Speech 1.6", kind: "tts" },
    { id: "speech-1.5", name: "Fish Speech 1.5", kind: "tts" },
  ],
  ttsConfig: {
    baseUrl: "https://api.fish.audio/v1/tts",
    authType: "apikey",
    authHeader: "bearer",
    format: "fishaudio",
  },
};
