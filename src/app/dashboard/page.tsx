"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Target,
  FileText,
  FileSignature,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Download,
  Copy,
  DollarSign,
  Mail,
  BarChart3,
  Save,
  BookmarkCheck,
  ExternalLink,
  HelpCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { exportResumePDF, exportTextPDF } from '@/lib/exportPdf';
import { saveApplication, addTrackerJob } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';

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

  const pts = values.map((v, i) => point(i, v));
  const polyPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  const rings = [20, 40, 60, 80, 100];

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[200px] mx-auto">
      {/* Grid rings */}
      {rings.map(ring => {
        const ringPts = labels.map((_, i) => {
          const a = angle(i);
          const dist = (ring / 100) * r;
          return `${cx + dist * Math.cos(a)},${cy + dist * Math.sin(a)}`;
        }).join(' ');
        return (
          <polygon key={ring} points={ringPts} fill="none"
            stroke="var(--border-custom)" strokeWidth="1" />
        );
      })}

      {/* Axis lines */}
      {labels.map((_, i) => {
        const op = outerPoint(i);
        return <line key={i} x1={cx} y1={cy} x2={op.x.toFixed(1)} y2={op.y.toFixed(1)}
          stroke="var(--border-custom)" strokeWidth="1" />;
      })}

      {/* Data polygon */}
      <path d={polyPath} fill="var(--glow)" stroke="var(--primary)" strokeWidth="2" />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--primary)" />
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
            fontSize="8" fill="var(--text-muted)" className="font-bold">{nice}</text>
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
    <div className="w-full bg-bg-main rounded-full h-1.5 mb-6 overflow-hidden border border-border-custom/30 shadow-inner">
      <div
        className="h-full bg-primary transition-all duration-1000 ease-out shadow-sm"
        style={{ width: `${progress}%`, backgroundColor: 'var(--primary)' }}
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
    <div className="fixed bottom-6 right-6 z-50 bg-primary text-bg-card px-4 py-3 rounded-2xl shadow-custom-card text-xs font-black flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300">
      <CheckCircle2 className="w-4 h-4" /> {message}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const runQuery = searchParams.get('run');

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

    // Check if we already have calculated results and aren't explicitly requested to run again
    const cachedResults = localStorage.getItem('aijf_current_results');
    if (runQuery !== 'true' && cachedResults) {
      try {
        const data = JSON.parse(cachedResults);
        setResults(data);
        setIsLive(data.isLive === true);
        setModelUsed(data.modelUsed || '');
        setAgents(prev => prev.map(a => ({ ...a, status: 'done' })));
        setIsComplete(true);
        return;
      } catch (e) {
        // Fallback to error or re-run
      }
    }

    if (!resumeText || !jobDescription) {
      setError('Missing resume or job description. Please go back and upload your resume on the Apply Wizard.');
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

        // Cache results locally
        localStorage.setItem('aijf_current_results', JSON.stringify(data));

        setResults(data);
        setIsLive(data.isLive === true);
        setModelUsed(data.modelUsed || '');
        setAgents(prev => prev.map(a => ({ ...a, status: 'done' })));
        setIsComplete(true);
        setIsRunning(false);

        // Clean URL search param
        router.replace('/dashboard');
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
        setAgents(prev => prev.map(a => ({ ...a, status: 'error' })));
        setIsRunning(false);
      }
    };

    runPipeline();
  }, [runQuery, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => setToast(`${label} copied!`));
  };

  const handleSaveApplication = () => {
    if (!results || isSaved) return;
    const jobDescription = localStorage.getItem('jobDescription') || '';
    const resumeText = localStorage.getItem('resumeText') || '';

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
      <div className="min-h-screen bg-bg-main text-text-main flex items-center justify-center p-6">
        <div className="bg-bg-card shadow-custom-card p-8 rounded-3xl max-w-lg text-center">
          <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <Target className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-black mb-3 text-text-main">Pipeline Failed</h2>
          <p className="text-text-muted text-xs leading-relaxed whitespace-pre-line mb-6 bg-bg-main p-4 rounded-2xl border border-border-custom/40">{error}</p>
          <div className="flex flex-col gap-3">
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
              className="bg-primary hover:bg-primary-hover text-bg-card px-6 py-2.5 rounded-2xl font-bold transition-all text-xs shadow-sm">
              Get a Free Gemini API Key →
            </a>
            <Link href="/apply" className="text-text-muted hover:text-text-main text-xs transition-colors font-bold">
              ← Go Back & Try Again
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        
        {/* Left Sidebar: Pipeline Status */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-bg-card shadow-custom-card rounded-3xl p-5 sticky top-6">
            <h2 className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-4">Agent Pipeline</h2>
            <ProgressBar isRunning={isRunning} isComplete={isComplete} />

            <div className="space-y-4">
              {agents.map((agent, i) => (
                <div key={agent.id} className="relative">
                  {i !== agents.length - 1 && (
                    <div className={`absolute left-3.5 top-7 bottom-[-16px] w-[2px] ${agent.status === 'done' ? 'bg-primary' : 'bg-border-custom/40'}`}></div>
                  )}
                  <div className={`flex items-center gap-3.5 ${agent.status === 'pending' ? 'opacity-40' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center relative z-10 text-xs border
                      ${agent.status === 'done' ? 'bg-primary text-bg-card border-transparent shadow-sm' :
                        agent.status === 'running' ? 'bg-primary/10 text-primary border-primary/20 animate-pulse' :
                        agent.status === 'error' ? 'bg-red-500 text-white border-transparent' :
                        'bg-bg-main text-text-muted border-border-custom/50 shadow-inner'}`}>
                      {agent.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                       agent.status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                       <agent.icon className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-bold ${agent.status === 'running' ? 'text-primary' : agent.status === 'error' ? 'text-red-500' : 'text-text-muted'}`}>
                      {agent.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {isComplete && !isSaved && (
              <button onClick={handleSaveApplication}
                className="mt-6 w-full bg-primary hover:bg-primary-hover text-bg-card py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm">
                <Save className="w-4 h-4" /> Save Package
              </button>
            )}
            {isSaved && (
              <div className="mt-6 w-full bg-green-500/10 border border-green-500/20 text-green-500 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5">
                <BookmarkCheck className="w-4 h-4" /> Saved!
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 w-full">
          {!isComplete && (
            <div className="bg-bg-card shadow-custom-card rounded-3xl flex flex-col items-center justify-center text-center py-24 px-6 min-h-[500px]">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-border-custom/40 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                <Target className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
              </div>
              <h2 className="text-lg font-black mb-2 text-text-main">AI Agents running...</h2>
              <p className="text-text-muted text-xs max-w-sm mx-auto leading-relaxed">
                Analyzing skill matches, projecting salary ranges, rewriting bullets, and generating interview coaches in parallel.
              </p>
            </div>
          )}

          {isComplete && results && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

              {/* Row 1: Match Score + Radar + Salary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Match Score */}
                <div className="bg-bg-card shadow-custom-card rounded-3xl p-6 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border-custom)" strokeWidth="8" />
                      <circle cx="48" cy="48" r="40" fill="none"
                        stroke="var(--primary)" strokeWidth="8"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * (results.gap?.score || 0)) / 100}
                        style={{ stroke: 'var(--primary)' }}
                        className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-text-main">{results.gap?.score || 0}%</span>
                      <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Match</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center mt-1">
                      {results.gap?.matched?.slice(0, 2).map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 bg-green-500/10 text-green-600 text-[10px] rounded border border-green-500/20 font-bold">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Radar Chart */}
                {results.radar && (
                  <div className="bg-bg-card shadow-custom-card rounded-3xl p-4 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Skill Radar</p>
                    <RadarChart data={results.radar} />
                  </div>
                )}

                {/* Salary */}
                {results.salary && results.salary.min > 0 && (
                  <div className="bg-bg-card shadow-custom-card rounded-3xl p-6 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                        <DollarSign className="w-4.5 h-4.5 text-emerald-500" />
                      </div>
                      <p className="text-xs font-bold text-text-muted">Compensation Projection</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-emerald-550 leading-none">
                        ${(results.salary.min / 1000).toFixed(0)}k — ${(results.salary.max / 1000).toFixed(0)}k
                      </p>
                      <p className="text-[9px] text-text-muted mt-1 font-bold">{results.salary.basis} · {results.salary.currency}</p>
                      <p className="text-[10px] text-text-muted mt-3 leading-relaxed">{results.salary.note}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Gap Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-bg-card shadow-custom-card rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-text-muted mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Matched Skills
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {results.gap?.matched?.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded border border-green-500/20 font-bold">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-bg-card shadow-custom-card rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-text-muted mb-3 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-red-500" /> Skills to Add
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {results.gap?.missing?.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20 font-bold">{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Missing Skills Answer Strategies */}
              {results.gap?.missingStrategies && results.gap.missingStrategies.length > 0 && (
                <div className="bg-bg-card shadow-custom-card rounded-3xl p-5">
                  <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                    <HelpCircle className="w-4.5 h-4.5 text-primary" />
                    How to Answer for Missing Skills (Interview Pivot Scripts)
                  </h3>
                  <div className="space-y-3">
                    {results.gap.missingStrategies.map((item: any, idx: number) => (
                      <div key={idx} className="bg-bg-main p-4 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3 group border border-border-custom/20">
                        <div className="flex-1">
                          <div className="mb-2">
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-bold rounded border border-red-500/20">
                              Lacking: {item.skill}
                            </span>
                          </div>
                          <p className="text-xs text-text-main leading-relaxed italic">
                            "{item.strategy}"
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.strategy, `${item.skill} Pivot`)}
                          className="self-end sm:self-start p-1.5 bg-bg-card hover:bg-bg-main text-text-muted hover:text-text-main rounded-xl border border-border-custom/40 transition-all flex items-center gap-1 text-[9px] font-bold shadow-sm"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Script
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Nav Tabs */}
              <div className="flex border-b border-border-custom/50 overflow-x-auto hide-scrollbar">
                {[
                  { id: 'resume', label: 'ATS Resume' },
                  { id: 'cover', label: 'Cover Letter' },
                  { id: 'email', label: 'Email Templates' },
                  { id: 'coach', label: 'Interview Q&A' },
                  { id: 'gap_explainer', label: results.gapExplainer?.hasGap ? '⚠ Gap Explainer' : '✓ Gap Explainer' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-xs font-black whitespace-nowrap transition-colors border-b-2 uppercase tracking-wider ${
                      activeTab === tab.id ? 'border-primary text-primary' :
                      tab.id === 'gap_explainer' && results.gapExplainer?.hasGap ? 'border-transparent text-amber-500 hover:text-amber-600' :
                      'border-transparent text-text-muted hover:text-text-main'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content Panel */}
              <div className="bg-bg-card shadow-custom-card rounded-3xl p-6 min-h-[400px] relative group">

                {/* Floating copy buttons */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === 'resume' && (
                    <>
                      <button onClick={() => copyToClipboard(results.resume, 'Resume')}
                        className="p-2 bg-bg-main hover:bg-bg-card text-text-muted hover:text-text-main rounded-xl border border-border-custom/55 transition-colors shadow-sm" title="Copy text">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={handleDownloadResumePDF}
                        className="p-2 bg-primary hover:bg-primary-hover text-bg-card rounded-xl font-bold transition-all flex items-center gap-1.5 px-3 text-xs shadow-sm" title="Download PDF">
                        <Download className="w-4 h-4" /> <span>PDF</span>
                      </button>
                    </>
                  )}
                  {activeTab === 'cover' && (
                    <>
                      <button onClick={() => copyToClipboard(results.cover, 'Cover letter')}
                        className="p-2 bg-bg-main hover:bg-bg-card text-text-muted hover:text-text-main rounded-xl border border-border-custom/55 transition-colors shadow-sm" title="Copy text">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={handleDownloadCoverPDF}
                        className="p-2 bg-primary hover:bg-primary-hover text-bg-card rounded-xl font-bold transition-all flex items-center gap-1.5 px-3 text-xs shadow-sm" title="Download PDF">
                        <Download className="w-4 h-4" /> <span>PDF</span>
                      </button>
                    </>
                  )}
                </div>

                {activeTab === 'resume' && (
                  <div className="whitespace-pre-wrap font-mono text-xs text-text-main leading-relaxed max-w-none bg-bg-main/30 p-4 rounded-2xl border border-border-custom/20">
                    {results.resume}
                  </div>
                )}

                {activeTab === 'cover' && (
                  <div className="whitespace-pre-wrap font-sans text-xs text-text-main leading-relaxed bg-bg-main/30 p-5 rounded-2xl border border-border-custom/20">
                    {results.cover}
                  </div>
                )}

                {activeTab === 'email' && results.email && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-primary" /> Follow-Up Email
                          <span className="text-[9px] text-text-muted font-bold">(Send 5 days after application)</span>
                        </h3>
                        <button onClick={() => copyToClipboard(results.email.followUp, 'Follow-up email')}
                          className="text-[9px] font-bold flex items-center gap-1 bg-bg-main hover:bg-bg-card text-text-muted hover:text-text-main px-2.5 py-1.5 rounded-xl border border-border-custom/40 transition-all shadow-sm">
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </div>
                      <div className="bg-bg-main border border-border-custom/20 rounded-2xl p-4 whitespace-pre-wrap text-xs text-text-main leading-relaxed font-sans">
                        {results.email.followUp}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                          <ExternalLink className="w-4 h-4 text-accent" /> LinkedIn Cold Outreach
                          <span className="text-[9px] text-text-muted font-bold">(Send direct to Recruiter)</span>
                        </h3>
                        <button onClick={() => copyToClipboard(results.email.coldOutreach, 'Cold outreach')}
                          className="text-[9px] font-bold flex items-center gap-1 bg-bg-main hover:bg-bg-card text-text-muted hover:text-text-main px-2.5 py-1.5 rounded-xl border border-border-custom/40 transition-all shadow-sm">
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </div>
                      <div className="bg-bg-main border border-border-custom/20 rounded-2xl p-4 whitespace-pre-wrap text-xs text-text-main leading-relaxed font-sans">
                        {results.email.coldOutreach}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'coach' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-text-muted text-[10px] font-bold">Custom mock interview Q&As tailored specifically for this application.</p>
                      <button onClick={() => copyToClipboard(
                        results.coach?.map((qa: any, i: number) => `Q${i + 1}: ${qa.q}\nA: ${qa.a}`).join('\n\n'),
                        'Interview Q&As'
                      )} className="text-[9px] font-bold flex items-center gap-1 bg-bg-main hover:bg-bg-card text-text-muted hover:text-text-main px-2.5 py-1.5 rounded-xl border border-border-custom/40 transition-all shadow-sm">
                        <Copy className="w-3.5 h-3.5" /> Copy All
                      </button>
                    </div>
                    {results.coach?.map((qa: any, i: number) => (
                      <div key={i} className="bg-bg-main p-4 rounded-2xl border border-border-custom/25">
                        <p className="font-bold text-primary text-xs mb-1.5 flex items-start gap-1"><Clock className="w-4 h-4 flex-shrink-0" /> Q{i + 1}: {qa.q}</p>
                        <p className="text-xs text-text-muted leading-relaxed pl-5 font-semibold"><strong>Coaching script:</strong> {qa.a}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'gap_explainer' && results.gapExplainer && (
                  <div className="space-y-6">
                    {/* Status Banner */}
                    {results.gapExplainer.hasGap ? (
                      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3">
                        <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                        <div>
                          <p className="text-amber-600 font-bold text-xs">Employment gap detected on timeline</p>
                          <p className="text-text-muted text-[10px] mt-0.5">We've written a paragraph to overlay in your cover letter and a coaching guide for interview questions.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/25 rounded-2xl px-4 py-3">
                        <span className="text-green-500 text-sm mt-0.5">✓</span>
                        <div>
                          <p className="text-green-600 font-bold text-xs">No significant employment gap found</p>
                          <p className="text-text-muted text-[10px] mt-0.5">Your timeline appears complete. See general advice below to pre-emptively guide recruiter audits.</p>
                        </div>
                      </div>
                    )}

                    {/* Recruiter-Facing Paragraph */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xs font-bold text-text-main">📄 Cover Letter Insert</h3>
                        </div>
                        <button
                          onClick={() => copyToClipboard(results.gapExplainer.coverParagraph, 'Gap paragraph')}
                          className="text-[9px] font-bold flex items-center gap-1 bg-bg-main hover:bg-bg-card text-text-muted hover:text-text-main px-2.5 py-1.5 rounded-xl border border-border-custom/40 transition-all shadow-sm">
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                      </div>
                      <div className="bg-bg-main border border-primary/20 rounded-2xl p-4 whitespace-pre-wrap font-sans text-xs text-text-main leading-relaxed relative shadow-inner">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary rounded-l-xl opacity-60" />
                        <div className="pl-3">{results.gapExplainer.coverParagraph}</div>
                      </div>
                    </div>

                    {/* Private Coaching Note */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xs font-bold text-text-main">🔒 Career Guide Coaching Note</h3>
                        <span className="text-[9px] bg-bg-main border border-border-custom/40 text-text-muted px-2 py-0.5 rounded-full font-bold">Candidate eyes only</span>
                      </div>
                      <div className="bg-bg-main border border-border-custom/25 rounded-2xl p-4 whitespace-pre-wrap font-sans text-xs text-text-muted leading-relaxed font-medium">
                        {results.gapExplainer.coachingNote}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Back link */}
              <div className="flex justify-center pt-2">
                <Link href="/apply" className="text-text-muted hover:text-text-main text-xs transition-colors font-bold">
                  ← Start a new application wizard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="bg-bg-card shadow-custom-card rounded-3xl flex flex-col items-center justify-center text-center py-24 px-6 min-h-[500px]">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-border-custom/45 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            <Target className="absolute inset-0 m-auto w-7 h-7 text-primary animate-pulse" />
          </div>
          <h2 className="text-lg font-black mb-2 text-text-main">Loading Workspace...</h2>
        </div>
      </AppLayout>
    }>
      <DashboardContent />
    </Suspense>
  );
}
