// src/lib/storage.ts
// Typed localStorage helpers for persisting job applications locally.

export interface SavedApplication {
  id: string;
  savedAt: string; // ISO timestamp
  jobTitle: string;
  company: string;
  matchScore: number;
  jobUrl: string;
  resumeText: string;
  jobDescription: string;
  results: {
    gap: {
      score: number;
      matched: string[];
      missing: string[];
      missingStrategies?: { skill: string; strategy: string }[];
    };
    resume: string;
    cover: string;
    coach: { q: string; a: string }[];
    salary: { min: number; max: number; currency: string; basis: string; note: string } | null;
    email: { followUp: string; coldOutreach: string } | null;
    radar: { technical: number; experience: number; leadership: number; communication: number; culturalFit: number; education: number } | null;
    gapExplainer: { hasGap: boolean; coverParagraph: string; coachingNote: string } | null;
  };
}

export interface TrackerJob {
  id: string;
  createdAt: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  jobUrl: string;
  status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
  notes: string;
  applicationId: string | null; // links to SavedApplication.id
}

const APPLICATIONS_KEY = 'aijf_applications';
const TRACKER_KEY = 'aijf_tracker';

// ── Applications ────────────────────────────────────────────────────────────

export function listApplications(): SavedApplication[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveApplication(app: Omit<SavedApplication, 'id' | 'savedAt'>): SavedApplication {
  const full: SavedApplication = {
    ...app,
    id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    savedAt: new Date().toISOString(),
  };
  const existing = listApplications();
  existing.unshift(full); // newest first
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(existing));
  return full;
}

export function deleteApplication(id: string): void {
  const filtered = listApplications().filter(a => a.id !== id);
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(filtered));
}

export function getApplication(id: string): SavedApplication | null {
  return listApplications().find(a => a.id === id) ?? null;
}

// ── Tracker ──────────────────────────────────────────────────────────────────

export function listTrackerJobs(): TrackerJob[] {
  try {
    const raw = localStorage.getItem(TRACKER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addTrackerJob(job: Omit<TrackerJob, 'id' | 'createdAt'>): TrackerJob {
  const full: TrackerJob = {
    ...job,
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const existing = listTrackerJobs();
  existing.push(full);
  localStorage.setItem(TRACKER_KEY, JSON.stringify(existing));
  return full;
}

export function updateTrackerJob(id: string, patch: Partial<TrackerJob>): void {
  const jobs = listTrackerJobs().map(j => j.id === id ? { ...j, ...patch } : j);
  localStorage.setItem(TRACKER_KEY, JSON.stringify(jobs));
}

export function deleteTrackerJob(id: string): void {
  const filtered = listTrackerJobs().filter(j => j.id !== id);
  localStorage.setItem(TRACKER_KEY, JSON.stringify(filtered));
}
