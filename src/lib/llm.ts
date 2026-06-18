/**
 * src/lib/llm.ts
 *
 * Multi-provider LLM fallback chain.
 * Priority order: Gemini → Groq → OpenAI
 *
 * If a provider hits a quota/rate-limit error (HTTP 429) or any transient
 * failure, it is skipped and the next configured provider is tried.
 * INVALID_KEY errors (401/403) are also skipped — the key simply isn't set
 * or is wrong, so we move on instead of crashing.
 *
 * Add keys to .env.local:
 *   GEMINI_API_KEY=...      → https://aistudio.google.com/apikey  (free)
 *   GROQ_API_KEY=...        → https://console.groq.com             (free)
 *   OPENAI_API_KEY=...      → https://platform.openai.com          (free $5 trial)
 */

export type ProviderName = 'gemini' | 'groq' | 'openai';

export interface LLMResult {
  text: string;
  provider: ProviderName;
  model: string;
}

// ── Provider: Gemini ──────────────────────────────────────────────────────────
async function callGemini(apiKey: string, prompt: string, maxTokens?: number): Promise<{ text: string; model: string }> {
  const model = 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens || 4000 },
      }),
      signal: AbortSignal.timeout(60000),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || res.statusText;
    throw new Error(`GEMINI_${res.status}: ${msg}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { text, model };
}

// ── Provider: Groq ────────────────────────────────────────────────────────────
// Groq uses the OpenAI-compatible chat completions format.
// Free tier is extremely generous, but has low TPM (Tokens Per Minute) limit for llama-3.3-70b.
// To bypass this, we rotate across multiple free models if a rate limit is hit,
// and we limit the max_tokens requested to avoid reservation rate-limit blocks.
async function callGroq(apiKey: string, prompt: string, maxTokens?: number): Promise<{ text: string; model: string }> {
  const models = [
    'llama-3.3-70b-versatile', // Best quality free model
    'llama-3.1-70b-versatile', // High quality alternative
    'gemma2-9b-it',            // Google Gemma - generous limits
    'llama-3.1-8b-instant',    // Extremely high rate limits, fast fallback
  ];

  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[LLM] [Groq] Trying model: ${model}`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: maxTokens || 3000, // Reduced from 8192 to bypass TPM limits
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || res.statusText;
        throw new Error(`GROQ_${res.status}: ${msg}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (!text?.trim()) {
        throw new Error('Received empty response text');
      }

      return { text, model };
    } catch (err: any) {
      console.warn(`[LLM] [Groq] Model ${model} failed: ${err.message}`);
      lastError = err;
      // If a model is rate limited or fails, immediately try the next model
    }
  }

  throw lastError || new Error('All Groq models failed');
}

// ── Provider: OpenAI ──────────────────────────────────────────────────────────
// Uses gpt-4o-mini — cheapest, best quality/cost ratio.
async function callOpenAI(apiKey: string, prompt: string, maxTokens?: number): Promise<{ text: string; model: string }> {
  const model = 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens || 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || res.statusText;
    throw new Error(`OPENAI_${res.status}: ${msg}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return { text, model };
}

// ── Fallback Chain ────────────────────────────────────────────────────────────
// Tries each configured provider in order. Skips on:
//   - 429 (quota / rate limit)
//   - 401 / 403 (bad or missing key)
//   - Any other network / parsing error
//
// Throws only if ALL configured providers fail.
export async function callAI(
  prompt: string,
  env: {
    GEMINI_API_KEY?: string;
    GROQ_API_KEY?: string;
    OPENAI_API_KEY?: string;
  },
  maxTokens?: number
): Promise<LLMResult> {
  type Provider = {
    name: ProviderName;
    key: string | undefined;
    fn: (key: string, prompt: string, maxTokens?: number) => Promise<{ text: string; model: string }>;
  };

  const providers: Provider[] = [
    { name: 'gemini', key: env.GEMINI_API_KEY, fn: callGemini },
    { name: 'groq',   key: env.GROQ_API_KEY,   fn: callGroq   },
    { name: 'openai', key: env.OPENAI_API_KEY, fn: callOpenAI },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.key?.trim()) {
      // Key not configured — silently skip
      continue;
    }

    const keys = provider.key.split(',').map(k => k.trim()).filter(Boolean);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const keyLabel = keys.length > 1 ? `key ${i + 1}/${keys.length}` : 'key';
        console.log(`[LLM] Trying provider: ${provider.name} with ${keyLabel}`);
        const result = await provider.fn(key, prompt, maxTokens);

        if (!result.text?.trim()) {
          throw new Error('Empty response received');
        }

        console.log(`[LLM] ✓ Success with ${provider.name} (${result.model}) via ${keyLabel}`);
        return { text: result.text, provider: provider.name, model: result.model };
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        const keyLabel = keys.length > 1 ? `key ${i + 1}` : 'key';
        console.warn(`[LLM] ✗ ${provider.name} ${keyLabel} failed: ${msg}`);
        errors.push(`${provider.name} [${keyLabel}]: ${msg}`);
        // Fall through to next key or provider
      }
    }
  }

  // All providers exhausted
  const hasAnyKey = providers.some(p => p.key?.trim());
  if (!hasAnyKey) {
    throw new Error(
      'NO_KEY: No API keys are configured. Add at least one of GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY to your .env.local file.'
    );
  }

  throw new Error(
    `ALL_FAILED: All AI providers failed.\n\n${errors.join('\n')}\n\nTip: Wait 1 minute for rate limits to reset, or add another provider key to .env.local.`
  );
}
