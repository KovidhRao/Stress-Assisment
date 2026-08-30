import { NextRequest, NextResponse } from 'next/server'
import { computeSVI } from '@/lib/svi-engine'
import { detectLanguage } from '@/lib/nlp-engine'
import type { VoiceAnalysisMetrics } from '@/types'

/**
 * POST /api/voice/analyze
 *
 * Full voice pipeline: Whisper transcription → NLP analysis → SVI integration.
 *
 * Body (multipart/form-data):
 *   - audio: File (webm/ogg/wav)
 *   - metrics: string (JSON — browser-computed VoiceAnalysisMetrics)
 *   - language?: string (e.g., "hi", "en", "te")
 *
 * Returns: { transcript, assessment, nlpDetail, voiceMetrics, language }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const metricsRaw = formData.get('metrics') as string | null
    const clientLanguage = (formData.get('language') as string) || 'en'

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided.' },
        { status: 400 }
      )
    }

    // Parse browser-computed acoustic metrics (pitch, jitter, energy, etc.)
    let browserMetrics: Partial<VoiceAnalysisMetrics> = {}
    if (metricsRaw) {
      try {
        browserMetrics = JSON.parse(metricsRaw)
      } catch {
        // ignore malformed metrics, proceed with defaults
      }
    }

    // ── Step 1: Whisper Transcription ─────────────────────────────────────
    const OPENAI_KEY = process.env.OPENAI_API_KEY
    let transcript = browserMetrics.transcript || ''
    let whisperLanguage = clientLanguage
    let whisperDuration = browserMetrics.duration_seconds || 0

    if (OPENAI_KEY) {
      try {
        const whisperFormData = new FormData()
        whisperFormData.append('file', audioFile, audioFile.name || 'audio.webm')
        whisperFormData.append('model', 'whisper-1')
        // Map display language to Whisper language code
        const langMap: Record<string, string> = {
          Hindi: 'hi', English: 'en', Marathi: 'mr', Tamil: 'ta',
          Telugu: 'te', Bengali: 'bn', Kannada: 'kn',
        }
        whisperFormData.append('language', langMap[clientLanguage] || clientLanguage)
        whisperFormData.append('response_format', 'verbose_json')
        whisperFormData.append('timestamp_granularities[]', 'word')

        const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_KEY}` },
          body: whisperFormData,
        })

        if (whisperResp.ok) {
          const whisperData = await whisperResp.json()
          transcript = whisperData.text || transcript
          whisperLanguage = whisperData.language || whisperLanguage
          whisperDuration = whisperData.duration || whisperDuration
          console.log(`[VoicePipeline] Whisper transcription OK: ${transcript.slice(0, 80)}...`)
        } else {
          console.warn(`[VoicePipeline] Whisper API ${whisperResp.status}, using fallback transcript`)
        }
      } catch (whisperErr) {
        console.warn('[VoicePipeline] Whisper call failed, using browser transcript:', whisperErr)
      }
    } else {
      console.log('[VoicePipeline] No OPENAI_API_KEY — using browser-provided transcript')
    }

    // ── Step 2: Build VoiceAnalysisMetrics ────────────────────────────────
    const voiceMetrics: VoiceAnalysisMetrics = {
      duration_seconds: whisperDuration || browserMetrics.duration_seconds || 15,
      transcript: transcript || browserMetrics.transcript || 'Voice statement recorded.',
      language: whisperLanguage || browserMetrics.language || clientLanguage,
      speech_rate_wpm: browserMetrics.speech_rate_wpm || 110,
      average_pitch_hz: browserMetrics.average_pitch_hz || 220,
      pitch_variation_hz: browserMetrics.pitch_variation_hz || 35,
      energy_level: browserMetrics.energy_level || 50,
      pause_duration_ratio: browserMetrics.pause_duration_ratio || 0.25,
      acoustic_distress_score: browserMetrics.acoustic_distress_score || 45,
      mfcc_indicators: browserMetrics.mfcc_indicators || [],
    }

    // ── Step 3: NLP + SVI Integration ─────────────────────────────────────
    // Use the real SVI engine with both text and voice features
    const assessment = computeSVI(transcript, voiceMetrics, 0)

    // Language detection from transcript (may differ from Whisper's detected language)
    const langDetection = detectLanguage(transcript)

    // ── Step 4: Return Combined Result ────────────────────────────────────
    return NextResponse.json({
      success: true,
      transcript,
      voiceMetrics,
      assessment,
      language: langDetection.languageName,
      languageCode: langDetection.language,
      isRomanized: langDetection.isRomanized,
      whisperUsed: !!OPENAI_KEY,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Voice analysis failed'
    console.error('[VoicePipeline] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/voice/analyze — Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    engine: 'NHAA Whisper → NLP → SVI Voice Pipeline v1.0',
    whisper_configured: !!process.env.OPENAI_API_KEY,
    supported_formats: ['webm', 'ogg', 'wav', 'mp3', 'm4a'],
    supported_languages: ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'],
  })
}
