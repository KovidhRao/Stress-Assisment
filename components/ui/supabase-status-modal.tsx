'use client'

import React, { useState, useEffect } from 'react'
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Table,
  Layers,
  X,
  Code2
} from 'lucide-react'
import { checkSupabaseConnection } from '@/lib/supabase-service'

interface SupabaseStatusModalProps {
  isOpen: boolean
  onClose: () => void
}

const SQL_SCHEMA_SNIPPET = `-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'victim' CHECK (role IN ('victim', 'officer', 'counsellor', 'admin')),
  gender TEXT,
  age_group TEXT,
  state TEXT,
  district TEXT,
  preferred_language TEXT DEFAULT 'English',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  is_profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles access" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  victim_name TEXT NOT NULL,
  initials TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  contact_number TEXT,
  incident_category TEXT NOT NULL,
  incident_location JSONB NOT NULL DEFAULT '{"village_town_city": "", "district": "", "state": ""}'::jsonb,
  channel TEXT DEFAULT 'integrated_portal',
  language TEXT DEFAULT 'English',
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  narrative_text TEXT NOT NULL,
  voice_analysis JSONB,
  stress_assessment JSONB NOT NULL,
  status TEXT DEFAULT 'New Intake',
  assigned_officer TEXT,
  assigned_counsellor TEXT,
  priority_tier INT DEFAULT 3,
  notes JSONB DEFAULT '[]'::jsonb,
  dispatched_actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public cases all" ON public.cases FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  narrative_text TEXT,
  svi_score INT NOT NULL,
  risk_level TEXT NOT NULL,
  fear_score INT DEFAULT 0,
  trauma_score INT DEFAULT 0,
  anxiety_score INT DEFAULT 0,
  voice_metrics JSONB,
  indicators JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public assessments all" ON public.assessments FOR ALL USING (true);
`

export function SupabaseStatusModal({ isOpen, onClose }: SupabaseStatusModalProps) {
  const [status, setStatus] = useState<{ ok: boolean; hasTables: boolean; message: string }>({
    ok: false,
    hasTables: false,
    message: 'Testing connection...'
  })
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  const verifyConnection = async () => {
    setChecking(true)
    const res = await checkSupabaseConnection()
    setStatus(res)
    setChecking(false)
  }

  useEffect(() => {
    if (isOpen) {
      verifyConnection()
    }
  }, [isOpen])

  const copySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Supabase Real-time Database Status</h2>
              <p className="text-xs text-slate-400">Live Auth, Profiles &amp; Cases Connectivity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Status Indicator */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            status.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              {status.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {status.ok ? 'Supabase Connected & Ready' : 'Database Setup Notice'}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">{status.message}</p>
              </div>
            </div>

            <button
              onClick={verifyConnection}
              disabled={checking}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Testing...' : 'Test Link'}</span>
            </button>
          </div>

          {/* Quick Setup Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-teal-600" /> 1-Click Database Setup SQL
              </h3>
              <button
                onClick={copySql}
                className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If your database tables are not yet created, open your Supabase project&apos;s SQL Editor and run the SQL below to initialize real-time tables:
            </p>
            <pre className="p-3.5 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
              {SQL_SCHEMA_SNIPPET}
            </pre>
          </div>

          {/* Connected Tables List */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <Table className="w-4 h-4 text-teal-600 mx-auto mb-1" />
              <p className="font-bold text-[11px] text-slate-800">profiles</p>
              <p className="text-[10px] text-slate-500">Citizen &amp; Cadre details</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <Layers className="w-4 h-4 text-teal-600 mx-auto mb-1" />
              <p className="font-bold text-[11px] text-slate-800">cases</p>
              <p className="text-[10px] text-slate-500">Real-time Triage Queue</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <Database className="w-4 h-4 text-teal-600 mx-auto mb-1" />
              <p className="font-bold text-[11px] text-slate-800">assessments</p>
              <p className="text-[10px] text-slate-500">SVI &amp; Voice analytics</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-teal-700 hover:underline font-medium"
          >
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
