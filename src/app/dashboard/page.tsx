"use client";

import { useEffect, useState, useRef } from 'react';
import {
  Target, FileText, FileSignature, MessageSquare, CheckCircle2, Loader2,
  Download, Copy, Play, DollarSign, Mail, BarChart3, Save, BookmarkCheck, ExternalLink, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { exportResumePDF, exportTextPDF } from '@/lib/exportPdf';
import { saveApplication, addTrackerJob } from '@/lib/storage';

type AgentStatus = 'pending' | 'running' | 'done' | 'error';

interface Agent {
  id: string;
  name: string;
  icon: any;
  status: AgentStatus;
}

// ── Radar Chart ──────────────────────────────────────────────────────────────
function RadarChart({ data }: { data: Record<string, number> }) {
  const labels = Object.keys(data);
  const values = Object.values(data).map(v => Math.min(100, Math.max(0, v)));
  const n = labels.length;
  const cx = 110, cy = 110, r = 80;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, val: number) => {
    const a = angle(i);
    const dist = (val / 100) * r;
    return { x: cx + dist * Math.cos(a), y: cy + dist * Math.sin(a) };
  };
  const outerPoint = (i: number) => {
    const a = angle(i);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  // Build polygon path
  const pts = values.map((v, i) => point(i, v));
  const polyPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Grid rings
  const rings = [20, 40, 60, 80, 100];

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px] mx-auto">
      {/* Grid rings */}
      {rings.map(ring => {
        const ringPts = labels.map((_, i) => {
          const a = angle(i);
          const dist = (ring / 100) * r;
          return `${cx + dist * Math.cos(a)},${cy + dist * Math.sin(a)}`;
        }).join(' ');
        return (
          <polygon key={ring} points={ringPts} fill="none"
            stroke={ring === 100 ? '#334155' : '#1e293b'} strokeWidth="1" />
        );
      })}

      {/* Axis lines */}
      {labels.map((_, i) => {
        const op = outerPoint(i);
        return <line key={i} x1={cx} y1={cy} x2={op.x.toFixed(1)} y2={op.y.toFixed(1)}
          stroke="#1e293b" strokeWidth="1" />;
      })}

      {/* Data polygon */}
      <path d={polyPath} fill="rgba(99,102,241,0.25)" stroke="#6366f1" strokeWidth="2" />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
      ))}

      {/* Labels */}
      {labels.map((label, i) => {
        const op = outerPoint(i);
        const lx = cx + (r + 18) * Math.cos(angle(i));
        const ly = cy + (r + 18) * Math.sin(angle(i));
        const nice = label.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        return (
          <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill="#94a3b8">{nice}</text>
        );
      })}

      {/* Score dots with values */}
      {values.map((v, i) => {
        const p = point(i, v);
        return (
          <title key={`t-${i}`}>{labels[i]}: {v}%</title>
        );
      })}
    </svg>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ isRunning, isComplete }: { isRunning: boolean; isComplete: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    setProgress(0);
    const steps = [
      { target: 15, delay: 500 },
      { target: 35, delay: 3000 },
      { target: 60, delay: 8000 },
      { target: 80, delay: 16000 },
      { target: 92, delay: 24000 },
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({ target, delay }) => {
      timers.push(setTimeout(() => setProgress(target), delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [isRunning]);

  useEffect(() => {
    if (isComplete) setProgress(100);
  }, [isComplete]);

  if (!isRunning && !isComplete) return null;

  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <CheckCircle2 className="w-4 h-4" /> {message}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([
    { id: 'gap', name: 'Gap Analyst', icon: Target, status: 'pending' },
    { id: 'score', name: 'Score Engine', icon: BarChart3, status: 'pending' },
    { id: 'salary', name: 'Salary Estimator', icon: DollarSign, status: 'pending' },
    { id: 'resume', name: 'Resume Rewriter', icon: FileText, status: 'pending' },
    { id: 'cover', name: 'Cover Letter Writer', icon: FileSignature, status: 'pending' },
    { id: 'gap_explainer', name: 'Gap Explainer', icon: MessageSquare, status: 'pending' },
    { id: 'email', name: 'Email Drafter', icon: Mail, status: 'pending' },
    { id: 'coach', name: 'Interview Coach', icon: MessageSquare, status: 'pending' },
  ]);

  const [activeTab, setActiveTab] = useState('gap');
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [modelUsed, setModelUsed] = useState('');
  const [toast, setToast] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [fileName, setFileName] = useState('resume');
  const [jobUrl, setJobUrl] = useState('');

  useEffect(() => {
    const jobDescription = localStorage.getItem('jobDescription') || '';
    const resumeText = localStorage.getItem('resumeText') || '';
    setFileName(localStorage.getItem('fileName') || 'resume');
    setJobUrl(localStorage.getItem('jobUrl') || '');

    if (!resumeText || !jobDescription) {
      setError('Missing resume or job description. Please go back and fill in both fields.');
      setAgents(prev => prev.map(a => ({ ...a, status: 'error' })));
      return;
    }

    const runPipeline = async () => {
      setIsRunning(true);
      setAgents(prev => prev.map(a => ({ ...a, status: 'running' })));

      try {
        const res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, jobDescription }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Unknown pipeline error');

        setResults(data);
        setIsLive(data.isLive === true);
        setModelUsed(data.modelUsed || '');
        setAgents(prev => prev.map(a => ({ ...a, status: 'done' })));
        setIsComplete(true);
        setIsRunning(false);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setAgents(prev => prev.map(a => ({ ...a, status: 'error' })));
        setIsRunning(false);
      }
    };

    runPipeline();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => setToast(`${label} copied!`));
  };

  const handleSaveApplication = () => {
    if (!results || isSaved) return;
    const jobDescription = localStorage.getItem('jobDescription') || '';
    const resumeText = localStorage.getItem('resumeText') || '';

    // Extract job title/company from first line of job description
    const jdLines = jobDescription.split('\n').filter(Boolean);
    const jobTitle = jdLines[0]?.slice(0, 60) || 'Job Application';

    saveApplication({
      jobTitle,
      company: '',
      matchScore: results.gap?.score || 0,
      jobUrl,
      resumeText,
      jobDescription,
      results: {
        gap: results.gap,
        resume: results.resume,
        cover: results.cover,
        coach: results.coach,
        salary: results.salary || null,
        email: results.email || null,
        radar: results.radar || null,
        gapExplainer: results.gapExplainer || null,
      },
    });

    addTrackerJob({
      jobTitle,
      company: '',
      matchScore: results.gap?.score || 0,
      jobUrl,
      status: 'saved',
      notes: '',
      applicationId: null,
    });

    setIsSaved(true);
    setToast('Application saved to history & tracker!');
  };

  const handleDownloadResumePDF = async () => {
    if (!results?.resume) return;
    setToast('Generating PDF...');
    try {
      await exportResumePDF(results.resume, fileName);
      setToast('Resume PDF downloaded!');
    } catch (e) {
      setToast('PDF export failed — try copy instead');
    }
  };

  const handleDownloadCoverPDF = async () => {
    if (!results?.cover) return;
    await exportTextPDF(results.cover, 'Cover Letter', `${fileName}_cover_letter`);
    setToast('Cover letter PDF downloaded!');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-2xl max-w-lg text-center">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-3">Pipeline Failed</h2>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line mb-6 bg-slate-950 p-4 rounded-lg border border-slate-800">{error}</p>
          <div className="flex flex-col gap-3">
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm">
              Get a Free Gemini API Key →
            </a>
            <Link href="/apply" className="text-slate-400 hover:text-white text-sm transition-colors">
              ← Go Back & Try Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 flex flex-col">
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            AI Job Factory
          </Link>
          <div className="flex gap-2 items-center">
            <Link href="/tracker" className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors flex items-center gap-1">
              Job Tracker
            </Link>
            <Link href="/history" className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors flex items-center gap-1">
              History
            </Link>
            {isComplete && (
              <div className={`text-xs px-3 py-1 rounded-full font-medium ${isLive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                {isLive ? '✦ Live AI Results' : '⚠ Demo Mode'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full px-4 py-8 gap-8">

        {/* Left Sidebar: Pipeline Status */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-24">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Live Agent Pipeline</h2>
            <ProgressBar isRunning={isRunning} isComplete={isComplete} />

            <div className="space-y-4">
              {agents.map((agent, i) => (
                <div key={agent.id} className="relative">
                  {i !== agents.length - 1 && (
                    <div className={`absolute left-4 top-8 bottom-[-16px] w-[2px] ${agent.status === 'done' ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>
                  )}
                  <div className={`flex items-center gap-3 ${agent.status === 'pending' ? 'opacity-50' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 
                      ${agent.status === 'done' ? 'bg-indigo-500 text-white' :
                        agent.status === 'running' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' :
                        agent.status === 'error' ? 'bg-red-500 text-white' :
                        'bg-slate-800 text-slate-500'}`}>
                      {agent.status === 'done' ? <CheckCircle2 className="w-4 h-4" /> :
                       agent.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> :
                       <agent.icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm font-medium ${agent.status === 'running' ? 'text-indigo-400' : agent.status === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                      {agent.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {isComplete && !isSaved && (
              <button onClick={handleSaveApplication}
                className="mt-6 w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Application
              </button>
            )}
            {isSaved && (
              <div className="mt-6 w-full bg-green-500/10 border border-green-500/20 text-green-400 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <BookmarkCheck className="w-4 h-4" /> Saved!
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {!isComplete && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                <Target className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold mb-2">8 Agents are working...</h2>
              <p className="text-slate-400 max-w-md mx-auto">Analyzing your fit, estimating salary, rewriting your resume, explaining any employment gaps, drafting emails, and generating interview prep.</p>
            </div>
          )}

          {isComplete && results && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

              {/* Row 1: Match Score + Radar + Salary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Match Score */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-800" />
                      <circle cx="56" cy="56" r="48" fill="none" stroke="currentColor" strokeWidth="10"
                        strokeDasharray="301.6"
                        strokeDashoffset={301.6 - (301.6 * (results.gap?.score || 0)) / 100}
                        className="text-indigo-500 transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold">{results.gap?.score || 0}%</span>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Match</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center mt-2">
                      {results.gap?.matched?.slice(0, 3).map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Radar Chart */}
                {results.radar && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Skill Radar</p>
                    <RadarChart data={results.radar} />
                  </div>
                )}

                {/* Salary */}
                {results.salary && results.salary.min > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">Salary Estimate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">
                        ${(results.salary.min / 1000).toFixed(0)}k — ${(results.salary.max / 1000).toFixed(0)}k
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{results.salary.basis} · {results.salary.currency}</p>
                      <p className="text-xs text-slate-400 mt-3 leading-relaxed">{results.salary.note}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gap Detail Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> Matched Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {results.gap?.matched?.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-1">
                    <Target className="w-4 h-4 text-red-400" /> Skills to Add
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {results.gap?.missing?.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded border border-red-500/20">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Missing Skills Answer Strategies */}
              {results.gap?.missingStrategies && results.gap.missingStrategies.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mt-4">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    How to Answer for Missing Skills (Interview Pivot Strategies)
                  </h3>
                  <div className="space-y-3">
                    {results.gap.missingStrategies.map((item: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row sm:items-start justify-between gap-3 group/item">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded border border-red-500/20">
                              Lacking: {item.skill}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed italic">
                            "{item.strategy}"
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.strategy, `${item.skill} Strategy`)}
                          className="self-end sm:self-start p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
                          title="Copy Strategy Script"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Script
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex border-b border-slate-800 overflow-x-auto hide-scrollbar">
                {[
                  { id: 'resume', label: 'ATS Resume' },
                  { id: 'cover', label: 'Cover Letter' },
                  { id: 'email', label: 'Email Templates' },
                  { id: 'coach', label: 'Interview Q&A' },
                  { id: 'gap_explainer', label: results.gapExplainer?.hasGap ? '⚠ Gap Explainer' : '✓ Gap Explainer' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === tab.id ? 'border-indigo-500 text-indigo-400' :
                      tab.id === 'gap_explainer' && results.gapExplainer?.hasGap ? 'border-transparent text-amber-400 hover:text-amber-200' :
                      'border-transparent text-slate-400 hover:text-slate-200'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[400px] relative group">

                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === 'resume' && (
                    <>
                      <button onClick={() => copyToClipboard(results.resume, 'Resume')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors" title="Copy text">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={handleDownloadResumePDF}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors flex items-center gap-1 px-3" title="Download PDF">
                        <Download className="w-4 h-4" /> <span className="text-xs font-medium">PDF</span>
                      </button>
                    </>
                  )}
                  {activeTab === 'cover' && (
                    <>
                      <button onClick={() => copyToClipboard(results.cover, 'Cover letter')}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors" title="Copy text">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={handleDownloadCoverPDF}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors flex items-center gap-1 px-3" title="Download PDF">
                        <Download className="w-4 h-4" /> <span className="text-xs font-medium">PDF</span>
                      </button>
                    </>
                  )}
                </div>

                {activeTab === 'resume' && (
                  <div className="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed">
                    {results.resume}
                  </div>
                )}

                {activeTab === 'cover' && (
                  <div className="whitespace-pre-wrap font-sans text-base text-slate-300 leading-relaxed">
                    {results.cover}
                  </div>
                )}

                {activeTab === 'email' && results.email && (
                  <div className="space-y-6">
                    {/* Follow-up Email */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-white flex items-center gap-2">
                          <Mail className="w-4 h-4 text-indigo-400" /> Follow-Up Email
                          <span className="text-xs text-slate-500 font-normal">(Send 5 days after applying)</span>
                        </h3>
                        <button onClick={() => copyToClipboard(results.email.followUp, 'Follow-up email')}
                          className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-md transition-colors">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
                        {results.email.followUp}
                      </div>
                    </div>

                    {/* Cold Outreach */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-white flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-purple-400" /> LinkedIn Cold Outreach
                          <span className="text-xs text-slate-500 font-normal">(Message a recruiter directly)</span>
                        </h3>
                        <button onClick={() => copyToClipboard(results.email.coldOutreach, 'Cold outreach')}
                          className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-md transition-colors">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
                        {results.email.coldOutreach}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'coach' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm">Likely questions based on your background and this role.</p>
                      <button onClick={() => copyToClipboard(
                        results.coach?.map((qa: any, i: number) => `Q${i + 1}: ${qa.q}\nA: ${qa.a}`).join('\n\n'),
                        'Interview Q&A'
                      )} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-md transition-colors">
                        <Copy className="w-3 h-3" /> Copy All
                      </button>
                    </div>
                    {results.coach?.map((qa: any, i: number) => (
                      <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="font-semibold text-indigo-300 mb-2">Q{i + 1}: {qa.q}</p>
                        <p className="text-sm text-slate-400"><strong>Strategy:</strong> {qa.a}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'gap_explainer' && results.gapExplainer && (
                  <div className="space-y-6 pt-2">
                    {/* Status Banner */}
                    {results.gapExplainer.hasGap ? (
                      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
                        <span className="text-amber-400 text-lg mt-0.5">⚠</span>
                        <div>
                          <p className="text-amber-300 font-semibold text-sm">Employment gap detected in your resume</p>
                          <p className="text-amber-200/60 text-xs mt-0.5">We've written a confident paragraph to address it with the recruiter, and a private coaching note just for you.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
                        <span className="text-green-400 text-lg mt-0.5">✓</span>
                        <div>
                          <p className="text-green-300 font-semibold text-sm">No significant employment gap detected</p>
                          <p className="text-green-200/60 text-xs mt-0.5">Your resume timeline looks clean. See the coaching note below to stay proactive.</p>
                        </div>
                      </div>
                    )}

                    {/* Recruiter-Facing Paragraph */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-white">📄 Cover Letter Insert</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Add this paragraph to your cover letter — written to address the gap professionally</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(results.gapExplainer.coverParagraph, 'Gap paragraph')}
                          className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md transition-colors flex-shrink-0">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="bg-slate-950 border border-indigo-500/20 rounded-xl p-5 whitespace-pre-wrap font-sans text-sm text-slate-200 leading-relaxed relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl opacity-60" />
                        <div className="pl-3">{results.gapExplainer.coverParagraph}</div>
                      </div>
                    </div>

                    {/* Private Coaching Note */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-base font-semibold text-white">🔒 Your Private Coaching Note</h3>
                        <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">Only visible to you — not for the recruiter</span>
                      </div>
                      <div className="bg-slate-950 border border-slate-700 rounded-xl p-5 whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">
                        {results.gapExplainer.coachingNote}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Back link */}
              <div className="flex justify-center">
                <Link href="/apply" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                  ← Start a new application
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
