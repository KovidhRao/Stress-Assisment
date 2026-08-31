/**
 * Voice Transcription Helper (Faster-Whisper Bridge)
 * ==================================================
 * Bridges Next.js Route Handlers to the Python Faster-Whisper transcriber.
 *
 * NOTE: Acoustic features, voice indicators, and speech transcripts are
 * supporting observational signals to assist emergency & support coordination.
 * They are strictly NOT clinical, medical, or psychiatric diagnoses.
 */

import { spawn } from 'node:child_process'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'

export interface TranscriptionResult {
  success: boolean
  transcript: string
  language: string
  duration_seconds: number
  words_count: number
  error?: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

/**
 * Transcribes audio buffer using Python Faster-Whisper.
 *
 * @param audioBuffer - Raw audio data buffer
 * @param originalFilename - Original uploaded filename (to preserve extension)
 * @param language - Optional language code (e.g., 'hi', 'en', 'te', 'ta')
 * @returns TranscriptionResult
 */
export async function transcribeWithFasterWhisper(
  audioBuffer: Buffer,
  originalFilename: string = 'recording.webm',
  language?: string
): Promise<TranscriptionResult> {
  const ext = originalFilename.includes('.')
    ? '.' + originalFilename.split('.').pop()!.toLowerCase()
    : '.webm'

  const tempFilePath = join(tmpdir(), `nhaa_voice_${randomUUID()}${ext}`)

  try {
    // Write audio buffer to temporary file on disk for Python processing
    await writeFile(tempFilePath, audioBuffer)

    const args = ['-m', 'voice.transcriber', tempFilePath]
    if (language) {
      args.push('--language', language)
    }

    const pythonCmd = process.env.PYTHON_PATH || 'python'

    const result = await new Promise<TranscriptionResult>((resolve) => {
      const proc = spawn(pythonCmd, args, {
        cwd: process.cwd(),
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
        },
      })

      let stdoutData = ''
      let stderrData = ''

      proc.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf-8')
      })

      proc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf-8')
      })

      proc.on('error', (err) => {
        resolve({
          success: false,
          transcript: '',
          language: language || 'en',
          duration_seconds: 0,
          words_count: 0,
          error: `Failed to spawn Python process: ${err.message}`,
        })
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[Faster-Whisper] Exited with code ${code}. Stderr: ${stderrData}`)
          resolve({
            success: false,
            transcript: '',
            language: language || 'en',
            duration_seconds: 0,
            words_count: 0,
            error: stderrData || `Faster-Whisper exited with code ${code}`,
          })
          return
        }

        try {
          // Parse JSON from Python stdout
          // Find first '{' in stdout to avoid any preliminary logging output
          const jsonStart = stdoutData.indexOf('{')
          const jsonEnd = stdoutData.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const parsed = JSON.parse(stdoutData.slice(jsonStart, jsonEnd + 1))
            resolve(parsed)
          } else {
            resolve({
              success: false,
              transcript: '',
              language: language || 'en',
              duration_seconds: 0,
              words_count: 0,
              error: 'Invalid JSON output from Faster-Whisper',
            })
          }
        } catch (parseErr) {
          resolve({
            success: false,
            transcript: '',
            language: language || 'en',
            duration_seconds: 0,
            words_count: 0,
            error: `JSON parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          })
        }
      })
    })

    return result
  } finally {
    // Clean up temporary audio file
    try {
      await unlink(tempFilePath)
    } catch {
      // Ignore cleanup error if file was already unlinked
    }
  }
}

export interface AcousticFeaturesResult {
  success: boolean
  file_id?: string
  duration_seconds: number
  pitch: {
    mean_pitch_hz: number
    min_pitch_hz: number
    max_pitch_hz: number
    pitch_std_hz: number
    voiced_ratio: number
  }
  energy: {
    rms_mean: number
    rms_max: number
  }
  voice_activity: {
    speech_duration_seconds: number
    pause_duration_seconds: number
    pause_duration_ratio: number
    pause_count: number
    top_db_threshold: number
  }
  speech_rate: {
    words_count: number
    speech_rate_wpm: number
  }
  spectral: {
    zero_crossing_rate_mean: number
    spectral_centroid_mean: number
    spectral_bandwidth_mean: number
  }
  mfcc: Record<string, number>
  error?: string
  disclaimer: string
}

