/**
 * Notion AI Web — `runInferenceTranscript` transcript construction.
 * Ported from OmniRoute open-sse/services/notionTranscriptBuilder.ts.
 *
 * Builds a Notion transcript array (`config` + `context` + per-message steps)
 * from OpenAI-style chat messages. Live contract (verified 2026-07-19):
 * - Leading `config` (workflow + optional model food-codename)
 * - Leading `context` (spaceId / userId / surface / timezone)
 * - User turns as `type: "user"`
 * - Assistant turns as `agent-inference` text parts
 */
import { randomUUID } from "node:crypto";
import { extractNotionMessageText } from "./notionThreadSessions.js";

function isoNow() {
  // Millisecond precision matches the browser client.
  return new Date().toISOString().replace(/\.\d{3}Z$/, (m) => m); // keep ms + Z
}

function buildNotionConfigStep(model, agent) {
  const isCustom = Boolean(agent?.workflowId);
  const configValue = {
    type: "workflow",
    // Match live browser defaults (2026-07-20 capture) for fewer plan/feature mismatches.
    enableAgentAutomations: true,
    enableAgentIntegrations: true,
    enableCustomAgents: true,
    enableScriptAgent: true,
    enableAgentDiffs: true,
    enableCsvAttachmentSupport: true,
    enableComputer: true,
    enableCreateAndRunThread: true,
    enableAgentGenerateImage: !isCustom,
    useWebSearch: true,
    searchScopes: [{ type: "everything" }],
    availableConnectors: [],
    enableUserSessionContext: false,
    isCustomAgent: isCustom,
    isCustomAgentBuilder: false,
    isCustomAgentCreate: false,
    isAgentResearchRequest: false,
    useCustomAgentDraft: isCustom,
    modelFromUser: !isCustom && Boolean(model),
    databaseAgentConfigMode: false,
    isOnboardingAgent: false,
    isMobile: false,
  };
  if (isCustom && agent?.workflowId) {
    configValue.workflowId = agent.workflowId;
  }
  // Default Notion AI: pin the food codename when the client selected a model.
  // Custom agents usually use the agent-configured model (modelFromUser:false).
  if (!isCustom && model) configValue.model = model;
  return { id: randomUUID(), type: "config", value: configValue };
}

function buildNotionContextValue({ spaceId, userId, now, agent }) {
  const isCustom = Boolean(agent?.workflowId);
  const contextValue = {
    timezone: "UTC",
    surface: isCustom ? "custom_agent" : "ai_module",
    currentDatetime: now,
  };
  if (spaceId) contextValue.spaceId = spaceId;
  if (userId) contextValue.userId = userId;
  if (isCustom && agent?.workflowId) {
    contextValue.workflowId = agent.workflowId;
    if (agent.contextPageId) {
      contextValue.context_page_id = agent.contextPageId;
    }
  }
  return contextValue;
}

/** Converts one OpenAI-style message into a transcript step, or `null` when it
 * was folded into the context (system prompts). */
function buildNotionMessageStep(m, contextValue, { userId, now }) {
  // Accept string OR content-parts array (agent clients often send parts).
  const text = extractNotionMessageText(m?.content);
  if (!text || text.length === 0) return null;
  const role = (m.role || "").toLowerCase();

  if (role === "system") {
    // Fold system prompts into context instructions rather than a separate step.
    const existing = typeof contextValue.instructions === "string" ? contextValue.instructions : "";
    contextValue.instructions = existing ? `${existing}\n${text}` : text;
    return null;
  }

  if (role === "assistant") {
    return {
      id: randomUUID(),
      type: "agent-inference",
      value: [{ type: "text", content: text }],
    };
  }

  // user (and anything else treated as user)
  const userStep = {
    id: randomUUID(),
    type: "user",
    value: [[text]],
    createdAt: now,
  };
  if (userId) userStep.userId = userId;
  return userStep;
}

/**
 * For follow-ups, only send steps after the last assistant turn (partial transcript).
 * Notion already has prior steps when createThread:false + sticky threadId.
 * Re-sending the entire agent tool loop every turn triggers temporarily-unavailable.
 */
export function messagesForNotionTranscript(messages, isFollowUp) {
  if (!isFollowUp || !messages.length) return messages;
  let lastAsst = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const role = (messages[i]?.role || "").toLowerCase();
    if (role === "assistant" || role === "ai" || role === "model") {
      lastAsst = i;
      break;
    }
  }
  if (lastAsst < 0) return messages;
  const slice = messages.slice(lastAsst + 1);
  // Always include at least the last user message
  if (slice.length === 0) {
    const lastUser = [...messages].reverse().find((m) => {
      const r = (m.role || "").toLowerCase();
      return r === "user" || r === "human";
    });
    return lastUser ? [lastUser] : messages;
  }
  return slice;
}

export function buildNotionTranscript(messages, opts = {}) {
  const trimmedModel = typeof opts.notionModel === "string" ? opts.notionModel.trim() : "";
  const model = trimmedModel && trimmedModel !== "notion-ai" ? trimmedModel : "";
  const now = isoNow();
  const agent = opts.agent?.workflowId ? opts.agent : undefined;
  const isFollowUp = Boolean(opts.isFollowUp);

  const contextValue = buildNotionContextValue({
    spaceId: opts.spaceId,
    userId: opts.userId,
    now,
    agent,
  });
  const entries = [
    buildNotionConfigStep(model, agent),
    { id: randomUUID(), type: "context", value: contextValue },
  ];

  const msgs = messagesForNotionTranscript(messages, isFollowUp);
  for (const m of msgs) {
    const step = buildNotionMessageStep(m, contextValue, { userId: opts.userId, now });
    if (step) entries.push(step);
  }
  return entries;
}
