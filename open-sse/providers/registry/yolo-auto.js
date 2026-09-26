// Yolo-Auto — OpenAI-compatible inference host.
// Imported from OmniRoute catalog (2026-08). Base URL verified from models.dev / provider docs.
export default {
  id: "yolo-auto",
  priority: 50,
  alias: "yolo-auto",
  display: {
    name: "Yolo-Auto",
    icon: "auto_awesome",
    color: "#F59E0B",
    textIcon: "YA",
    website: "https://yolo-auto.com",
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://yolo-auto.com/v1/chat/completions",
    validateUrl: "https://yolo-auto.com/v1/models",
  },
  passthroughModels: true,
  hasFree: true,
  freeNote: "Free API access is request-limited and intended for testing; no numeric daily quota is published and free access is not promised indefinitely.",
};
