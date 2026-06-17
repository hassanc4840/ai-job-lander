"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  MessageSquare, 
  Briefcase, 
  BookmarkPlus, 
  ArrowRight,
  User,
  Bot,
  Info,
  DollarSign,
  MapPin,
  CheckCircle,
  Clock
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { addTrackerJob, listTrackerJobs } from '@/lib/storage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ParsedSegment {
  type: 'text' | 'job';
  content?: string;
  jobData?: {
    title: string;
    company: string;
    location: string;
    salary: string;
    matchScore: number;
    description: string;
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [resumeWordCount, setResumeWordCount] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const resumeTextRef = useRef<string>('');
  
  // Load initial resume and state
  useEffect(() => {
    try {
      const resume = localStorage.getItem('resumeText') || '';
      resumeTextRef.current = resume;
      if (resume) {
        setResumeWordCount(resume.split(/\s+/).filter(Boolean).length);
      }
      
      // Default welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi there! I am your **AI Job Coach & Finder**.\n\n${
            resume 
              ? `I see you have uploaded your resume (~${resume.split(/\s+/).filter(Boolean).length} words). I can use it to recommend jobs, conduct mock interviews, or suggest edits!` 
              : 'You can upload your resume on the **Apply Wizard** page to get personalized career counseling.'
          }\n\nHow can I help you professionally today? You can ask me to find jobs, check your gap strategies, or run mock interviews.`,
          timestamp: new Date()
        }
      ]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Custom XML Tag Parser
  const parseMessageContent = (text: string): ParsedSegment[] => {
    const regex = /<job_recommendation\s+([^>]+)\s*\/>/gi;
    const parts: ParsedSegment[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      const attrsStr = match[1];
      const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
      const attrs: Record<string, string> = {};
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
        attrs[attrMatch[1]] = attrMatch[2];
      }

      parts.push({
        type: 'job',
        jobData: {
          title: attrs.title || 'Untitled Role',
          company: attrs.company || 'Unknown Company',
          location: attrs.location || 'Remote',
          salary: attrs.salary || 'Competitive',
          matchScore: parseInt(attrs.matchScore) || 75,
          description: attrs.description || ''
        }
      });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    
    try {
      const trackerJobs = listTrackerJobs();
      const trackerSummary = trackerJobs.length > 0
        ? trackerJobs.map(j => `${j.jobTitle} at ${j.company} (Status: ${j.status}, Match: ${j.matchScore}%)`).join(', ')
        : 'No jobs tracked yet';

      const historyContext = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyContext,
          resumeText: resumeTextRef.current || undefined,
          trackerJobs: trackerSummary
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error occurred');

      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.text,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ Sorry, I ran into an error: ${err.message}. Please verify your API keys are configured and try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTracker = (job: any) => {
    addTrackerJob({
      jobTitle: job.title,
      company: job.company,
      matchScore: job.matchScore,
      jobUrl: '',
      status: 'saved',
      notes: 'Discovered via AI Career Coach Chatbot',
      applicationId: null
    });
    showToastMsg(`📌 "${job.title}" saved to Job Tracker!`);
  };

  const handleApplyWithAI = (job: any) => {
    localStorage.setItem('jobDescription', `${job.title} at ${job.company}\n\nLocation: ${job.location}\nSalary: ${job.salary}\n\nDescription:\n${job.description}`);
    localStorage.setItem('jobUrl', '');
    showToastMsg('⚡ Job details loaded. Redirecting to Apply Wizard...');
    
    setTimeout(() => {
      window.location.href = '/apply';
    }, 1500);
  };

  const suggestionPills = [
    { label: '🔍 Find remote React Developer jobs', query: 'Recommend 3 remote React developer jobs matching my background.' },
    { label: '🎤 Mock interview practice', query: 'Start a mock interview for a software engineering position. Ask me the first question.' },
    { label: '📝 Critique my resume summary', query: 'Analyze the professional summary on my resume and give 3 suggestions to make it stronger.' },
    { label: '💡 Help explain my employment gap', query: 'I have a 6-month employment gap due to self-learning and traveling. How can I pitch this positively?' }
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
        
        {/* Header Summary */}
        <div className="flex-shrink-0 flex items-center justify-between mb-4 pb-4 border-b border-border-custom/50 bg-bg-main/50">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2 text-text-main">
              <MessageSquare className="w-5 h-5 text-primary" />
              AI Career Coach & Job Finder
            </h1>
            <p className="text-xs text-text-muted mt-0.5 font-bold">
              Powered by Gemini fallback chain. Ask career advice, find roles, or practice mock interview scripts.
            </p>
          </div>
          {resumeWordCount && (
            <div className="text-xs px-3 py-1 bg-primary text-bg-card rounded-full flex items-center gap-1.5 font-black animate-pulse shadow-sm">
              <CheckCircle className="w-3.5 h-3.5" /> Resume Linked
            </div>
          )}
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-5 hide-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const segments = isUser ? [] : parseMessageContent(msg.content);
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                  isUser 
                    ? 'bg-primary text-bg-card border-transparent shadow-sm' 
                    : 'bg-bg-card text-text-main border-border-custom/40 shadow-sm'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
                </div>

                {/* Bubble content */}
                <div className="space-y-2.5">
                  <div className={`rounded-2xl px-4.5 py-3.5 text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-primary text-bg-card border-none shadow-sm font-bold' 
                      : 'bg-bg-card text-text-main border-none shadow-custom-card'
                  }`}>
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="space-y-4">
                        {segments.map((seg, idx) => {
                          if (seg.type === 'text') {
                            return (
                              <div key={idx} className="whitespace-pre-wrap leading-relaxed space-y-2">
                                {seg.content?.split('\n\n').map((para, pIdx) => {
                                  const parts = para.split(/(\*\*[^*]+\*\*)/g);
                                  return (
                                    <p key={pIdx}>
                                      {parts.map((part, partIdx) => {
                                        if (part.startsWith('**') && part.endsWith('**')) {
                                          return <strong key={partIdx} className="text-text-main font-black">{part.slice(2, -2)}</strong>;
                                        }
                                        return part;
                                      })}
                                    </p>
                                  );
                                })}
                              </div>
                            );
                          } else if (seg.type === 'job' && seg.jobData) {
                            const job = seg.jobData;
                            const scoreColor = job.matchScore >= 85 ? 'text-green-600 bg-green-500/10 border-green-550/20'
                              : job.matchScore >= 70 ? 'text-yellow-650 bg-yellow-500/10 border-yellow-550/20'
                              : 'text-red-500 bg-red-500/10 border-red-550/20';

                            return (
                              <div 
                                key={idx} 
                                className="my-3 bg-bg-main shadow-inner rounded-2xl p-4.5 flex flex-col md:flex-row justify-between gap-4 animate-in zoom-in-95 duration-200 relative overflow-hidden group border border-border-custom/25"
                              >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                                <div className="flex-1 space-y-2 pl-2">
                                  <div className="flex items-start justify-between flex-wrap gap-2">
                                    <div>
                                      <h4 className="font-black text-text-main text-sm leading-tight group-hover:text-primary transition-colors">{job.title}</h4>
                                      <p className="text-[10px] text-text-muted font-bold mt-0.5">{job.company}</p>
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${scoreColor}`}>
                                      <Sparkles className="w-3 h-3" /> {job.matchScore}% Match
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-text-muted font-bold pt-1">
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" /> {job.location}</span>
                                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> {job.salary}</span>
                                  </div>
                                  
                                  <p className="text-[10px] text-text-muted leading-relaxed pt-1.5 border-t border-border-custom/20 font-semibold">
                                    {job.description}
                                  </p>
                                </div>

                                <div className="flex flex-row md:flex-col justify-end gap-2 flex-shrink-0 md:border-l md:border-border-custom/20 md:pl-4">
                                  <button
                                    onClick={() => handleSaveToTracker(job)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-bg-card hover:bg-bg-main text-text-muted hover:text-text-main rounded-xl text-[10px] font-bold border border-border-custom/50 transition-all shadow-sm"
                                  >
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    Track Job
                                  </button>
                                  <button
                                    onClick={() => handleApplyWithAI(job)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-bg-card rounded-xl text-[10px] font-black transition-all shadow-sm"
                                  >
                                    Analyze Fit
                                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                  {/* Timestamp */}
                  <span className={`text-[9px] text-text-muted font-bold block ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-bg-card text-text-muted border border-border-custom/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-bg-card text-text-muted border-none shadow-custom-card rounded-2xl px-4 py-3 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-dot-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-dot-bounce delay-200" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-dot-bounce delay-400" />
              </div>
            </div>
          )}

          {/* Prompt Suggestion Chips */}
          {messages.length === 1 && !loading && (
            <div className="pt-4 max-w-lg mx-auto text-center space-y-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-black">Try asking me...</p>
              <div className="flex flex-col gap-2">
                {suggestionPills.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.query)}
                    className="w-full text-left px-4.5 py-3 bg-bg-card hover:bg-bg-main border border-border-custom/30 hover:border-primary/30 text-text-muted hover:text-text-main rounded-2xl text-xs transition-all hover:translate-x-1 active:translate-x-0 shadow-sm"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 pt-4 border-t border-border-custom/50 bg-bg-main">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
            className="flex gap-2 relative items-center"
          >
            <input
              type="text"
              placeholder="Ask a question or find jobs matching your background..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-bg-card border-none shadow-custom-card rounded-2xl py-3.5 pl-4 pr-12 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 text-text-main"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2.5 p-2 bg-primary hover:bg-primary-hover disabled:bg-slate-350 disabled:text-slate-500 text-bg-card rounded-xl transition-colors shadow-sm"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
          <div className="text-[9px] text-text-muted font-bold text-center mt-2 flex justify-center items-center gap-1">
            <Info className="w-3 h-3 text-primary" /> Custom XML tagging supports instant job insertions to your Kanban board.
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-primary text-bg-card px-4 py-3 rounded-2xl shadow-custom-card text-xs font-black flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300">
            <CheckCircle className="w-4 h-4" /> {toast}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
