"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Trash2, ExternalLink, ChevronRight, FileText, Award, Calendar } from 'lucide-react';
import { listApplications, deleteApplication, SavedApplication } from '@/lib/storage';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : score >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';
  return <span className={`text-sm px-2 py-0.5 rounded border font-semibold ${color}`}>{score}%</span>;
}

function ApplicationCard({ app, onDelete, onExpand }: {
  app: SavedApplication;
  onDelete: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-base font-semibold text-slate-100 truncate">{app.jobTitle || 'Untitled Role'}</h2>
            <ScoreBadge score={app.matchScore} />
          </div>
          {app.company && <p className="text-sm text-slate-500">{app.company}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(app.savedAt).toLocaleDateString()}</span>
            {app.jobUrl && (
              <a href={app.jobUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-indigo-400 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View Job
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onExpand}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
            View <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
        {app.results.gap?.matched?.length > 0 && (
          <span className="flex items-center gap-1 text-green-500">
            <Award className="w-3.5 h-3.5" /> {app.results.gap.matched.length} matched skills
          </span>
        )}
        {app.results.resume && (
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> Resume rewritten
          </span>
        )}
        {app.results.coach?.length > 0 && (
          <span className="flex items-center gap-1">
            💬 {app.results.coach.length} interview Q&As
          </span>
        )}
        {app.results.salary && app.results.salary.min > 0 && (
          <span className="flex items-center gap-1 text-emerald-500">
            💰 ${(app.results.salary.min / 1000).toFixed(0)}k–${(app.results.salary.max / 1000).toFixed(0)}k
          </span>
        )}
      </div>
    </div>
  );
}

function ApplicationDrawer({ app, onClose }: { app: SavedApplication; onClose: () => void }) {
  const [tab, setTab] = useState('resume');

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-slate-950 border-l border-slate-800 overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-lg">{app.jobTitle}</h2>
            <p className="text-xs text-slate-500">{new Date(app.savedAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="flex border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'resume', label: 'Resume' },
            { id: 'cover', label: 'Cover Letter' },
            { id: 'coach', label: 'Interview Q&A' },
            ...(app.results.email ? [{ id: 'email', label: 'Emails' }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 flex-1">
          {tab === 'resume' && (
            <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed">{app.results.resume}</pre>
          )}
          {tab === 'cover' && (
            <div className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">{app.results.cover}</div>
          )}
          {tab === 'coach' && (
            <div className="space-y-4">
              {app.results.coach?.map((qa, i) => (
                <div key={i} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="font-semibold text-indigo-300 mb-1">Q{i + 1}: {qa.q}</p>
                  <p className="text-sm text-slate-400">{qa.a}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'email' && app.results.email && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">Follow-Up Email</h3>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap text-sm text-slate-300">
                  {app.results.email.followUp}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-slate-200">Cold Outreach</h3>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 whitespace-pre-wrap text-sm text-slate-300">
                  {app.results.email.coldOutreach}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [apps, setApps] = useState<SavedApplication[]>([]);
  const [expanded, setExpanded] = useState<SavedApplication | null>(null);

  useEffect(() => {
    setApps(listApplications());
  }, []);

  const handleDelete = (id: string) => {
    deleteApplication(id);
    setApps(prev => prev.filter(a => a.id !== id));
    if (expanded?.id === id) setExpanded(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {expanded && <ApplicationDrawer app={expanded} onClose={() => setExpanded(null)} />}

      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> AI Job Factory
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 font-medium">History</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/tracker" className="text-sm text-slate-400 hover:text-white transition-colors">Tracker</Link>
            <Link href="/apply" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              + New Application
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Saved Applications</h1>
          <p className="text-slate-400 mt-1">{apps.length} application{apps.length !== 1 ? 's' : ''} saved. Click any card to review the full package.</p>
        </div>

        {apps.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-800 rounded-2xl">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-400 mb-2">No saved applications yet</h2>
            <p className="text-slate-600 mb-6">After running the AI agents, click "Save Application" to preserve your package here.</p>
            <Link href="/apply" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors">
              Create your first application →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {apps.map(app => (
              <ApplicationCard key={app.id} app={app}
                onDelete={() => handleDelete(app.id)}
                onExpand={() => setExpanded(app)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
