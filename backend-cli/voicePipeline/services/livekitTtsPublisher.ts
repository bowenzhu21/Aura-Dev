import {
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  Room,
  TrackPublishOptions,
  TrackSource,
} from '@livekit/rtc-node';

export type LiveKitTtsPublisherConfig = {
  livekitUrl: string;
  livekitToken: string | (() => Promise<string>);
  sampleRate?: number;
  channels?: number;
  frameMs?: number;
  trackName?: string;
};

export class LiveKitTtsPublisher {
  private readonly config: LiveKitTtsPublisherConfig;
  private room: Room | null = null;
  private source: AudioSource | null = null;
  private track: LocalAudioTrack | null = null;
  private sampleRate: number | null = null;
  private channels: number | null = null;

  constructor(config: LiveKitTtsPublisherConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.room) return;
    const token =
      typeof this.config.livekitToken === 'string'
        ? this.config.livekitToken
        : await this.config.livekitToken();

    this.room = new Room();
    await this.room.connect(this.config.livekitUrl, token, {
      autoSubscribe: false,
      dynacast: false,
    });
  }

  async disconnect(): Promise<void> {
    if (this.room && this.track?.sid) {
      await this.room.localParticipant?.unpublishTrack(this.track.sid);
    }
    await this.track?.close();
    this.track = null;
    this.source = null;
    this.sampleRate = null;
    this.channels = null;

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
  }

  async publishPcm(
    samples: Int16Array,
    sampleRate: number,
    channels: number
  ): Promise<void> {
    if (!this.room) {
      await this.connect();
    }
    if (!this.room?.localParticipant) return;

    const mono = channels === 1 ? samples : this.mixToMono(samples, channels);
    const source = await this.ensureTrack(sampleRate, 1);
    if (!source) return;

    const frameMs = this.config.frameMs ?? 20;
    const samplesPerChannel = Math.max(
      1,
      Math.floor((sampleRate * frameMs) / 1000)
    );
    const frameSize = samplesPerChannel;

    for (let offset = 0; offset < mono.length; offset += frameSize) {
      const frameSamples =
        offset + frameSize <= mono.length
          ? mono.subarray(offset, offset + frameSize)
          : this.padFrame(mono.subarray(offset), frameSize);
      const frame = new AudioFrame(
        frameSamples,
        sampleRate,
        1,
        samplesPerChannel
      );
      await source.captureFrame(frame);
    }

    await source.waitForPlayout();
  }

  private async ensureTrack(
    sampleRate: number,
    channels: number
  ): Promise<AudioSource | null> {
    if (!this.room?.localParticipant) return null;

    if (
      this.source &&
      this.track &&
      this.sampleRate === sampleRate &&
      this.channels === channels
    ) {
      return this.source;
    }

    if (this.track?.sid) {
      await this.room.localParticipant.unpublishTrack(this.track.sid);
      await this.track.close();
    }

    const source = new AudioSource(sampleRate, channels);
    const trackName = this.config.trackName ?? 'aura-tts';
    const track = LocalAudioTrack.createAudioTrack(trackName, source);
    const publishOptions = new TrackPublishOptions({
      source: TrackSource.SOURCE_MICROPHONE,
    });
    await this.room.localParticipant.publishTrack(track, publishOptions);

    this.source = source;
    this.track = track;
    this.sampleRate = sampleRate;
    this.channels = channels;

    return source;
  }

  private mixToMono(samples: Int16Array, channels: number): Int16Array {
    const samplesPerChannel = Math.floor(samples.length / channels);
    const mono = new Int16Array(samplesPerChannel);
    for (let i = 0; i < samplesPerChannel; i += 1) {
      let sum = 0;
      for (let ch = 0; ch < channels; ch += 1) {
        sum += samples[i * channels + ch];
      }
      mono[i] = Math.round(sum / channels);
    }
    return mono;
  }

  private padFrame(samples: Int16Array, frameSize: number): Int16Array {
    const padded = new Int16Array(frameSize);
    padded.set(samples);
    return padded;
  }
}
