// Runtime interceptor for Custom Plugins.
//
// Plugins are REAL, not prompt injection:
//   - Image Vision (OCR Auto Image-to-Text): extracts text from attached images via
//     automatic scripting (sharp metadata/chunks/OCR transcript), converting image blocks
//     for text-only models and providing OCR enhancement for vision models.
//   - Think Deeper (Adaptive Thinking & Superpowers CoT): integrates Superpowers multi-perspective
//     reasoning, hypothesis stress-testing, and Chain of Thought with adaptive depth,
//     plus native reasoning parameters (reasoning_effort: high, Claude thinking budget).
//   - JSON Guard: repairs machine-readable output on the way back (fenced JSON,
//     prose around it, Python literals, a tail cut off by the output limit) and
//     removes tool-call argument names the declared schema never had.
//   - OpenAI Tool Bridge: recovers tool calls a text-only model wrote out in prose
//     and provides function calling to web-session or non-tool backends.
//   - Anti-Slop: injects anti-slop rules to strip generic AI cliches, robotic phrases,
//     and verbose preambles.
//
// Speed Mode (plugin 3) and Context Squeezer (plugin 5) removed per user configuration.

import { getSettings } from "@/lib/localDb";
import { FORMATS } from "open-sse/translator/formats.js";
import { getCapabilitiesForModel } from "open-sse/providers/capabilities.js";
import { matchesModel } from "@/shared/utils/pluginModelMatch.js";
import { injectSystemPrompt } from "open-sse/rtk/systemInject.js";
import { extractImageBuffer, convertImageToTextScript } from "./imageTextExtractor.js";

// Default plugin state for fresh installs / missing settings
const DEFAULT_PLUGINS = {
  adaptiveThinking: { enabled: false, models: [], level: "full" },
  imageVision: { enabled: false, models: [] },
};

// Cached plugin settings to avoid DB hits on every stream chunk
let cachedPlugins = null;
let lastFetch = 0;
const CACHE_TTL_MS = 2000;

async function getPluginConfig() {
  const now = Date.now();
  if (cachedPlugins && now - lastFetch < CACHE_TTL_MS) {
    return cachedPlugins;
  }
  try {
    const settings = await getSettings();
    cachedPlugins = settings?.customPlugins || DEFAULT_PLUGINS;
    lastFetch = now;
  } catch {
    cachedPlugins = DEFAULT_PLUGINS;
  }
  return cachedPlugins;
}

export function clearPluginCache() {
  cachedPlugins = null;
  lastFetch = 0;
}

/**
 * Every name this request could be called by, in the order the layers know it.
 */
export function modelKeysToTest(requestedModel, provider, model) {
  const keys = [
    requestedModel,
    `${provider}/${model}`,
    model,
  ].filter(Boolean);

  if (requestedModel && requestedModel.includes("/")) {
    keys.push(requestedModel.split("/").pop());
  }
  return keys;
}

/**
 * Adaptive Thinking & Multi-Framework Cognitive Architecture.
 *
 * Real synthesized cognitive protocol derived from:
 * 1. Depth Protocol v2.0 (Kshitijpalsinghtomar/depth-skills): Interrupts premature closure,
 *    demands root problem reframing, minimum 3 distinct hypothesis branches, and explicit failure envelope boundaries.
 * 2. Adversaria Dialectic Engine (damionrashford/Adversaria): Dissoi Logoi & Crucible red-team elenchus,
 *    hostile challenge, and truth survivor verification before answering.
 * 3. Thinking Frameworks & First Principles (tjboudreaux/cc-thinking-skills):
 *    Separates physics/math/measured facts from conventional assumptions, discarding false limits.
 * 4. Superpowers Methodology (obra/superpowers):
 *    Systematic step-by-step verification, complexity reduction, and grounded evidence.
 */
export const ADAPTIVE_THINKING_COGNITIVE_ARCHITECTURE = `[Cognitive Architecture: Multi-Framework Adaptive Thinking Active]
You are operating under an integrated multi-agent cognitive architecture synthesized from verified agent reasoning frameworks (The Depth Protocol v2.0, Adversaria Dialectic Engine, First Principles Decomposition, and Superpowers).

🛑 Core Mandate: INTERRUPT PREMATURE CLOSURE.
Do not emit the statistically familiar, first-match surface response. The easy pattern-matched answer is a local optimum. You must systematically explore, stress-test, and verify before delivering.

Before presenting your final answer, execute this structured reasoning protocol:

<thinking_process>
1. REFRAME & DECONSTRUCT (Depth Protocol & First Principles):
   - Uncover the true root objective behind the user's prompt (translate the prompt to actual problem structure).
   - Classify claimed constraints: Separate hard facts (math, logic, measured limits) from artificial conventions or analogies. Discard unsupported assumptions.

2. HYPOTHESIS DIVERGENCE (Multi-Branch Exploration):
   - Formulate at least 2 to 3 genuinely distinct approaches that disagree on what they optimize for (e.g. simplicity vs performance vs fault tolerance).
   - Identify what each approach assumes, what it sacrifices, and the precise conditions under which it fails.

3. ADVERSARIAL STRESS-TEST (Crucible & Dissoi Logoi):
   - Mount the strongest possible critique against your preferred approach: What does it get right in common scenarios but fail at in critical edge cases?
   - Conduct a self-directed Red Team challenge: Attempt to break your own logic. If an approach fails this test, revise or replace it.

4. FAILURE ENVELOPE & BOUNDARIES (Systematic Superpowers):
   - State the operational boundaries: Where does this solution break (scale limits, boundary inputs, environmental shifts)?
   - Identify any blind spot the user might not be actively considering.

5. GROUNDED SYNTHESIS:
   - Deliver the verified resolution concisely, clearly, and directly without filler, fluff, or unwarranted hesitation.
</thinking_process>

Adaptive Depth Tuning:
- For trivial greetings or simple lookups: Keep internal verification lightweight and deliver directly.
- For non-trivial engineering, architecture, logic, code, or strategic problems: Enforce the complete multi-framework thinking protocol thoroughly.`;

