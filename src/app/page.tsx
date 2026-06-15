import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, FileText, Target } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <span className="font-bold text-xl tracking-tight">AI Job Factory</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </nav>
          <Link href="/apply" className="bg-white text-slate-950 px-4 py-2 rounded-full text-sm font-semibold hover:bg-indigo-50 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-sm font-medium mb-8 border border-indigo-500/20">
              <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
              2,400+ applications built this week
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Land Your Dream Job.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                In 3 Minutes.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload your resume, paste a job link, and let our 6 specialized AI agents build you a perfect, ATS-optimized application package instantly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/apply" className="group flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
                Try Free — No Signup Needed
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Value Prop Section */}
        <section id="features" className="py-24 px-6 bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">A complete pipeline of specialized agents</h2>
              <p className="text-slate-400">Not just a ChatGPT wrapper. Six specialized agents working in sequence to build your perfect application.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-colors">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/20">
                  <Target className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Gap Analysis</h3>
                <p className="text-slate-400 leading-relaxed">We match your skills against the job description to find exact gaps and calculate a perfect match score.</p>
              </div>

              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-purple-500/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">ATS Resume Rewrite</h3>
                <p className="text-slate-400 leading-relaxed">We intelligently rewrite your resume bullets to include missing keywords while maintaining absolute truthfulness.</p>
              </div>

              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-pink-500/50 transition-colors">
                <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center mb-6 border border-pink-500/20">
                  <Zap className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Interview Coach</h3>
                <p className="text-slate-400 leading-relaxed">Get 10 tailored interview questions and sample answers based specifically on how your past experience fits this role.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t border-slate-800 py-12 text-center text-slate-500 bg-slate-950">
        <p>© 2025 AI Job Application Factory. Built for the future of work.</p>
      </footer>
    </div>
  );
}
