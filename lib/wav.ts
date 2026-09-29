/**
 * Browser-side WAV encoding.
 *
 * Plaud's upload API accepts mp3, wav, ogg and opus — but NOT webm, which is
 * exactly what Chrome's MediaRecorder produces (`audio/webm;codecs=opus`).
 * Rather than transcode on the server, decode the clip with WebAudio and
 * re-encode it as 16 kHz mono 16-bit WAV, which every browser can produce and
 * Plaud accepts. 16 kHz mono is ~32 KB/s, so a one-minute question is ~2 MB.
 */

const TARGET_SAMPLE_RATE = 16000;

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

/** Mixes to mono and resamples by linear interpolation. */
function toMono16k(audioBuffer: AudioBuffer): Float32Array {
  const channels = audioBuffer.numberOfChannels;
  const source = audioBuffer.getChannelData(0);
  const mono = new Float32Array(source.length);

  if (channels === 1) {
    mono.set(source);
  } else {
    for (let i = 0; i < source.length; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += audioBuffer.getChannelData(c)[i];
      mono[i] = sum / channels;
    }
  }

  if (audioBuffer.sampleRate === TARGET_SAMPLE_RATE) return mono;

  const ratio = audioBuffer.sampleRate / TARGET_SAMPLE_RATE;
  const outLength = Math.floor(mono.length / ratio);
  const out = new Float32Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const position = i * ratio;
    const low = Math.floor(position);
    const high = Math.min(low + 1, mono.length - 1);
    const weight = position - low;
    out[i] = mono[low] * (1 - weight) + mono[high] * weight;
  }

  return out;
}

/** Whatever the browser recorded → 16 kHz mono WAV that Plaud will accept. */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(arrayBuffer);
    return encodeWav(toMono16k(decoded), TARGET_SAMPLE_RATE);
  } finally {
    await context.close();
  }
}
