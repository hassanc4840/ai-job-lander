import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  Target, 
  BarChart3, 
  DollarSign, 
  FileText, 
  FileSignature, 
  MessageSquare, 
  Mail, 
  ClipboardList 
} from 'lucide-react';

export default function Home() {
  const agentIcons = [
    { name: 'Gap Analyst', icon: Target, desc: 'Compares your resume against the job description to extract skill matches.' },
    { name: 'Score Engine', icon: BarChart3, desc: 'Calculates an ATS compatibility score and key keywords.' },
    { name: 'Salary Estimator', icon: DollarSign, desc: 'Provides real-time compensation metrics for the job seniority.' },
    { name: 'Resume Rewriter', icon: FileText, desc: 'Restructures work bullets to naturally inject missing skills.' },
    { name: 'Cover Letter Specialist', icon: FileSignature, desc: 'Drafts a compelling, narrative-driven letter covering your gap.' },
    { name: 'Gap Explainer', icon: MessageSquare, desc: 'Creates recruiter-facing text and coaching strategies for gaps.' },
    { name: 'Email Drafter', icon: Mail, desc: 'Builds follow-up emails and LinkedIn connection messages.' },
    { name: 'Interview Coach', icon: HelpIcon, desc: 'Generates 7 role-specific Q&A prep questions based on your CV.' }
  ];

  return (
    <div className="min-h-screen bg-bg-main text-slate-100 selection:bg-primary/30 flex flex-col relative overflow-hidden">
      
      {/* Background Decorative Mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px] pointer-events-none animate-pulse duration-[10s]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-border-custom bg-bg-card/30 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_10px_var(--glow)]">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight select-none">AI Job Factory</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
            <a href="#pipeline" className="hover:text-white transition-colors">Agent Pipeline</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <Link href="/chat" className="hover:text-white transition-colors flex items-center gap-1">
              AI Job Coach <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">New</span>
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/tracker" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-bg-card transition-all">
              <ClipboardList className="w-3.5 h-3.5" /> Tracker
            </Link>
            <Link href="/apply" className="bg-primary hover:bg-primary-hover text-bg-main px-4 py-2 rounded-full text-xs font-bold transition-all shadow-[0_0_15px_var(--glow)] hover:scale-105">
              Launch App
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative z-10">
        <section className="relative pt-24 pb-16 px-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20 shadow-[0_0_10px_var(--glow)] animate-bounce">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            8 Specialized AI Agents · Ready in Under 3 Minutes
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight select-none">
            Land Your Dream Job.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary-hover">
              Accelerate with AI.
            </span>
          </h1>
          
          <p className="text-base sm:text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your resume PDF and paste a job link. Our automated pipeline handles skills gaps, rewrites bullets, estimates compensation, designs cover letters, and coaches your interview prep.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/apply" className="group flex items-center gap-2 bg-primary text-bg-main px-8 py-4 rounded-full text-sm font-extrabold hover:bg-primary-hover transition-all hover:scale-105 shadow-[0_0_30px_var(--glow)]">
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </Link>
            <Link href="/chat" className="flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold border border-border-custom hover:border-slate-500 bg-bg-card/45 hover:bg-bg-card transition-all">
              Chat with AI Coach
            </Link>
          </div>
        </section>

        {/* ── FEATURES SECTION ────────────────────────────────────────────────── */}
        <section id="pipeline" className="py-20 px-6 border-y border-border-custom bg-bg-card/10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-4xl font-bold mb-3">8 Collaborative AI Agents Working For You</h2>
              <p className="text-slate-400 text-sm">
                Each agent has a specific focus. Together, they analyze, rewrite, draft, and prep your career documents professionally.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-bg-card/50 border border-border-custom/80 hover:border-primary/45 p-6 rounded-2xl transition-all hover:-translate-y-1 group">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20 group-hover:bg-primary/20 transition-all shadow-[0_0_8px_var(--glow)]">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">Skills Gap Analyst</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scans job requirements, highlights what you possess, identifies what you lack, and devises pivot scripts.
                </p>
              </div>

              <div className="bg-bg-card/50 border border-border-custom/80 hover:border-primary/45 p-6 rounded-2xl transition-all hover:-translate-y-1 group">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20 group-hover:bg-primary/20 transition-all shadow-[0_0_8px_var(--glow)]">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">Score & Radar Engine</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generates an ATS score and maps core competencies on a visual skill radar across 6 functional dimensions.
                </p>
              </div>

              <div className="bg-bg-card/50 border border-border-custom/80 hover:border-primary/45 p-6 rounded-2xl transition-all hover:-translate-y-1 group">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20 group-hover:bg-primary/20 transition-all shadow-[0_0_8px_var(--glow)]">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">ATS Resume Rewriter</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Rewrites bullet points with strong action verbs to naturally fit core skills without fabricating experience.
                </p>
              </div>

              <div className="bg-bg-card/50 border border-border-custom/80 hover:border-primary/45 p-6 rounded-2xl transition-all hover:-translate-y-1 group">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20 group-hover:bg-primary/20 transition-all shadow-[0_0_8px_var(--glow)]">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">AI Career Coach & Finder</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interactive chatbot that suggests real roles, adds postings to tracker, and critiques resumes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── COOP WORKSPACE PREVIEW ───────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Professional Workspace</span>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight">All Your Applications, Fully Tracked</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Work professionally using a unified SaaS interface. Manage your applications with our drag-and-drop Kanban Tracker board, access saved history, adjust themes dynamically, and run chatbot interactions on the fly.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/25">✓</div>
                  <span className="text-sm font-semibold text-slate-200">Interactive Kanban Pipeline Stages</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/25">✓</div>
                  <span className="text-sm font-semibold text-slate-200">Historical Archives (locally cached)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/25">✓</div>
                  <span className="text-sm font-semibold text-slate-200">Visual Radar Charts and PDFs</span>
                </div>
              </div>
              
              <div className="pt-4">
                <Link href="/apply" className="inline-flex items-center gap-2 bg-primary text-bg-main px-6 py-3 rounded-xl text-xs font-bold hover:bg-primary-hover transition-all shadow-[0_0_15px_var(--glow)]">
                  Launch the Workspace
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {/* Visual Glassmorphism Console Preview */}
            <div className="bg-bg-card border border-border-custom rounded-2xl p-5 shadow-2xl relative">
              <div className="absolute top-2 left-3 flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="border-b border-border-custom/50 pb-3 mb-4 text-center text-xs font-mono text-slate-500">
                app.aijobfactory.com/tracker
              </div>
              
              {/* Fake Kanban column */}
              <div className="space-y-3">
                <div className="bg-bg-main border border-border-custom rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Senior Next.js Developer</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/25 text-green-400">92% Match</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Vercel Inc. · Remote, US</span>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-custom/30 text-[10px] text-slate-400">
                    <span className="text-emerald-500 font-semibold">$140k - $170k</span>
                    <span>Interviewing 🎤</span>
                  </div>
                </div>
                <div className="bg-bg-main border border-border-custom rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden opacity-60">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Fullstack Engineer</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/25 text-yellow-400">81% Match</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Stripe · SF, California</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border-custom py-12 text-center text-slate-500 bg-bg-card/40 relative z-10 transition-colors">
        <p className="text-xs">© 2026 AI Job Factory. Built for modern, professional job searches.</p>
      </footer>
    </div>
  );
}

// Inline fallback icon to prevent missing icons
function HelpIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
