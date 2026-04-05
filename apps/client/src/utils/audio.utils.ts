import toWav from 'audiobuffer-to-wav';

/**
 * Slices an AudioBuffer from startTime to endTime.
 */
export function sliceAudioBuffer(
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number,
  audioContext: AudioContext
): AudioBuffer {
  const startOffset = Math.max(0, Math.floor(startTime * audioBuffer.sampleRate));
  const endOffset = Math.min(audioBuffer.length, Math.floor(endTime * audioBuffer.sampleRate));
  const frameCount = endOffset - startOffset;

  if (frameCount <= 0) {
    throw new Error('Invalid time range for audio slicing.');
  }

  const newBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    frameCount,
    audioBuffer.sampleRate
  );

  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const newChannelData = newBuffer.getChannelData(channel);
    newChannelData.set(channelData.subarray(startOffset, endOffset));
  }

  return newBuffer;
}

/**
 * Crops an audio file on the client side.
 */
export async function cropAudioFile(file: File, start: number, end: number): Promise<File> {
  const audioContext = new (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const slicedBuffer = sliceAudioBuffer(audioBuffer, start, end, audioContext);

  // Use the audiobuffer-to-wav library instead of manual encoding
  const wavArrayBuffer = toWav(slicedBuffer);
  const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });

  const newFileName = `cropped_${start}-${end}_${file.name.replace(/\.[^/.]+$/, '')}.wav`;
  return new File([wavBlob], newFileName, { type: 'audio/wav' });
}
