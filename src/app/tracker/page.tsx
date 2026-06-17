"use client";

import { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { listTrackerJobs, updateTrackerJob, deleteTrackerJob, addTrackerJob, TrackerJob } from '@/lib/storage';
import AppLayout from '@/components/AppLayout';

type Column = {
  id: TrackerJob['status'];
  label: string;
  color: string;
  bg: string;
  border: string;
};

const COLUMNS: Column[] = [
  { id: 'saved', label: '📌 Saved', color: 'text-text-main', bg: 'bg-bg-card/40', border: 'border-border-custom/40' },
  { id: 'applied', label: '✉️ Applied', color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-550/20' },
  { id: 'interview', label: '🎤 Interview', color: 'text-purple-500', bg: 'bg-purple-500/5', border: 'border-purple-550/20' },
  { id: 'offer', label: '🎉 Offer', color: 'text-emerald-600', bg: 'bg-emerald-500/5', border: 'border-emerald-550/20' },
  { id: 'rejected', label: '❌ Rejected', color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-550/20' },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-green-600 bg-green-500/10 border-green-550/20'
    : score >= 50 ? 'text-yellow-600 bg-yellow-500/10 border-yellow-550/20'
    : 'text-red-500 bg-red-500/10 border-red-550/20';
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${color}`}>{score}% Match</span>
  );
}

function AddJobModal({ onAdd, onClose }: { onAdd: (j: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({ jobTitle: '', company: '', jobUrl: '', matchScore: 0 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobTitle.trim()) return;
    onAdd({ ...form, status: 'saved' as const, notes: '', applicationId: null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-card border border-border-custom/50 rounded-3xl p-6 w-full max-w-md shadow-custom-card animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-black mb-4 flex items-center gap-1.5 text-text-main">
          <Plus className="w-5 h-5 text-primary" /> Add Job to Tracker
        </h2>
        <form onSubmit={submit} className="space-y-3.5">
          <input required placeholder="Job Title *" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
            className="w-full bg-bg-main border border-border-custom rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary transition-all text-text-main" />
          <input placeholder="Company" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
            className="w-full bg-bg-main border border-border-custom rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary transition-all text-text-main" />
          <input placeholder="Job URL" value={form.jobUrl} onChange={e => setForm(p => ({ ...p, jobUrl: e.target.value }))}
            className="w-full bg-bg-main border border-border-custom rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary transition-all text-text-main" />
          <div>
            <label className="text-[10px] text-text-muted mb-1.5 block font-bold">Match Score: {form.matchScore}%</label>
            <input type="range" min={0} max={100} value={form.matchScore} onChange={e => setForm(p => ({ ...p, matchScore: Number(e.target.value) }))}
              className="w-full accent-primary bg-bg-main h-1.5 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div className="flex gap-2.5 pt-2">
            <button type="submit" className="flex-1 bg-primary hover:bg-primary-hover text-bg-card py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">Add Job</button>
            <button type="button" onClick={onClose} className="flex-1 bg-bg-main hover:bg-slate-200 text-text-muted py-2.5 rounded-xl text-xs font-bold border border-border-custom transition-all">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  const [jobs, setJobs] = useState<TrackerJob[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TrackerJob['status'] | null>(null);

  useEffect(() => {
    setJobs(listTrackerJobs());
  }, []);

  const handleAdd = (jobData: any) => {
    const newJob = addTrackerJob(jobData);
    setJobs(prev => [...prev, newJob]);
  };

  const handleDelete = (id: string) => {
    deleteTrackerJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const handleDragStart = (id: string) => setDragging(id);
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };
  const handleDragOver = (e: React.DragEvent, status: TrackerJob['status']) => {
    e.preventDefault();
    setDragOver(status);
  };

  const handleDrop = (e: React.DragEvent, status: TrackerJob['status']) => {
    e.preventDefault();
    if (!dragging) return;
    updateTrackerJob(dragging, { status });
    setJobs(listTrackerJobs());
    setDragging(null);
    setDragOver(null);
  };

  const jobsByStatus = (status: TrackerJob['status']) => jobs.filter(j => j.status === status);

  return (
    <AppLayout>
      {showAdd && <AddJobModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      <div className="flex flex-col h-full space-y-6">
        
        {/* Header Board Summary */}
        <div className="flex items-center justify-between pb-4 border-b border-border-custom/50">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2 text-text-main">
              <Sparkles className="w-5 h-5 text-primary" />
              Application Tracker
            </h1>
            <p className="text-xs text-text-muted mt-0.5 font-semibold">Drag and drop cards between statuses to organize your search. {jobs.length} tracked jobs.</p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-primary hover:bg-primary-hover text-bg-card px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Job
          </button>
        </div>

        {/* Kanban Board Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              className={`rounded-3xl border-none p-3 min-h-[400px] transition-all flex flex-col ${col.bg} ${dragOver === col.id ? 'ring-2 ring-primary bg-bg-card/70' : ''}`}>

              <div className="flex items-center justify-between mb-3 px-1.5 pt-1">
                <h2 className={`text-[10px] font-black uppercase tracking-wider ${col.color}`}>{col.label}</h2>
                <span className="text-[10px] bg-bg-card border border-border-custom/50 text-text-muted rounded-full px-2 py-0.5 font-bold shadow-sm">{jobsByStatus(col.id).length}</span>
              </div>

              <div className="space-y-2.5 flex-1">
                {jobsByStatus(col.id).map(job => (
                  <div key={job.id}
                    draggable
                    onDragStart={() => handleDragStart(job.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-bg-card shadow-sm hover:shadow-custom-card hover:scale-[1.02] border-none rounded-2xl p-3.5 cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden ${dragging === job.id ? 'opacity-30 scale-95' : ''}`}>
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-all" />
                    
                    <div className="flex items-start justify-between gap-1 mb-1 pl-1">
                      <p className="text-xs font-bold text-text-main leading-tight line-clamp-2">{job.jobTitle}</p>
                      <button onClick={() => handleDelete(job.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {job.company && <p className="text-[10px] text-text-muted font-bold pl-1">{job.company}</p>}
                    
                    <div className="flex items-center justify-between mt-3.5 pl-1">
                      {job.matchScore > 0 ? <ScoreBadge score={job.matchScore} /> : <span />}
                      {job.jobUrl && (
                        <a href={job.jobUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-text-muted hover:text-primary transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center text-[9px] text-text-muted pl-1 mt-2.5 pt-1.5 border-t border-border-custom/30 font-bold">
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                      <span className="cursor-grab"><GripVertical className="w-3 h-3 text-text-muted" /></span>
                    </div>
                  </div>
                ))}

                {jobsByStatus(col.id).length === 0 && (
                  <div className="text-center py-12 text-text-muted text-[10px] border border-dashed border-border-custom/50 rounded-2xl bg-bg-card/20 flex items-center justify-center font-bold select-none">
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
