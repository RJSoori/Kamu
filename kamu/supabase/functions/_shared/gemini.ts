// Text generation via the Gemini API (Google AI Studio key, free tier).
// Plain fetch, no SDK: one REST call is all mood-search needs.

// Deno.env in Edge Functions; process.env when the evals import this file
// under Node (evals/listing-coach.mjs).
// deno-lint-ignore no-explicit-any
const g = globalThis as any;
const env = (name: string): string | undefined =>
  g.Deno ? g.Deno.env.get(name) : g.process?.env[name];

// Env-configurable because the free-tier model lineup keeps changing. The
// lite model answers in seconds; full flash timed out on the free tier.
const MODEL = env("GEMINI_MODEL") ?? "gemini-flash-lite-latest";
// The free tier has taken 18-28s per answer; /search streams the answer in,
// so a long wait no longer blocks the results.
const TIMEOUT_MS = 40000;

export function hasGeminiKey(): boolean {
  return Boolean(env("GEMINI_API_KEY"));
}

/** One turn of a Gemini conversation (text, tool calls or tool results). */
export interface GeminiContent {
  role: "user" | "model";
  // deno-lint-ignore no-explicit-any
  parts: any[];
}

/**
 * Raw generateContent call: returns the first candidate's content, as-is,
 * so tool-calling callers (ask-kamu) can send it straight back. Throws on
 * any failure (network, timeout, 429 rate limit, no candidate) -- callers
 * decide how to degrade.
 */
export async function callGemini(
  // generateContent request body minus `contents`/`systemInstruction`
  // (tools, toolConfig, generationConfig).
  options: Record<string, unknown>,
  systemPrompt: string,
  contents: GeminiContent[],
  timeoutMs = TIMEOUT_MS,
): Promise<GeminiContent> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env("GEMINI_API_KEY") ?? "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        ...options,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content;
  if (!content?.parts) throw new Error("Gemini returned no content");
  return { role: "model", parts: content.parts };
}

/** Joined text parts of a reply ("" when it only holds tool calls). */
export function textOf(content: GeminiContent): string {
  return content.parts.map((part) => part.text ?? "").join("").trim();
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const content = await callGemini(
    {
      generationConfig: {
        temperature: 0.4,
        // Thinking tokens count toward this cap, so leave headroom.
        maxOutputTokens: 1024,
      },
    },
    systemPrompt,
    [{ role: "user", parts: [{ text: userPrompt }] }],
  );
  const text = textOf(content);
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
