// Text generation via the Gemini API (Google AI Studio key, free tier).
// Plain fetch, no SDK: one REST call is all mood-search needs.

// Env-configurable because the free-tier model lineup keeps changing. The
// lite model answers in seconds; full flash timed out on the free tier.
const MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-lite-latest";
const TIMEOUT_MS = 15000;

export function hasGeminiKey(): boolean {
  return Boolean(Deno.env.get("GEMINI_API_KEY"));
}

/**
 * Throws on any failure (network, timeout, 429 rate limit, empty reply) --
 * callers decide how to degrade.
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get("GEMINI_API_KEY") ?? "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          // Thinking tokens count toward this cap, so leave headroom.
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const parts: { text?: string }[] =
    data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}
