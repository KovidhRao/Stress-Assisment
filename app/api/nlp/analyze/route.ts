import { NextRequest, NextResponse } from 'next/server'
import { computeSVI } from '@/lib/svi-engine'
import { computeComprehensiveNLP, detectLanguage } from '@/lib/nlp-engine'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, voiceMetrics, clinicalAnswersScore } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing narrative text.' },
        { status: 400 }
      )
    }

    // Compute both full SVI StressAssessment and granular NLP output
    const assessment = computeSVI(text, voiceMetrics, clinicalAnswersScore || 0)
    const nlpDetail = computeComprehensiveNLP(text, assessment.speech_stress_detected ? 50 : 0)

    return NextResponse.json({
      success: true,
      assessment,
      nlpDetail,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error in /api/nlp/analyze:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process narrative text.' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    engine: 'NHAA Multilingual NLP & SVI Engine v2.0',
    supported_languages: [
      'en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn', 'gu', 'pa', 'ur', 'ml', 'or'
    ],
    indicators: [
      'stress', 'fear', 'anxiety', 'distress', 'trauma', 'threat',
      'violence', 'immediate_danger', 'isolation', 'vulnerability'
    ],
    situations_count: 17
  })
}
