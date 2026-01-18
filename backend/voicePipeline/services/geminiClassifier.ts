export type GeminiClassifierRequest = {
  apiKey: string;
  model?: string;
  text: string;
};

export type GeminiClassifierResult = {
  wake: boolean;
  stop: boolean;
};

export const classifyWakeStop = async (
  req: GeminiClassifierRequest
): Promise<GeminiClassifierResult> => {
  const model = req.model ?? "gemini-1.5-flash";
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(req.apiKey)}`;

  const prompt = `
You are a strict JSON classifier for a voice assistant named "Aura".

Return ONLY valid JSON with this schema:
{"wake": boolean, "stop": boolean}

Rules:
- wake=true if the user is clearly addressing Aura (examples: "hey aura", "hi aura", "aura", "yo aura", "ok aura", "hey ora" (misheard)).
- stop=true if the user is clearly ending the interaction (examples: "stop aura", "bye aura", "that's all aura", "cancel", "nevermind", "shut up aura").
- If both appear, set both true.
- If neither appears, set both false.

Text:
"""${req.text}"""
`.trim();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini classifier failed: ${response.status}`);
  }

  const payload = await response.json();
  const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return { wake: false, stop: false };

  // extract first JSON object
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return { wake: false, stop: false };

  try {
    const parsed = JSON.parse(match[0]);
    return {
      wake: Boolean(parsed?.wake),
      stop: Boolean(parsed?.stop),
    };
  } catch {
    return { wake: false, stop: false };
  }
};