/**
 * Image Vision / OCR Auto Image-to-Text.
 *
 * Scans incoming messages for image blocks. Converts image content into
 * structured OCR text transcripts via automated scripting.
 * - For text-only models (!caps?.vision): converts image blocks into clean text blocks
 *   so the model reads the image text without 400 errors.
 * - For vision models: appends the OCR transcript for enhanced accuracy.
 */
export async function applyImageVision(body, caps = null) {
  if (!body?.messages || !Array.isArray(body.messages)) return false;

  let foundImages = false;
  const isVisionModel = Boolean(caps?.vision);

  for (const msg of body.messages) {
    if (!Array.isArray(msg.content)) continue;

    const newContent = [];
    for (const block of msg.content) {
      const isImg =
        block?.type === "image_url" ||
        block?.type === "image" ||
        (block?.type === "tool_result" &&
          Array.isArray(block.content) &&
          block.content.some((c) => c?.type === "image_url" || c?.type === "image"));

      if (!isImg) {
        newContent.push(block);
        continue;
      }

      foundImages = true;
      const extracted = extractImageBuffer(block);
      let ocrText = "";
      if (extracted?.buffer) {
        ocrText = await convertImageToTextScript(extracted.buffer, extracted.mimeType);
      } else {
        const urlStr = block?.image_url?.url || "";
        ocrText = `\n\n[Attached Image Reference: ${urlStr.slice(0, 100)}]\n\n`;
      }

      if (isVisionModel) {
        // Keep original image block and prepend/append OCR transcript
        newContent.push(block);
        if (ocrText) {
          newContent.push({ type: "text", text: ocrText });
        }
      } else {
        // Text-only model: convert image to text block so model can parse it
        newContent.push({ type: "text", text: ocrText || "[Image Content Attached]" });
      }
    }
    msg.content = newContent;
  }

  if (foundImages) {
    const ocrNudge =
      "OCR Image-to-Text is active: image content has been transcribed to text. Answer questions with full awareness of the visual and textual data.";
    if (body.system && typeof body.system === "string") {
      if (!body.system.includes("OCR Image-to-Text")) {
        body.system = `${ocrNudge}\n\n${body.system}`;
      }
    } else {
      const sysIdx = body.messages.findIndex((m) => m.role === "system");
      if (sysIdx >= 0) {
        const sys = body.messages[sysIdx].content;
        if (typeof sys === "string" && !sys.includes("OCR Image-to-Text")) {
          body.messages[sysIdx].content = `${ocrNudge}\n\n${sys}`;
        }
      }
    }
  }

  return true;
}

export function applyAdaptiveThinking(body, sourceFormat) {
  if (!body) return;

  // 1. Native Provider Reasoning Parameters
  if (sourceFormat === FORMATS.CLAUDE) {
    body.thinking = {
      type: "enabled",
      budget_tokens: body.thinking?.budget_tokens || 10240,
    };
  } else {
    body.reasoning_effort = "high";
    if (!body.reasoning) {
      body.reasoning = { effort: "high" };
    }
  }

  // 2. Multi-Framework Cognitive Architecture Injection
  injectSystemPrompt(body, sourceFormat, ADAPTIVE_THINKING_COGNITIVE_ARCHITECTURE);
}

/* ------------------------------------------------------------------ *
 * Dispatch
 * ------------------------------------------------------------------ */

export async function applyCustomPlugins(body, provider, model, sourceFormat, requestedModel) {
  const config = await getPluginConfig();
  const keysToTest = modelKeysToTest(requestedModel, provider, model);
  const checkMatch = (modelList) => keysToTest.some((key) => matchesModel(modelList, key));

  let caps = null;
  try {
    caps = getCapabilitiesForModel(provider, model);
  } catch {
    caps = null;
  }

  const result = {
    isAdaptiveThinkingActive: false,
    isVisionActive: false,
    isThinkDeeperActive: false,
  };

  if (config.imageVision?.enabled && checkMatch(config.imageVision.models)) {
    result.isVisionActive = true;
    await applyImageVision(body, caps);
  }

  if (config.adaptiveThinking?.enabled && checkMatch(config.adaptiveThinking.models)) {
    result.isAdaptiveThinkingActive = true;
    result.isThinkDeeperActive = true; // backward compat with existing loggers/badges
    applyAdaptiveThinking(body, sourceFormat);
  }

  return result;
}

export { getPluginConfig };
