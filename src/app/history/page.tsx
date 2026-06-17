"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Trash2, ExternalLink, ChevronRight, FileText, Award, Calendar } from 'lucide-react';
import { listApplications, deleteApplication, SavedApplication } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-green-600 bg-green-500/10 border-green-550/20'
    : score >= 50 ? 'text-yellow-605 bg-yellow-500/10 border-yellow-550/20'
    : 'text-red-500 bg-red-500/10 border-red-550/20';
  return <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${color}`}>{score}% Match</span>;
}

function ApplicationCard({ app, onDelete, onExpand }: {
  app: SavedApplication;
  onDelete: () => void;
  onExpand: () => void;
}) {
  return (
    <div className="bg-bg-card shadow-custom-card rounded-3xl p-5 hover:scale-[1.01] transition-all group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 group-hover:bg-primary transition-all" />
      
      <div className="flex items-start justify-between gap-4 pl-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h2 className="text-sm font-black text-text-main truncate group-hover:text-primary transition-colors">{app.jobTitle || 'Untitled Role'}</h2>
            <ScoreBadge score={app.matchScore} />
          </div>
          {app.company && <p className="text-xs text-text-muted font-bold">{app.company}</p>}
          <div className="flex items-center gap-3 mt-3 text-[9px] text-text-muted font-bold">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(app.savedAt).toLocaleDateString()}</span>
            {app.jobUrl && (
              <a href={app.jobUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View Posting
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onExpand}
            className="bg-primary hover:bg-primary-hover text-bg-card px-3.5 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm flex items-center gap-1">
            View Package <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Mini stats */}
      <div className="mt-4 pt-3 border-t border-border-custom/30 flex flex-wrap gap-4 text-[9px] text-text-muted pl-1 font-bold">
        {app.results.gap?.matched?.length > 0 && (
          <span className="flex items-center gap-1 text-green-600">
            <Award className="w-3.5 h-3.5" /> {app.results.gap.matched.length} matched skills
          </span>
        )}
        {app.results.resume && (
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-primary" /> Bullet Rewrite
          </span>
        )}
        {app.results.coach?.length > 0 && (
          <span className="flex items-center gap-1">
            💬 {app.results.coach.length} interview Q&As
          </span>
        )}
        {app.results.salary && app.results.salary.min > 0 && (
          <span className="flex items-center gap-1 text-emerald-600">
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
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-bg-card border-l border-border-custom/50 shadow-custom-card overflow-y-auto flex flex-col animate-in slide-in-from-right duration-250">
        <div className="sticky top-0 bg-bg-card border-b border-border-custom/50 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-black text-sm text-text-main">{app.jobTitle}</h2>
            <p className="text-[10px] text-text-muted font-bold mt-0.5">{new Date(app.savedAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl leading-none">&times;</button>
        </div>

        <div className="flex border-b border-border-custom/50 overflow-x-auto">
          {[
            { id: 'resume', label: 'Resume' },
            { id: 'cover', label: 'Cover Letter' },
            { id: 'coach', label: 'Interview Q&A' },
            ...(app.results.email ? [{ id: 'email', label: 'Emails' }] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs font-black whitespace-nowrap border-b-2 uppercase tracking-wider transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 flex-1 bg-bg-main">
          {tab === 'resume' && (
            <pre className="whitespace-pre-wrap font-mono text-xs text-text-main leading-relaxed bg-bg-card p-4 rounded-2xl border border-border-custom/25 shadow-sm">{app.results.resume}</pre>
          )}
          {tab === 'cover' && (
            <div className="whitespace-pre-wrap font-sans text-xs text-text-main leading-relaxed bg-bg-card p-5 rounded-2xl border border-border-custom/25 shadow-sm">{app.results.cover}</div>
          )}
          {tab === 'coach' && (
            <div className="space-y-4">
              {app.results.coach?.map((qa, i) => (
                <div key={i} className="bg-bg-card p-4 rounded-2xl border border-border-custom/25 shadow-sm">
                  <p className="font-bold text-primary text-xs mb-1">Q{i + 1}: {qa.q}</p>
                  <p className="text-xs text-text-muted leading-relaxed pl-5 font-semibold">{qa.a}</p>
                </div>
              ))}
            </div>
          )}
          {tab === 'email' && app.results.email && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider mb-2 text-text-muted">Follow-Up Email</h3>
                <div className="bg-bg-card p-4 rounded-2xl border border-border-custom/25 whitespace-pre-wrap text-xs text-text-main leading-relaxed shadow-sm">
                  {app.results.email.followUp}
                </div>
              </div>
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider mb-2 text-text-muted">LinkedIn Outreach</h3>
                <div className="bg-bg-card p-4 rounded-2xl border border-border-custom/25 whitespace-pre-wrap text-xs text-text-main leading-relaxed shadow-sm">
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
    <AppLayout>
      {expanded && <ApplicationDrawer app={expanded} onClose={() => setExpanded(null)} />}

      <div className="flex flex-col h-full space-y-6">
        
        {/* Header Board Summary */}
        <div className="flex items-center justify-between pb-4 border-b border-border-custom/50">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2 text-text-main">
              <Sparkles className="w-5 h-5 text-primary" />
              Saved Applications
            </h1>
            <p className="text-xs text-text-muted mt-0.5 font-semibold">{apps.length} application{apps.length !== 1 ? 's' : ''} saved locally in your archive.</p>
          </div>
          <Link href="/apply" className="bg-primary hover:bg-primary-hover text-bg-card px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
            + New Application
          </Link>
        </div>

        {apps.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border-custom rounded-3xl bg-bg-card/40 shadow-custom-card">
            <FileText className="w-10 h-10 text-text-muted mx-auto mb-4" />
            <h2 className="text-base font-bold text-text-main mb-1">No archived applications yet</h2>
            <p className="text-xs text-text-muted mb-6">Archived applications and custom cover letters will appear here.</p>
            <Link href="/apply" className="bg-primary hover:bg-primary-hover text-bg-card px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">
              Build your first package
            </Link>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl">
            {apps.map(app => (
              <ApplicationCard key={app.id} app={app}
                onDelete={() => handleDelete(app.id)}
                onExpand={() => setExpanded(app)} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
