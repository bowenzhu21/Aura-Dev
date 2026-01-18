export type ElevenLabsSttRequest = {
  apiKey: string;
  samples: Int16Array;
  sampleRate: number;
  languageCode?: string;
  modelId?: string;
};

const encodeWav = (samples: Int16Array, sampleRate: number): Buffer => {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }
  return buffer;
};

export const transcribeAudio = async (request: ElevenLabsSttRequest): Promise<string> => {
  const endpoint = "https://api.elevenlabs.io/v1/speech-to-text";

  const wavBuffer = encodeWav(request.samples, request.sampleRate);

  // ✅ BlobPart-safe
  const wavBytes = new Uint8Array(wavBuffer);
  const wavBlob = new Blob([wavBytes], { type: "audio/wav" });

  const form = new FormData();
  // ✅ correct field name + filename
  form.append("file", wavBlob, "audio.wav");
  form.append("model_id", request.modelId ?? "scribe_v2");
  if (request.languageCode) form.append("language_code", request.languageCode);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "xi-api-key": request.apiKey },
    body: form,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`ElevenLabs STT failed: ${response.status} ${response.statusText} ${err}`);
  }

  const payload: any = await response.json();
  // Empty text is valid for silence/short clips → return "" instead of throwing
  return String(payload?.text ?? payload?.transcription ?? "").trim();
};
