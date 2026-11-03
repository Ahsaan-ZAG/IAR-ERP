/**
 * OPTIONAL Ollama bridge. Fully non-blocking:
 * - If OLLAMA_URL not set → returns null instantly (no crash, no delay)
 * - If Ollama unreachable or slow → returns null
 * - Real data ALWAYS comes from SQL (aiService), not from the LLM
 * - LLM only rephrases pre-computed facts
 */
export async function tryLlmRephrase(question, deterministicAnswer) {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) return null; // Ollama not configured → skip silently

  const context = JSON.stringify({
    title: deterministicAnswer.title,
    text: deterministicAnswer.text,
    data: deterministicAnswer.data,
  }).slice(0, 3500);

  const prompt =
    `You are a careful assistant for Imam Ahmed Raza Academy. ` +
    `Answer using ONLY the data below. Do NOT invent numbers or names. ` +
    `If the data is a prediction, clearly label it as an estimate. ` +
    `Keep it under 120 words.\n\n` +
    `Question: ${question}\n\nData: ${context}\n\nAnswer:`;

  try {
    const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = (json.response || '').trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}