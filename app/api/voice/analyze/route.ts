import { NextRequest, NextResponse } from 'next/server'
import { computeSVI } from '@/lib/svi-engine'
import { detectLanguage } from '@/lib/nlp-engine'
import {
  transcribeWithFasterWhisper,
  extractAcousticFeaturesWithPython,
  mapAcousticFeaturesToVoiceMetrics,
  AcousticFeaturesResult,
} from '@/lib/voice-transcriber'
import type { VoiceAnalysisMetrics } from '@/types'

/**
 * POST /api/voice/analyze
 *
 * Full Voice Pipeline (Phase 1-3):
 * Audio -> Faster-Whisper -> Transcript -> Acoustic Extractor -> VoiceAnalysisMetrics -> computeSVI()
 *
 * Body (multipart/form-data):
 *   - audio: File (webm/ogg/wav/mp3/m4a/flac)
 *   - metrics: string (JSON — optional browser-computed VoiceAnalysisMetrics fallback)
 *   - language?: string (e.g., "hi", "en", "te", "ta", "mr")
 *
 * Returns: { success, transcript, language, rawAcousticFeatures, voiceMetrics, assessment, disclaimer, timestamp }
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

    // Parse browser-provided acoustic metrics (used only as fallback)
    let browserMetrics: Partial<VoiceAnalysisMetrics> = {}
    if (metricsRaw) {
      try {
        browserMetrics = JSON.parse(metricsRaw)
      } catch {
        // ignore malformed metrics, proceed with defaults
      }
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const originalFilename = audioFile.name || 'recording.webm'

    // ── Step 1: Faster-Whisper Speech-to-Text (Phase 1) ───────────────────
    let transcript = ''
    let whisperLanguage = clientLanguage
    let whisperDuration = 0
    let whisperEngine = 'None'

    try {
      const fwResult = await transcribeWithFasterWhisper(buffer, originalFilename, clientLanguage)
      if (fwResult.success) {
        transcript = fwResult.transcript || ''
        whisperLanguage = fwResult.language || whisperLanguage
        whisperDuration = fwResult.duration_seconds || whisperDuration
        whisperEngine = 'Faster-Whisper (int8/cpu)'
      }
    } catch (fwErr) {
      console.warn('[VoicePipeline] Faster-Whisper local call failed, attempting fallback:', fwErr)
    }

    // Secondary fallback to OpenAI API if no transcript and key exists
    const OPENAI_KEY = process.env.OPENAI_API_KEY
    if (!transcript && OPENAI_KEY) {
      try {
        const whisperFormData = new FormData()
        whisperFormData.append('file', audioFile, originalFilename)
        whisperFormData.append('model', 'whisper-1')
        const langMap: Record<string, string> = {
          Hindi: 'hi', English: 'en', Marathi: 'mr', Tamil: 'ta',
          Telugu: 'te', Bengali: 'bn', Kannada: 'kn',
        }
        whisperFormData.append('language', langMap[clientLanguage] || clientLanguage)
        whisperFormData.append('response_format', 'verbose_json')

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
          whisperEngine = 'OpenAI Whisper API'
        }
      } catch (whisperErr) {
        console.warn('[VoicePipeline] Whisper API call failed:', whisperErr)
      }
    }

    // If still no transcript, check client/browser fallback
    if (!transcript && browserMetrics.transcript) {
      transcript = browserMetrics.transcript
      whisperEngine = 'Client/Browser Fallback'
    }

    // ── Step 2: Acoustic Feature Extraction (Phase 2) ─────────────────────
    let rawAcoustics: AcousticFeaturesResult | null = null
    try {
      rawAcoustics = await extractAcousticFeaturesWithPython(
        buffer,
        originalFilename,
        transcript
      )
    } catch (acErr) {
      console.warn('[VoicePipeline] Python acoustic extraction failed, using fallback:', acErr)
    }

    // ── Step 3: Canonical VoiceAnalysisMetrics Mapping (Phase 3) ──────────
    // Maps Phase 2 measurements (mean_pitch, pitch_std, rms_mean, pause_ratio, WPM)
    // to the exact VoiceAnalysisMetrics interface expected by computeSVI().
    // Every field is derived from rawAcoustics when available; no arbitrary defaults are substituted.
    const voiceMetrics: VoiceAnalysisMetrics = rawAcoustics && rawAcoustics.success
      ? mapAcousticFeaturesToVoiceMetrics(rawAcoustics, transcript, whisperLanguage, browserMetrics)
      : {
          duration_seconds: whisperDuration || (browserMetrics.duration_seconds ?? 0),
          transcript: transcript || (browserMetrics.transcript ?? ''),
          language: whisperLanguage || (browserMetrics.language ?? clientLanguage),
          speech_rate_wpm: browserMetrics.speech_rate_wpm ?? 0,
          average_pitch_hz: browserMetrics.average_pitch_hz ?? 0,
          pitch_variation_hz: browserMetrics.pitch_variation_hz ?? 0,
          energy_level: browserMetrics.energy_level ?? 0,
          pause_duration_ratio: browserMetrics.pause_duration_ratio ?? 0,
          acoustic_distress_score: browserMetrics.acoustic_distress_score ?? 0,
          mfcc_indicators: browserMetrics.mfcc_indicators || [],
        }

    // ── Step 4: NLP + SVI Integration (Existing Unmodified Engine) ─────────
    // Existing computeSVI evaluates text indicators + acoustic distress (30/70 fusion)
    const assessment = computeSVI(transcript, voiceMetrics, 0)

    // Language detection from transcript
    const langDetection = detectLanguage(transcript)

    // ── Step 5: Return Unified Response ───────────────────────────────────
    return NextResponse.json({
      success: true,
      transcript,
      language: whisperLanguage || langDetection.languageName,
      languageCode: langDetection.language,
      isRomanized: langDetection.isRomanized,
      rawAcousticFeatures: rawAcoustics,
      voiceMetrics,
      assessment,
      whisperEngine,
      disclaimer: 'Acoustic features are observational supporting signals to assist response coordination and are NOT clinical or medical diagnoses.',
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