/**
 * Extracts acoustic features from audio buffer using Python librosa module.
 */
export async function extractAcousticFeaturesWithPython(
  audioBuffer: Buffer,
  originalFilename: string = 'recording.webm',
  transcript?: string,
  topDb: number = 25.0
): Promise<AcousticFeaturesResult> {
  const ext = originalFilename.includes('.')
    ? '.' + originalFilename.split('.').pop()!.toLowerCase()
    : '.webm'

  const tempFilePath = join(tmpdir(), `nhaa_acoustic_${randomUUID()}${ext}`)

  try {
    await writeFile(tempFilePath, audioBuffer)

    const args = ['-m', 'voice.acoustic_extractor', tempFilePath, '--top_db', String(topDb)]
    if (transcript) {
      args.push('--transcript', transcript)
    }

    const pythonCmd = process.env.PYTHON_PATH || 'python'

    const result = await new Promise<AcousticFeaturesResult>((resolve) => {
      const proc = spawn(pythonCmd, args, {
        cwd: process.cwd(),
        shell: true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
        },
      })

      let stdoutData = ''
      let stderrData = ''

      proc.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf-8')
      })

      proc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf-8')
      })

      proc.on('error', (err) => {
        resolve({
          success: false,
          duration_seconds: 0,
          pitch: { mean_pitch_hz: 0, min_pitch_hz: 0, max_pitch_hz: 0, pitch_std_hz: 0, voiced_ratio: 0 },
          energy: { rms_mean: 0, rms_max: 0 },
          voice_activity: { speech_duration_seconds: 0, pause_duration_seconds: 0, pause_duration_ratio: 0, pause_count: 0, top_db_threshold: topDb },
          speech_rate: { words_count: 0, speech_rate_wpm: 0 },
          spectral: { zero_crossing_rate_mean: 0, spectral_centroid_mean: 0, spectral_bandwidth_mean: 0 },
          mfcc: {},
          error: `Failed to spawn Python process: ${err.message}`,
          disclaimer: 'Acoustic features are supporting signals and not medical diagnoses.',
        })
      })

      proc.on('close', (code) => {
        if (code !== 0) {
          resolve({
            success: false,
            duration_seconds: 0,
            pitch: { mean_pitch_hz: 0, min_pitch_hz: 0, max_pitch_hz: 0, pitch_std_hz: 0, voiced_ratio: 0 },
            energy: { rms_mean: 0, rms_max: 0 },
            voice_activity: { speech_duration_seconds: 0, pause_duration_seconds: 0, pause_duration_ratio: 0, pause_count: 0, top_db_threshold: topDb },
            speech_rate: { words_count: 0, speech_rate_wpm: 0 },
            spectral: { zero_crossing_rate_mean: 0, spectral_centroid_mean: 0, spectral_bandwidth_mean: 0 },
            mfcc: {},
            error: stderrData || `Acoustic extractor exited with code ${code}`,
            disclaimer: 'Acoustic features are supporting signals and not medical diagnoses.',
          })
          return
        }

        try {
          const jsonStart = stdoutData.indexOf('{')
          const jsonEnd = stdoutData.lastIndexOf('}')
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const parsed = JSON.parse(stdoutData.slice(jsonStart, jsonEnd + 1))
            resolve(parsed)
          } else {
            resolve({
              success: false,
              duration_seconds: 0,
              pitch: { mean_pitch_hz: 0, min_pitch_hz: 0, max_pitch_hz: 0, pitch_std_hz: 0, voiced_ratio: 0 },
              energy: { rms_mean: 0, rms_max: 0 },
              voice_activity: { speech_duration_seconds: 0, pause_duration_seconds: 0, pause_duration_ratio: 0, pause_count: 0, top_db_threshold: topDb },
              speech_rate: { words_count: 0, speech_rate_wpm: 0 },
              spectral: { zero_crossing_rate_mean: 0, spectral_centroid_mean: 0, spectral_bandwidth_mean: 0 },
              mfcc: {},
              error: 'Invalid JSON output from acoustic extractor',
              disclaimer: 'Acoustic features are supporting signals and not medical diagnoses.',
            })
          }
        } catch (parseErr) {
          resolve({
            success: false,
            duration_seconds: 0,
            pitch: { mean_pitch_hz: 0, min_pitch_hz: 0, max_pitch_hz: 0, pitch_std_hz: 0, voiced_ratio: 0 },
            energy: { rms_mean: 0, rms_max: 0 },
            voice_activity: { speech_duration_seconds: 0, pause_duration_seconds: 0, pause_duration_ratio: 0, pause_count: 0, top_db_threshold: topDb },
            speech_rate: { words_count: 0, speech_rate_wpm: 0 },
            spectral: { zero_crossing_rate_mean: 0, spectral_centroid_mean: 0, spectral_bandwidth_mean: 0 },
            mfcc: {},
            error: `JSON parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
            disclaimer: 'Acoustic features are supporting signals and not medical diagnoses.',
          })
        }
      })
    })

    return result
  } finally {
    try {
      await unlink(tempFilePath)
    } catch {
      // Ignore cleanup error
    }
  }
}

import type { VoiceAnalysisMetrics } from '@/types'

/**
 * Maps raw Phase 2 acoustic measurements into the canonical VoiceAnalysisMetrics
 * contract expected by the existing computeSVI() engine.
 */
export function mapAcousticFeaturesToVoiceMetrics(
  acoustic: AcousticFeaturesResult,
  transcript: string,
  language: string,
  browserFallback?: Partial<VoiceAnalysisMetrics>
): VoiceAnalysisMetrics {
  const duration = acoustic.duration_seconds || browserFallback?.duration_seconds || 15
  const speechRate = acoustic.speech_rate?.speech_rate_wpm || browserFallback?.speech_rate_wpm || 110
  const avgPitch = acoustic.pitch?.mean_pitch_hz || browserFallback?.average_pitch_hz || 220
  const pitchVar = acoustic.pitch?.pitch_std_hz || browserFallback?.pitch_variation_hz || 35
  const pauseRatio = acoustic.voice_activity?.pause_duration_ratio ?? (browserFallback?.pause_duration_ratio ?? 0.25)

  // Energy level: scaled from RMS mean (0.0 - 0.40 typical speech range mapped to 0 - 100)
  // Maintains computeSVI threshold where < 35 triggers energyDrop distress
  const energyLevel = acoustic.energy?.rms_mean !== undefined
    ? Math.min(100, Math.max(0, Math.round(acoustic.energy.rms_mean * 250)))
    : (browserFallback?.energy_level || 50)

  // Existing SVI Acoustic Distress formula from lib/svi-engine.ts
  const rateDistress = (speechRate < 95 || speechRate > 175) ? 25 : 5
  const pitchJitterDistress = Math.min(30, (pitchVar / 50) * 30)
  const pauseDistress = Math.min(25, pauseRatio * 50)
  const energyDrop = energyLevel < 35 ? 20 : 0
  const acousticScore = Math.min(100, Math.round(rateDistress + pitchJitterDistress + pauseDistress + energyDrop))

  // MFCC & Harmonic tags
  const mfccIndicators: string[] = [
    avgPitch > 210 ? 'elevated_fundamental_pitch' : 'normal_pitch',
    pitchVar > 30 ? 'vocal_tremor_high' : 'stable_modulation',
    pauseRatio > 0.3 ? 'respiratory_dysrhythmia' : 'continuous_flow',
  ]

  return {
    duration_seconds: duration,
    transcript: transcript || browserFallback?.transcript || 'Voice statement recorded.',
    language: language || browserFallback?.language || 'en',
    speech_rate_wpm: speechRate,
    average_pitch_hz: avgPitch,
    pitch_variation_hz: pitchVar,
    energy_level: energyLevel,
    pause_duration_ratio: pauseRatio,
    acoustic_distress_score: acousticScore,
    mfcc_indicators: mfccIndicators,
  }
}
