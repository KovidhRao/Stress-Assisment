import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ejwlluxdhgvurjjsqhmp.supabase.co'
const supabaseKey = 'sb_publishable_9u4wuozmrCH1xDYAKyaz-Q_uKNdNnQ6'
const supabase = createClient(supabaseUrl, supabaseKey)

const realUserId = 'c948ebf6-9a07-47aa-81e0-a41bc7b5289d'
const testCaseId = '22222222-2222-2222-2222-222222222222'

function toDbRiskLevel(level) {
  const m = { Low:'LOW',Moderate:'MODERATE',High:'HIGH',Critical:'CRITICAL', low:'LOW',moderate:'MODERATE',high:'HIGH',critical:'CRITICAL', LOW:'LOW',MODERATE:'MODERATE',HIGH:'HIGH',CRITICAL:'CRITICAL' }
  return m[level ?? 'LOW'] ?? 'LOW'
}
function toDbChannel(channel) {
  const m = { mobile_app:'MOBILE', mobile:'MOBILE', chatbot:'CHATBOT', ivrs:'IVRS', voice:'VOICE', web:'WEB', integrated_portal:'WEB', portal:'WEB', online:'WEB' }
  return m[(channel ?? 'web').toLowerCase()] ?? 'WEB'
}
function toDbCaseStatus(status) {
  const m = { 'New Intake':'OPEN','Under Triage':'OPEN','In Progress':'OPEN','Pending':'OPEN','Resolved':'RESOLVED','Closed':'CLOSED', OPEN:'OPEN',RESOLVED:'RESOLVED',CLOSED:'CLOSED' }
  return m[status ?? 'New Intake'] ?? 'OPEN'
}
function norm(v) {
  if (v == null) return 0
  return v > 1 ? parseFloat((v / 100).toFixed(4)) : v
}
function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

