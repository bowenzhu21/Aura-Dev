import { generateGeminiResponse } from './gemini';
import type { NgrokMessage } from './ngrokClient';

export type GeminiFormatRequest = {
  apiKey: string;
  model?: string;
  payload: NgrokMessage;
};

const buildPrompt = (payload: NgrokMessage): string => {
  const objectBlock =
    payload.object && Object.keys(payload.object as Record<string, unknown>).length
      ? `\n\nAdditional data:\n${JSON.stringify(payload.object, null, 2)}`
      : '';

  return (
    'Rewrite the input into concise, natural language for a spoken response. ' +
    'If additional data contains options or choices, include them as a short spoken list. ' +
    'Do not mention JSON or field names.\n\n' +
    `Input text: "${payload.text}"${objectBlock}`
  );
};

export const formatWithGemini = async (
  request: GeminiFormatRequest
): Promise<string> => {
  const prompt = buildPrompt(request.payload);
  const response = await generateGeminiResponse({
    apiKey: request.apiKey,
    model: request.model,
    prompt,
  });

  return response.trim();
};
