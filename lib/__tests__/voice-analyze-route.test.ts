/**
 * End-to-End Integration Tests for /api/voice/analyze Route Handler (Phase 3)
 *
 * Explicitly tests and distinguishes:
 * 1. Real spoken speech execution through Faster-Whisper -> Acoustic Extraction -> VoiceAnalysisMetrics -> SVI
 * 2. Non-verbal / tone audio ensuring zero-values are strictly preserved (no 110 WPM, 35 Hz, or placeholder text)
 */

import { POST } from '@/app/api/voice/analyze/route'
import { NextRequest } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

describe('POST /api/voice/analyze Route Handler', () => {
  it('REAL SPOKEN SPEECH: executes Faster-Whisper -> Acoustic Extraction -> VoiceAnalysisMetrics -> SVI', async () => {
    const fixturePath = path.join(process.cwd(), 'voice', 'tests', 'fixtures', 'sample_speech.wav')
    expect(fs.existsSync(fixturePath)).toBe(true)

    const fileBuffer = fs.readFileSync(fixturePath)
    const blob = new Blob([fileBuffer], { type: 'audio/wav' })
    const file = new File([blob], 'sample_speech.wav', { type: 'audio/wav' })

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
    console.log('REAL_SPOKEN_SPEECH_RESPONSE:', JSON.stringify(data, null, 2))

    // 1. Real Faster-Whisper Execution Check
    expect(data.success).toBe(true)
    expect(data.whisperEngine).toBe('Faster-Whisper (int8/cpu)')
    expect(data.transcript).toMatch(/stressed|terrified|family|threatened/i)
    expect(data.language).toBe('en')

    // 2. Raw Acoustic Features Check (Phase 2)
    expect(data.rawAcousticFeatures).toBeDefined()
    expect(data.rawAcousticFeatures.success).toBe(true)
    const raw = data.rawAcousticFeatures
    expect(raw.speech_rate.words_count).toBeGreaterThan(0)
    expect(raw.speech_rate.speech_rate_wpm).toBeGreaterThan(50)
    expect(raw.pitch.mean_pitch_hz).toBeGreaterThan(50)
    expect(raw.pitch.pitch_std_hz).toBeGreaterThan(0)
    expect(raw.energy.rms_mean).toBeGreaterThan(0)

    // 3. Traceability: VoiceAnalysisMetrics MUST trace directly to rawAcousticFeatures
    const vm = data.voiceMetrics
    expect(vm).toBeDefined()
    expect(vm.transcript).toBe(data.transcript)
    expect(vm.speech_rate_wpm).toBe(raw.speech_rate.speech_rate_wpm)
    expect(vm.pitch_variation_hz).toBe(raw.pitch.pitch_std_hz)
    expect(vm.average_pitch_hz).toBe(raw.pitch.mean_pitch_hz)
    expect(vm.pause_duration_ratio).toBe(raw.voice_activity.pause_duration_ratio)
    expect(vm.duration_seconds).toBe(raw.duration_seconds)
    expect(vm.energy_level).toBe(Math.min(100, Math.max(0, Math.round(raw.energy.rms_mean * 250))))

    // 4. SVI Assessment Integration Check
    expect(data.assessment).toBeDefined()
    expect(data.assessment.svi_score).toBeGreaterThan(0)
    const voiceFactor = data.assessment.contributing_factors?.find(
      (f: { indicator: string; contribution: number }) => f.indicator === 'voice_acoustics'
    )
    expect(voiceFactor).toBeDefined()
    expect(voiceFactor.contribution).toBeGreaterThan(0)
  }, 60000)

  it('NON-VERBAL / TONE AUDIO: strictly preserves 0 values with zero placeholder substitution', async () => {
    // Generate a 1.5-second pure sine wave
    const sampleRate = 16000
    const duration = 1.5
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

    for (let i = 0; i < numSamples; i++) {
      const val = Math.floor(Math.sin(2 * Math.PI * 220 * (i / sampleRate)) * 10000)
      buffer.writeInt16LE(val, headerSize + i * 2)
    }

    const blob = new Blob([buffer], { type: 'audio/wav' })
    const file = new File([blob], 'tone.wav', { type: 'audio/wav' })

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

    expect(data.success).toBe(true)
    expect(data.whisperEngine).toBe('Faster-Whisper (int8/cpu)')
    expect(data.transcript).toBe('')

    // Verify 0 values are strictly preserved and NOT replaced by 110, 35, or placeholder text
    const vm = data.voiceMetrics
    expect(vm.speech_rate_wpm).toBe(0)
    expect(vm.speech_rate_wpm).not.toBe(110)
    expect(vm.pitch_variation_hz).toBe(0)
    expect(vm.pitch_variation_hz).not.toBe(35)
    expect(vm.transcript).toBe('')
    expect(vm.transcript).not.toBe('Voice statement recorded.')
  }, 45000)
})
