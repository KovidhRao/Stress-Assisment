import { NextRequest, NextResponse } from 'next/server'
import { transcribeWithFasterWhisper } from '@/lib/voice-transcriber'

/**
 * POST /api/voice/transcribe
 * ==========================
 * Phase 1 Voice Pipeline: Audio validation -> Faster-Whisper -> Transcript.
 *
 * Body (multipart/form-data):
 *   - audio: File (.wav, .mp3, .m4a, .webm, .ogg, .flac)
 *   - language?: string (e.g., "hi", "en", "te", "ta", "mr")
 *
 * Returns: { success, transcript, language, duration_seconds, words_count, engine, disclaimer }
 *
 * NOTE: Voice analysis features and transcripts are supporting signals to assist
 * triage coordination and do NOT constitute clinical or medical diagnoses.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File | null
    const clientLanguage = (formData.get('language') as string) || undefined

    // 1. Validate audio presence
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided. Please attach an audio file under key "audio".' },
        { status: 400 }
      )
    }

    // 2. Validate file size (max 25 MB)
    const MAX_SIZE = 25 * 1024 * 1024
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Audio file exceeds maximum size limit (25MB). Received ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB.` },
        { status: 400 }
      )
    }

    if (audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Audio file is empty (0 bytes).' },
        { status: 400 }
      )
    }

    // 3. Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 4. Run Faster-Whisper transcription
    const result = await transcribeWithFasterWhisper(
      buffer,
      audioFile.name || 'audio.webm',
      clientLanguage
    )

    if (!result.success && !result.transcript) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Speech transcription failed.',
          transcript: '',
          duration_seconds: 0,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      language: result.language,
      duration_seconds: result.duration_seconds,
      words_count: result.words_count,
      segments: result.segments || [],
      engine: 'Faster-Whisper (int8/cpu)',
      disclaimer: 'Acoustic and voice indicators are supporting observational signals and do NOT constitute clinical or medical diagnoses.',
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Transcription processing failed'
    console.error('[VoiceTranscribe] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/voice/transcribe - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    phase: 'Phase 1: Audio Validation -> Faster-Whisper -> Transcript',
    engine: 'Faster-Whisper (Systran/tiny, int8/cpu)',
    supported_formats: ['wav', 'mp3', 'm4a', 'webm', 'ogg', 'flac'],
    max_size_mb: 25,
    disclaimer: 'Voice features are supporting observational signals and NOT clinical or medical diagnoses.',
  })
}
