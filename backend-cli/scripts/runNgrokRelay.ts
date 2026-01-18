import 'dotenv/config';

import { AccessToken } from 'livekit-server-sdk';
import { synthesizeSpeechPcm } from '../voicePipeline/services/elevenLabsTts';
import { formatWithGemini } from '../voicePipeline/services/geminiFormatter';
import { startNgrokClient } from '../voicePipeline/services/ngrokClient';
import { LiveKitTtsPublisher } from '../voicePipeline/services/livekitTtsPublisher';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const makeLiveKitToken = async (): Promise<string> => {
  const apiKey = requireEnv('LIVEKIT_API_KEY');
  const apiSecret = requireEnv('LIVEKIT_API_SECRET');
  const room = requireEnv('LIVEKIT_ROOM');
  const identity = process.env.LIVEKIT_IDENTITY ?? 'ngrok-relay';

  const token = new AccessToken(apiKey, apiSecret, { identity });
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: false,
  });

  return token.toJwt();
};

const livekitUrl = requireEnv('LIVEKIT_URL');
const geminiApiKey = requireEnv('GEMINI_API_KEY');
const elevenLabsApiKey = requireEnv('ELEVENLABS_API_KEY');
const elevenLabsVoiceId = requireEnv('ELEVENLABS_VOICE_ID');
const ngrokUrl =
  process.env.NGROK_WSS_URL ??
  'wss://sortable-marvella-hortatorily.ngrok-free.dev';

const ttsSampleRate = parseNumber(process.env.TTS_AUDIO_SAMPLE_RATE) ?? 16000;
const ttsChannels = parseNumber(process.env.TTS_AUDIO_CHANNELS) ?? 1;

const publisher = new LiveKitTtsPublisher({
  livekitUrl,
  livekitToken: makeLiveKitToken,
  sampleRate: ttsSampleRate,
  channels: ttsChannels,
  frameMs: parseNumber(process.env.TTS_AUDIO_FRAME_MS) ?? 20,
  trackName: process.env.TTS_AUDIO_TRACK_NAME ?? 'aura-tts',
});

const start = async () => {
  console.log('Connecting to LiveKit...');
  await publisher.connect();
  console.log('Connecting to ngrok WebSocket...');

  const client = startNgrokClient({
    url: ngrokUrl,
    onStatus: (status) => console.log('[ngrok]', status),
    onError: (error) => console.error('[ngrok-error]', error),
    onMessage: async (payload) => {
      console.log('[ngrok-message]', payload.text);

      const formatted = await formatWithGemini({
        apiKey: geminiApiKey,
        model: process.env.GEMINI_MODEL,
        payload,
      });
      console.log('[gemini]', formatted);

      const pcm = await synthesizeSpeechPcm({
        apiKey: elevenLabsApiKey,
        voiceId: elevenLabsVoiceId,
        text: formatted,
        modelId: process.env.ELEVENLABS_TTS_MODEL_ID,
        outputFormat: `pcm_${ttsSampleRate}`,
        sampleRate: ttsSampleRate,
        channels: ttsChannels,
      });

      await publisher.publishPcm(pcm.samples, pcm.sampleRate, pcm.channels);
    },
  });

  process.on('SIGINT', () => {
    console.log('Stopping...');
    client.close();
    void publisher.disconnect().finally(() => process.exit(0));
  });
};

void start().catch((error) => {
  console.error(error);
  process.exit(1);
});
