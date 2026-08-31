/**
 * End-to-End Integration Test for /api/voice/analyze Route Handler (Phase 3)
 */

import { POST } from '@/app/api/voice/analyze/route'
import { NextRequest } from 'next/server'

describe('POST /api/voice/analyze Route Handler', () => {
  it('should process audio through Whisper -> Acoustic Extraction -> VoiceAnalysisMetrics -> SVI', async () => {
    // Generate a 2.0-second 16kHz mono WAV buffer
    const sampleRate = 16000
    const duration = 2.0
    const numSamples = Math.floor(sampleRate * duration)
    const headerSize = 44
    const buffer = Buffer.alloc(headerSize + numSamples * 2)

    buffer.write('RIFF', 0)
    buffer.writeUInt32LE(headerSize + numSamples * 2 - 8, 4)
    buffer.write('WAVE', 8)
    buffer.write('fmt ', 12)
    buffer.writeUInt32LE(16, 16)
    buffer.writeUInt16LE(1, 20)  // PCM
    buffer.writeUInt16LE(1, 22)  // Mono
    buffer.writeUInt32LE(sampleRate, 24)
    buffer.writeUInt32LE(sampleRate * 2, 28)
    buffer.writeUInt16LE(2, 32)
    buffer.writeUInt16LE(16, 34)
    buffer.write('data', 36)
    buffer.writeUInt32LE(numSamples * 2, 40)

    // Write a 220 Hz sine wave
    for (let i = 0; i < numSamples; i++) {
      const val = Math.floor(Math.sin(2 * Math.PI * 220 * (i / sampleRate)) * 10000)
      buffer.writeInt16LE(val, headerSize + i * 2)
    }

    const blob = new Blob([buffer], { type: 'audio/wav' })
    const file = new File([blob], 'test_statement.wav', { type: 'audio/wav' })

    const formData = new FormData()
    formData.append('audio', file)
    formData.append('language', 'en')

    const req = new NextRequest('http://localhost:3000/api/voice/analyze', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const data = await response.json()
    console.log('ACTUAL_VOICE_ANALYZE_JSON:', JSON.stringify(data, null, 2))

    // 1. Unified Response Structure
    expect(data.success).toBe(true)
    expect(typeof data.transcript).toBe('string')
    expect(typeof data.language).toBe('string')
    expect(data.disclaimer).toBeDefined()

    // 2. Canonical VoiceAnalysisMetrics Contract
    expect(data.voiceMetrics).toBeDefined()
    expect(typeof data.voiceMetrics.duration_seconds).toBe('number')
    expect(typeof data.voiceMetrics.average_pitch_hz).toBe('number')
    expect(typeof data.voiceMetrics.pitch_variation_hz).toBe('number')
    expect(typeof data.voiceMetrics.energy_level).toBe('number')
    expect(typeof data.voiceMetrics.pause_duration_ratio).toBe('number')
    expect(typeof data.voiceMetrics.speech_rate_wpm).toBe('number')
    expect(typeof data.voiceMetrics.acoustic_distress_score).toBe('number')
    expect(Array.isArray(data.voiceMetrics.mfcc_indicators)).toBe(true)

    // 3. Raw Acoustic Features (Phase 2)
    expect(data.rawAcousticFeatures).toBeDefined()
    if (data.rawAcousticFeatures?.success) {
      expect(data.rawAcousticFeatures.pitch).toBeDefined()
      expect(data.rawAcousticFeatures.energy).toBeDefined()
      expect(data.rawAcousticFeatures.voice_activity).toBeDefined()
      expect(data.rawAcousticFeatures.spectral).toBeDefined()
      expect(data.rawAcousticFeatures.mfcc).toBeDefined()
    }

    // 4. Existing SVI StressAssessment Contract
    expect(data.assessment).toBeDefined()
    expect(typeof data.assessment.svi_score).toBe('number')
    expect(typeof data.assessment.risk_level).toBe('string')
    expect(data.assessment.indicators).toBeDefined()
  }, 45000)
})
