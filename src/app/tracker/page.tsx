"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { listTrackerJobs, updateTrackerJob, deleteTrackerJob, addTrackerJob, TrackerJob } from '@/lib/storage';

type Column = {
  id: TrackerJob['status'];
  label: string;
  color: string;
  bg: string;
  border: string;
};

const COLUMNS: Column[] = [
  { id: 'saved', label: '📌 Saved', color: 'text-slate-300', bg: 'bg-slate-800/60', border: 'border-slate-700' },
  { id: 'applied', label: '✉️ Applied', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'interview', label: '🎤 Interview', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 'offer', label: '🎉 Offer', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'rejected', label: '❌ Rejected', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30' },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : score >= 50 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : 'text-red-400 bg-red-500/10 border-red-500/20';
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${color}`}>{score}%</span>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Add Job to Tracker</h2>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Job Title *" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
          <input placeholder="Company" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
          <input placeholder="Job URL" value={form.jobUrl} onChange={e => setForm(p => ({ ...p, jobUrl: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Match Score: {form.matchScore}%</label>
            <input type="range" min={0} max={100} value={form.matchScore} onChange={e => setForm(p => ({ ...p, matchScore: Number(e.target.value) }))}
              className="w-full accent-indigo-500" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">Add Job</button>
            <button type="button" onClick={onClose} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-sm font-medium transition-colors">Cancel</button>
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
    <div className="min-h-screen bg-slate-950 text-white">
      {showAdd && <AddJobModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}

      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> AI Job Factory
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300 font-medium">Job Tracker</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/history" className="text-sm text-slate-400 hover:text-white transition-colors">History</Link>
            <button onClick={() => setShowAdd(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Job
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Application Tracker</h1>
          <p className="text-slate-400 mt-1">Drag and drop jobs between stages. {jobs.length} total applications tracked.</p>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
          {COLUMNS.map(col => (
            <div key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              className={`rounded-2xl border p-3 min-h-[200px] transition-colors ${col.bg} ${dragOver === col.id ? 'border-indigo-500' : col.border}`}>

              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className={`text-sm font-semibold ${col.color}`}>{col.label}</h2>
                <span className="text-xs bg-slate-800 text-slate-400 rounded-full px-2 py-0.5">{jobsByStatus(col.id).length}</span>
              </div>

              <div className="space-y-2">
                {jobsByStatus(col.id).map(job => (
                  <div key={job.id}
                    draggable
                    onDragStart={() => handleDragStart(job.id)}
                    onDragEnd={handleDragEnd}
                    className={`bg-slate-900 border border-slate-800 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all group ${dragging === job.id ? 'opacity-40 scale-95' : ''}`}>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-medium text-slate-200 leading-tight line-clamp-2">{job.jobTitle}</p>
                      <button onClick={() => handleDelete(job.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {job.company && <p className="text-xs text-slate-500 mb-2">{job.company}</p>}
                    <div className="flex items-center justify-between">
                      {job.matchScore > 0 && <ScoreBadge score={job.matchScore} />}
                      {job.jobUrl && (
                        <a href={job.jobUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-slate-600 hover:text-indigo-400 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-2">{new Date(job.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}

                {jobsByStatus(col.id).length === 0 && (
                  <div className="text-center py-6 text-slate-700 text-xs border-2 border-dashed border-slate-800 rounded-xl">
                    Drop jobs here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
