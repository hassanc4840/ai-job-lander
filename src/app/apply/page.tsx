"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Link as LinkIcon,
  FileText,
  ArrowRight,
  Loader2,
  Target,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cookie
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import AppLayout from '@/components/AppLayout';

// Extract all text from a PDF file using pdf.js (browser-side)
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

export default function ApplyPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);

  const [jobUrl, setJobUrl] = useState('');
  const [jobText, setJobText] = useState('');
  const [inputType, setInputType] = useState<'url' | 'text'>('url');

  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState('');
  const [scrapeMethod, setScrapeMethod] = useState('');

  const [isRunning, setIsRunning] = useState(false);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [linkedinCookie, setLinkedinCookie] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const dropped = acceptedFiles[0];
    setFile(dropped);
    setResumeText('');
    setIsExtractingPDF(true);
    try {
      const text = await extractTextFromPDF(dropped);
      setResumeText(text);
    } catch (err) {
      console.error('PDF extraction failed:', err);
      setResumeText('');
    } finally {
      setIsExtractingPDF(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleScrapeUrl = async () => {
    if (!jobUrl) return;
    setIsScraping(true);
    setScrapeError('');
    setScrapeMethod('');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl, linkedinCookie: linkedinCookie.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scrape URL');
      setJobText(data.text);
      setScrapeMethod(data.method || '');
      setInputType('text');
    } catch (err: any) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleRunAgents = () => {
    const finalJobText = jobText.trim();
    if (!file || !resumeText || !finalJobText) return;
    setIsRunning(true);

    localStorage.setItem('resumeText', resumeText);
    localStorage.setItem('jobDescription', finalJobText);
    localStorage.setItem('fileName', file.name);
    localStorage.setItem('jobUrl', jobUrl || '');

    router.push('/dashboard?run=true');
  };

  const canSubmit = !!file && !isExtractingPDF && !!resumeText && !!(jobText.trim() || jobUrl.trim());

  const methodLabel: Record<string, string> = {
    direct: '✓ Direct fetch',
    jina: '✓ Jina.ai proxy',
    google_cache: '✓ Google Cache',
    scraperapi: '✓ ScraperAPI proxy',
    linkedin_cookie: '✓ LinkedIn (authenticated)',
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2 text-text-main">
              <Sparkles className="w-6 h-6 text-primary" />
              Build Application Package
            </h1>
            <p className="text-text-muted text-xs mt-1">Provide your resume PDF and the job description details below.</p>
          </div>
          <button
            onClick={() => {
              setFile(new File([''], 'demo_resume.pdf', { type: 'application/pdf' }));
              setResumeText(`John Doe\nSoftware Engineer\njohn.doe@email.com | (555) 019-2834\n\nSUMMARY\nPassionate software engineer with 4+ years of experience building scalable web applications. Skilled in React, Next.js, Node.js, and TypeScript.\n\nEXPERIENCE\nSenior Frontend Engineer | TechCorp (Jan 2023 - Present)\n- Led migration of legacy app to Next.js, improving page load speed by 40%.\n- Developed reusable component library, reducing development time by 25%.\n\nSoftware Developer | AppSolutions (May 2021 - Dec 2022)\n- Built client-facing React web applications.\n- Optimized Postgres queries, improving response times by 15%.\n\nEDUCATION\nB.S. in Computer Science | State University (2017 - 2021)`);
              setJobText(`Senior React / Next.js Engineer\nWe are looking for a Senior Frontend Engineer who is passionate about building high-performance web applications using React, Next.js, and TypeScript.\n\nQualifications:\n- 3+ years of professional software development experience.\n- Strong proficiency in React, Next.js, and modern CSS.\n- Experience with state management, performance optimization, and testing.`);
              setInputType('text');
            }}
            className="self-start sm:self-center bg-primary text-bg-card px-4 py-2 rounded-full text-xs font-extrabold transition-all hover:scale-105 shadow-sm"
          >
            ⚡ Load Demo Profile
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Left Panel: Resume Upload */}
          <div className="bg-bg-card shadow-custom-card rounded-3xl p-6 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-text-main">
              <FileText className="w-4.5 h-4.5 text-primary" />
              1. Upload Resume
            </h2>

            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer min-h-[200px]
                ${isDragActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-custom/80 hover:border-slate-400 hover:bg-bg-main/30'}
                ${file && resumeText ? 'border-green-500/50 bg-green-500/5' : ''}
              `}
            >
              <input {...getInputProps()} />
              {isExtractingPDF ? (
                <div className="text-center space-y-2">
                  <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                  <p className="font-bold text-text-main text-xs">Parsing Document...</p>
                  <p className="text-[10px] text-text-muted">Extracting PDF text content</p>
                </div>
              ) : file && resumeText ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-text-main text-xs truncate max-w-[200px] mx-auto">{file.name}</p>
                    <p className="text-[10px] text-green-500 font-semibold mt-1">{resumeText.split(' ').length} words extracted</p>
                  </div>
                  <p className="text-xs text-primary font-bold pt-2 hover:underline">Replace PDF</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-bg-main rounded-full flex items-center justify-center mx-auto border border-border-custom/50 shadow-sm">
                    <UploadCloud className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="font-bold text-text-main text-xs">Drag & drop your PDF resume</p>
                  <p className="text-[10px] text-text-muted">or click to browse files</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Job Description */}
          <div className="bg-bg-card shadow-custom-card rounded-3xl p-6 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2 text-text-main">
              <Target className="w-4.5 h-4.5 text-accent" />
              2. Job Details
            </h2>

            <div className="bg-bg-main p-1 rounded-xl flex mb-4 border border-border-custom/50">
              <button
                onClick={() => setInputType('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${inputType === 'url' ? 'bg-primary text-bg-card shadow-sm' : 'text-text-muted hover:text-text-main'}`}
              >
                Job URL
              </button>
              <button
                onClick={() => setInputType('text')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${inputType === 'text' ? 'bg-primary text-bg-card shadow-sm' : 'text-text-muted hover:text-text-main'}`}
              >
                Paste Text
              </button>
            </div>

            {inputType === 'url' ? (
              <div className="flex-1 flex flex-col gap-3">
                <p className="text-[10px] text-text-muted">Paste job post link (Greenhouse, Lever, LinkedIn, Indeed, etc.)</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScrapeUrl()}
                      className="w-full bg-bg-main border border-border-custom rounded-xl py-2.5 pl-9 pr-4 text-xs focus:outline-none focus:border-primary transition-all text-text-main"
                    />
                  </div>
                  <button
                    onClick={handleScrapeUrl}
                    disabled={!jobUrl || isScraping}
                    className="bg-primary hover:bg-primary-hover disabled:bg-slate-350 disabled:text-slate-500 text-bg-card px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center flex-shrink-0 shadow-sm"
                  >
                    {isScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                  </button>
                </div>

                {/* Advanced Options: LinkedIn Cookie */}
                <div className="border border-border-custom/50 rounded-xl overflow-hidden mt-1 bg-bg-main/20">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-text-muted hover:text-text-main hover:bg-bg-main transition-colors font-bold"
                  >
                    <span className="flex items-center gap-1.5">
                      <Cookie className="w-3.5 h-3.5 text-primary" />
                      Advanced Cookie Bypass
                    </span>
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showAdvanced && (
                    <div className="px-3 pb-3 bg-bg-main">
                      <p className="text-[9px] text-text-muted mb-2 leading-relaxed">
                        If blocked, paste your <code className="text-primary bg-bg-card px-1 py-0.5 rounded font-bold">li_at</code> LinkedIn session cookie.
                      </p>
                      <input
                        type="password"
                        placeholder="Paste li_at cookie..."
                        value={linkedinCookie}
                        onChange={(e) => setLinkedinCookie(e.target.value)}
                        className="w-full bg-bg-card border border-border-custom rounded-lg py-1.5 px-3 text-[10px] focus:outline-none focus:border-primary transition-all font-mono text-text-main"
                      />
                    </div>
                  )}
                </div>

                {scrapeError && (
                  <div className="bg-red-500/5 p-3.5 rounded-xl border border-red-500/20 space-y-2">
                    <p className="text-red-500 text-xs font-black">⚠️ Extraction failed</p>
                    <p className="text-text-muted text-[10px] leading-relaxed">{scrapeError}</p>
                    <button
                      onClick={() => { setScrapeError(''); setInputType('text'); }}
                      className="w-full bg-primary hover:bg-primary-hover text-bg-card text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                    >
                      Use Paste Text Mode
                    </button>
                  </div>
                )}
                
                {jobText && !scrapeError && (
                  <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/25">
                    <p className="text-green-500 text-[10px] flex items-center gap-1 mb-1 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      Details Extracted!
                      {scrapeMethod && <span className="ml-1 text-[9px] text-slate-500 font-normal">via {methodLabel[scrapeMethod] || scrapeMethod}</span>}
                    </p>
                    <p className="text-text-muted text-[10px] line-clamp-2">{jobText.slice(0, 150)}...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <textarea
                  placeholder="Paste the full job description text here..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  className="flex-1 w-full bg-bg-main border border-border-custom rounded-xl p-3 resize-none focus:outline-none focus:border-primary transition-all min-h-[150px] text-xs text-text-main"
                />
                {jobText && (
                  <p className="text-[10px] text-text-muted mt-2 font-bold">{jobText.split(/\s+/).filter(Boolean).length} words</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Bottom */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleRunAgents}
            disabled={!canSubmit || isRunning}
            className={`
              group relative overflow-hidden flex items-center gap-2.5 px-10 py-4.5 rounded-full text-xs font-black transition-all
              ${!canSubmit
                ? 'bg-slate-350 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-primary text-bg-card shadow-custom-card hover:scale-105 active:scale-95'
              }
            `}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Launching Agents...
              </>
            ) : (
              <>
                Run Agent Pipeline
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
              </>
            )}
            {canSubmit && !isRunning && (
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            )}
          </button>

          <div className="mt-3 text-[10px] text-text-muted font-bold">
            {!file && <p>Upload your resume PDF to begin</p>}
            {file && !resumeText && !isExtractingPDF && <p className="text-red-500">PDF parse error - try another document</p>}
            {file && resumeText && !jobText.trim() && <p>Input the job details to continue</p>}
            {canSubmit && <p className="text-text-muted flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-primary" /> Ready! Triggers 8 collaborative agents (takes ~30s)</p>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
