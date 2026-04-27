/**
 * Cliente minimo Anthropic Messages API.
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {string} opts.system
 * @param {string} opts.userText
 * @param {number} opts.maxTokens
 * @param {number} opts.timeoutMs
 */
async function callAnthropicMessages({ apiKey, model, system, userText, maxTokens, timeoutMs }) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.7,
        system,
        messages: [{ role: "user", content: userText }],
      }),
    });
  } finally {
    clearTimeout(t);
  }

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Anthropic error ${res.status}: ${rawText.slice(0, 500)}`);
  }

  if (!res.ok) {
    const detail = data.error?.message || rawText.slice(0, 400);
    throw new Error(`Anthropic error ${res.status}: ${detail}`);
  }

  const blocks = data.content || [];
  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const usage = data.usage || {};
  return {
    text,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
  };
}

module.exports = { callAnthropicMessages };