// Simulate what page.tsx sends as a caseRecord after story submission
const simulatedCase = {
  id: testCaseId,
  session_id: 'SESS-999001',
  user_id: realUserId,
  channel: 'integrated_portal',
  status: 'New Intake',
  incident_location: { village_town_city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411001' },
  assigned_officer_id: null,
  assigned_counsellor_id: null,
  proximity_routing: 'Pune District Redressal Unit',
  narrative_text: 'My husband threatened to kill me and I am scared. He has been beating me every day.',
  language: 'en',
  voice_analysis: null,
  stress_assessment: {
    svi_score: 78,
    risk_level: 'High',
    situation: 'VIOLENCE',
    situation_confidence: 0.88,
    confidence: 0.88,
    fear_score: 82,
    anxiety_score: 75,
    trauma_score: 80,
    depression_indicator: true,
    suicidal_ideation_flag: false,
    safety_escalation_applied: true,
    key_trauma_triggers: ['violence', 'threat', 'fear', 'isolation'],
    recommended_actions: ['Immediate Protection Order', 'Counselling Session'],
    indicators: { threat: 0.9, violence: 0.85, social_isolation: 0.6, vulnerability: 0.7 },
    contributing_factors: [
      { factor: 'threat', score: 0.9, evidence: 'Direct threat to life detected' },
      { factor: 'violence', score: 0.85, evidence: 'Physical violence mentioned' }
    ]
  }
}

async function runLiveTest() {
  await supabase.from('cases').delete().eq('id', testCaseId)
  
  const sa = simulatedCase.stress_assessment
  const loc = simulatedCase.incident_location

  // 1. Case
  const casePayload = {
    id: simulatedCase.id,
    case_number: simulatedCase.id,
    user_id: realUserId,
    session_id: simulatedCase.session_id,
    channel: toDbChannel(simulatedCase.channel),
    status: toDbCaseStatus(simulatedCase.status),
    incident_location: loc,
    incident_district: loc.district || null,
    incident_state: loc.state || null,
    incident_city: loc.village_town_city || null,
    incident_pincode: loc.pincode || null,
    assigned_officer_id: isUuid(simulatedCase.assigned_officer_id) ? simulatedCase.assigned_officer_id : null,
    assigned_counsellor_id: isUuid(simulatedCase.assigned_counsellor_id) ? simulatedCase.assigned_counsellor_id : null,
    proximity_routing: simulatedCase.proximity_routing || null,
    primary_situation: sa.situation || null,
    current_risk_level: toDbRiskLevel(sa.risk_level),
    current_svi: sa.svi_score ?? null
  }
  const { error: cErr } = await supabase.from('cases').insert(casePayload)
  console.log("1. cases:", cErr ? `FAIL â†’ ${cErr.message}` : "âœ… SUCCESS")

  // 2. Interaction
  const { data: intData, error: iErr } = await supabase.from('interactions').insert({
    case_id: simulatedCase.id,
    user_id: realUserId,
    interaction_type: 'CHAT',
    channel: toDbChannel(simulatedCase.channel),
    language: simulatedCase.language || 'en',
    text_content: simulatedCase.narrative_text || ''
  }).select('id').single()
  console.log("2. interactions:", iErr ? `FAIL â†’ ${iErr.message}` : `âœ… SUCCESS (id: ${intData?.id})`)
  const interactionId = intData?.id

  if (!interactionId) { console.log("STOPPING: no interaction ID"); return }

  // 3. Assessment
  const { data: aData, error: aErr } = await supabase.from('assessments').insert({
    interaction_id: interactionId,
    case_id: simulatedCase.id,
    model_name: 'NHAA-NLP-v2',
    model_version: '2.0',
    situation: sa.situation || null,
    situation_confidence: norm(sa.situation_confidence ?? sa.confidence),
    overall_distress: norm(sa.svi_score),
    fear_score: norm(sa.fear_score),
    anxiety_score: norm(sa.anxiety_score),
    trauma_score: norm(sa.trauma_score),
    threat_score: norm(sa.indicators?.threat),
    violence_score: Math.round((norm(sa.indicators?.violence)) * 100),
    isolation_score: norm(sa.indicators?.social_isolation),
    vulnerability_score: norm(sa.indicators?.vulnerability),
    depression_indicator: sa.depression_indicator ? 1 : 0,
    suicidal_ideation_indicator: sa.suicidal_ideation_flag ? 1 : 0,
    confidence: norm(sa.situation_confidence ?? sa.confidence)
  }).select('id').single()
  console.log("3. assessments:", aErr ? `FAIL â†’ ${aErr.message}` : `âœ… SUCCESS (id: ${aData?.id})`)
  const assessmentId = aData?.id

  if (!assessmentId) { console.log("STOPPING: no assessment ID"); return }

  // 4. SVI Scores
  const { error: sErr } = await supabase.from('svi_scores').insert({
    assessment_id: assessmentId,
    case_id: simulatedCase.id,
    score: sa.svi_score ?? 0,
    risk_level: toDbRiskLevel(sa.risk_level),
    model_version: '2.0',
    confidence: norm(sa.situation_confidence ?? sa.confidence),
    calculation_method: sa.safety_escalation_applied ? 'ESCALATED' : 'STANDARD'
  })
  console.log("4. svi_scores:", sErr ? `FAIL â†’ ${sErr.message}` : "âœ… SUCCESS")

  // 5. Risk indicators
  const indicatorRows = (sa.contributing_factors || []).slice(0, 10).map(ind => ({
    assessment_id: assessmentId,
    indicator_type: String(ind.factor ?? ''),
    severity: toDbRiskLevel(sa.risk_level),
    confidence: norm(Number(ind.score ?? 0)),
    evidence: String(ind.evidence ?? `Detected: ${ind.factor}`),
    source: 'nlp_engine'
  }))
  const { error: rErr } = await supabase.from('risk_indicators').insert(indicatorRows)
  console.log("5. risk_indicators:", rErr ? `FAIL → ${rErr.message}` : `✅ SUCCESS (${indicatorRows.length} rows)`)
  console.log("\n🎉 Full chain complete! Check Supabase now — data should be visible.")
}

async function cleanupTest() {
  await supabase.from('risk_indicators').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('svi_scores').delete().eq('case_id', testCaseId)
  await supabase.from('assessments').delete().eq('case_id', testCaseId)
  await supabase.from('interactions').delete().eq('case_id', testCaseId)
  await supabase.from('cases').delete().eq('id', testCaseId)
  console.log("🧹 Test rows cleaned up successfully from Supabase.")
}

if (process.argv.includes('cleanup')) {
  cleanupTest()
} else {
  runLiveTest()
}


