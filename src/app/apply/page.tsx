"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud, Link as LinkIcon, FileText, ArrowRight, Loader2,
  Target, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Cookie
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

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

    router.push('/dashboard');
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
    <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Build Your Application</h1>
            <p className="text-slate-400">Provide your resume and the job you want to apply for.</p>
          </div>
          <button
            onClick={() => {
              setFile(new File([''], 'demo_resume.pdf', { type: 'application/pdf' }));
              setResumeText(`John Doe\nSoftware Engineer\njohn.doe@email.com | (555) 019-2834\n\nSUMMARY\nPassionate software engineer with 4+ years of experience building scalable web applications. Skilled in React, Next.js, Node.js, and TypeScript.\n\nEXPERIENCE\nSenior Frontend Engineer | TechCorp (Jan 2023 - Present)\n- Led migration of legacy app to Next.js, improving page load speed by 40%.\n- Developed reusable component library, reducing development time by 25%.\n\nSoftware Developer | AppSolutions (May 2021 - Dec 2022)\n- Built client-facing React web applications.\n- Optimized Postgres queries, improving response times by 15%.\n\nEDUCATION\nB.S. in Computer Science | State University (2017 - 2021)`);
              setJobText(`Senior React / Next.js Engineer\nWe are looking for a Senior Frontend Engineer who is passionate about building high-performance web applications using React, Next.js, and TypeScript.\n\nQualifications:\n- 3+ years of professional software development experience.\n- Strong proficiency in React, Next.js, and modern CSS.\n- Experience with state management, performance optimization, and testing.`);
              setInputType('text');
            }}
            className="self-start sm:self-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
          >
            ⚡ Use Demo Data
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          {/* Left Panel: Resume Upload */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              1. Upload Resume
            </h2>

            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-colors cursor-pointer
                ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}
                ${file && resumeText ? 'border-green-500/50 bg-green-500/5' : ''}
              `}
            >
              <input {...getInputProps()} />
              {isExtractingPDF ? (
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-indigo-400 mx-auto mb-4 animate-spin" />
                  <p className="font-medium text-slate-200">Reading PDF...</p>
                  <p className="text-sm text-slate-500 mt-1">Extracting your resume text</p>
                </div>
              ) : file && resumeText ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="font-medium text-slate-200">{file.name}</p>
                  <p className="text-sm text-green-400 mt-1">{resumeText.split(' ').length} words extracted ✓</p>
                  <p className="text-xs text-indigo-400 mt-4">Click or drag to replace</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-medium text-slate-200 mb-1">Drag & drop your PDF resume</p>
                  <p className="text-sm text-slate-500">or click to browse files</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Job Description */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              2. Job Details
            </h2>

            <div className="bg-slate-950 p-1 rounded-lg flex mb-4 border border-slate-800">
              <button
                onClick={() => setInputType('url')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inputType === 'url' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Job URL
              </button>
              <button
                onClick={() => setInputType('text')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${inputType === 'text' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Paste Text
              </button>
            </div>

            {inputType === 'url' ? (
              <div className="flex-1 flex flex-col gap-3">
                <p className="text-sm text-slate-400">Paste a link to the job posting (LinkedIn, Indeed, Greenhouse, etc.)</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={jobUrl}
                      onChange={(e) => setJobUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScrapeUrl()}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleScrapeUrl}
                    disabled={!jobUrl || isScraping}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    {isScraping ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Fetch'}
                  </button>
                </div>

                {/* Advanced Options: LinkedIn Cookie */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Cookie className="w-4 h-4" />
                      Advanced: LinkedIn Cookie Bypass
                    </span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAdvanced && (
                    <div className="px-4 pb-4 bg-slate-950/50">
                      <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                        If LinkedIn blocks access, paste your <code className="text-indigo-400 bg-slate-900 px-1 rounded">li_at</code> session cookie here.
                        Find it in Chrome DevTools → Application → Cookies → linkedin.com.
                      </p>
                      <input
                        type="password"
                        placeholder="Paste your li_at cookie value..."
                        value={linkedinCookie}
                        onChange={(e) => setLinkedinCookie(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                      <p className="text-xs text-slate-600 mt-1">Your cookie is never stored or sent anywhere except the job URL you entered.</p>
                    </div>
                  )}
                </div>

                {scrapeError && (
                  <div className="mt-1 bg-red-400/10 p-4 rounded-lg border border-red-400/20 space-y-2">
                    <p className="text-red-400 text-sm font-semibold">⚠ Could not extract job details</p>
                    <p className="text-slate-300 text-sm whitespace-pre-line">{scrapeError}</p>
                    <button
                      onClick={() => { setScrapeError(''); setInputType('text'); }}
                      className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      Switch to Paste Text →
                    </button>
                  </div>
                )}
                {jobText && !scrapeError && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-green-400 text-sm flex items-center gap-1 mb-1">
                      <Sparkles className="w-4 h-4" />
                      Job details extracted! ({jobText.split(' ').length} words)
                      {scrapeMethod && <span className="ml-1 text-xs text-slate-500">via {methodLabel[scrapeMethod] || scrapeMethod}</span>}
                    </p>
                    <p className="text-slate-400 text-xs line-clamp-2">{jobText.slice(0, 150)}...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <textarea
                  placeholder="Paste the full job description here..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-4 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all min-h-[200px]"
                />
                {jobText && (
                  <p className="text-xs text-slate-500 mt-2">{jobText.split(' ').length} words</p>
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
              group relative overflow-hidden flex items-center gap-3 px-10 py-5 rounded-full text-lg font-bold transition-all
              ${!canSubmit
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)] hover:scale-105 active:scale-95'
              }
            `}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Sending to Agents...
              </>
            ) : (
              <>
                Run All Agents
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </>
            )}
            {canSubmit && !isRunning && (
              <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            )}
          </button>

          <div className="mt-4 flex flex-col items-center gap-1">
            {!file && <p className="text-slate-500 text-sm">⬆ Upload your resume PDF first</p>}
            {file && !resumeText && !isExtractingPDF && <p className="text-red-400 text-sm">⚠ Could not read PDF — try a different file</p>}
            {file && resumeText && !(jobText.trim()) && <p className="text-slate-500 text-sm">⬆ Add the job description to continue</p>}
            {canSubmit && <p className="text-slate-500 text-sm">Ready! Runs 7 AI agents — takes ~30 seconds via Gemini API.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
