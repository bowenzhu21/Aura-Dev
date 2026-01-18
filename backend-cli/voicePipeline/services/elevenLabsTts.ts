export type ElevenLabsTtsRequest = {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId?: string;
};

export type ElevenLabsTtsPcmRequest = {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId?: string;
  outputFormat?: string;
  sampleRate?: number;
  channels?: number;
};

export type ElevenLabsPcmAudio = {
  samples: Int16Array;
  sampleRate: number;
  channels: number;
};

export const synthesizeSpeech = async (
  request: ElevenLabsTtsRequest
): Promise<ArrayBuffer> => {
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': request.apiKey,
    },
    body: JSON.stringify({
      text: request.text,
      model_id: request.modelId ?? 'eleven_multilingual_v2',
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  return response.arrayBuffer();
};

const readAscii = (view: DataView, offset: number, length: number): string => {
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += String.fromCharCode(view.getUint8(offset + i));
  }
  return value;
};

const parseWavPcm16 = (buffer: ArrayBuffer): ElevenLabsPcmAudio | null => {
  if (buffer.byteLength < 44) return null;
  const view = new DataView(buffer);
  if (readAscii(view, 0, 4) !== 'RIFF') return null;
  if (readAscii(view, 8, 4) !== 'WAVE') return null;

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = 0;
  let dataSize = 0;

  while (offset + 8 <= buffer.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkData = offset + 8;

    if (chunkId === 'fmt ') {
      const audioFormat = view.getUint16(chunkData, true);
      channels = view.getUint16(chunkData + 2, true);
      sampleRate = view.getUint32(chunkData + 4, true);
      bitsPerSample = view.getUint16(chunkData + 14, true);
      if (audioFormat !== 1) return null;
    } else if (chunkId === 'data') {
      dataOffset = chunkData;
      dataSize = chunkSize;
      break;
    }

    offset = chunkData + chunkSize + (chunkSize % 2);
  }

  if (!dataOffset || !sampleRate || !channels || bitsPerSample !== 16) {
    return null;
  }

  const samples = new Int16Array(
    buffer.slice(dataOffset, dataOffset + dataSize)
  );

  return { samples, sampleRate, channels };
};

const resolvePcmSampleRate = (outputFormat?: string): number | undefined => {
  if (!outputFormat) return undefined;
  const match = outputFormat.match(/pcm_(\d+)/);
  if (!match) return undefined;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const synthesizeSpeechPcm = async (
  request: ElevenLabsTtsPcmRequest
): Promise<ElevenLabsPcmAudio> => {
  const resolvedRate =
    request.sampleRate ?? resolvePcmSampleRate(request.outputFormat) ?? 16000;
  const outputFormat = request.outputFormat ?? `pcm_${resolvedRate}`;
  const endpoint = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}`
  );
  endpoint.searchParams.set('output_format', outputFormat);

  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: {
      Accept: 'audio/wav',
      'Content-Type': 'application/json',
      'xi-api-key': request.apiKey,
    },
    body: JSON.stringify({
      text: request.text,
      model_id: request.modelId ?? 'eleven_multilingual_v2',
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS (PCM) failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const wav = parseWavPcm16(buffer);
  if (wav) return wav;

  const channels = request.channels ?? 1;
  const raw = buffer.byteLength % 2 === 0 ? buffer : buffer.slice(0, -1);
  return {
    samples: new Int16Array(raw),
    sampleRate: resolvedRate,
    channels,
  };
};
