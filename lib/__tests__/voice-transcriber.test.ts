/**
 * Test suite for Voice Transcriber (Faster-Whisper Bridge)
 *
 * NOTE: Voice features and transcripts are supporting signals to aid
 * response coordination and are NOT clinical or medical diagnoses.
 */

import { transcribeWithFasterWhisper } from '@/lib/voice-transcriber'

describe('Voice Transcriber (Faster-Whisper Bridge)', () => {
  it('should export transcribeWithFasterWhisper as a function', () => {
    expect(typeof transcribeWithFasterWhisper).toBe('function')
  })

  it('should handle synthesized audio buffer without crashing', async () => {
    // Generate a minimal 0.5-second 16kHz mono WAV buffer
    const sampleRate = 16000
    const numSamples = Math.floor(sampleRate * 0.5)
    const headerSize = 44
    const buffer = Buffer.alloc(headerSize + numSamples * 2)

    // Write RIFF header
    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(headerSize + numSamples * 2 - 8, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16) // Subchunk1Size
    buffer.writeUInt16LE(1, 20)  // AudioFormat (PCM)
    buffer.writeUInt16LE(1, 22)  // NumChannels (mono)
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(sampleRate * 2, 28) // ByteRate
    buffer.writeUInt16LE(2, 32)  // BlockAlign
    buffer.writeUInt16LE(16, 34) // BitsPerSample
    buffer.write('data', 36)
    buffer.writeUInt32LE(numSamples * 2, 40)

    const result = await transcribeWithFasterWhisper(buffer, 'test.wav', 'en')
    expect(result).toBeDefined()
    expect(typeof result.success).toBe('boolean')
    expect(typeof result.transcript).toBe('string')
    expect(typeof result.duration_seconds).toBe('number')
  }, 30000)

  it('should correctly map acoustic measurements to VoiceAnalysisMetrics contract', () => {
    const { mapAcousticFeaturesToVoiceMetrics } = require('@/lib/voice-transcriber')

    const mockAcoustics = {
      success: true,
      file_id: 'test_file',
      duration_seconds: 3.5,
      pitch: {
        mean_pitch_hz: 215.0,
        min_pitch_hz: 210.0,
        max_pitch_hz: 220.0,
        pitch_std_hz: 5.0,
        voiced_ratio: 0.85
      },
      energy: {
        rms_mean: 0.20,
        rms_max: 0.30
      },
      voice_activity: {
        speech_duration_seconds: 3.0,
        pause_duration_seconds: 0.5,
        pause_duration_ratio: 0.143,
        pause_count: 1,
        top_db_threshold: 25.0
      },
      speech_rate: {
        words_count: 7,
        speech_rate_wpm: 120.0
      },
      spectral: {
        zero_crossing_rate_mean: 0.05,
        spectral_centroid_mean: 1200.0,
        spectral_bandwidth_mean: 1500.0
      },
      mfcc: { mfcc_1: -200.0 },
      disclaimer: 'Acoustic disclaimer'
    }

    const metrics = mapAcousticFeaturesToVoiceMetrics(
      mockAcoustics,
      'This is a sample spoken victim statement',
      'en'
    )

    expect(metrics).toBeDefined()
    expect(metrics.duration_seconds).toBe(3.5)
    expect(metrics.transcript).toBe('This is a sample spoken victim statement')
    expect(metrics.language).toBe('en')
    expect(metrics.average_pitch_hz).toBe(215)
    expect(metrics.pitch_variation_hz).toBe(5)
    expect(metrics.speech_rate_wpm).toBe(120)
    expect(metrics.pause_duration_ratio).toBe(0.143)
    expect(metrics.energy_level).toBe(50) // Math.round(0.20 * 250) = 50
    expect(typeof metrics.acoustic_distress_score).toBe('number')
    expect(Array.isArray(metrics.mfcc_indicators)).toBe(true)
  })
})
