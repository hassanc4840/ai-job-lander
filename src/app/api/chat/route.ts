import { NextResponse } from 'next/server';
import { callAI } from '@/lib/llm';

export async function POST(req: Request) {
  const env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY:   process.env.GROQ_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  const hasAnyKey = Object.values(env).some(k => k?.trim());
  if (!hasAnyKey) {
    return NextResponse.json(
      {
        error:
          'No AI provider keys are configured.\n\nAdd at least one key (GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY) to your .env.local file.',
      },
      { status: 503 }
    );
  }

  let messages: { role: 'user' | 'assistant'; content: string }[];
  let resumeText: string | undefined;
  let trackerJobs: string | undefined;

  try {
    ({ messages, resumeText, trackerJobs } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages history is required.' }, { status: 400 });
  }

  // Optimize input tokens by truncating context sizes
  const slicedResume = resumeText ? resumeText.trim().slice(0, 1500) : undefined;
  const slicedTracker = trackerJobs ? trackerJobs.trim().slice(0, 800) : undefined;

  // Limit conversation history to the last 6 messages (sliding memory window)
  const recentMessages = messages.slice(-6);

  const systemPrompt = `You are the AI Job Coach & Finder, a warm, professional, and highly knowledgeable career advisor at AI Job Factory.
Your goal is to help candidates succeed in their job search. You can assist them with:
1. Career planning, resume critiques, and interview preparation.
2. Developing scripts and strategies to answer tough questions or address career gaps.
3. Recommending tailored job listings matching their preferences or background.

CONTEXT:
${slicedResume ? `- Candidate Resume (Brief): A resume has been uploaded by the user. Use this actual experience to write tailored answer scripts, suggest projects, or critique their fit.` : '- No resume uploaded yet. You can suggest they upload one via the Apply page.'}
${slicedTracker ? `- Active Tracker Board Jobs: ${slicedTracker}. Use this list to advise on their active applications.` : ''}

CRITICAL INSTRUCTIONS FOR JOB RECOMMENDATIONS:
If the user asks you to:
- Find jobs (e.g. "Find remote React developer jobs", "Look for product manager roles at Google")
- Recommend roles (e.g. "What jobs fit my resume?", "Suggest roles for me")
You MUST generate 2 to 3 mock job listings.
You MUST write each job recommendation using this EXACT custom XML tag format:
<job_recommendation title="[Job Title]" company="[Company Name]" location="[Location]" salary="[Salary range or estimate]" matchScore="[Match Score 0-100]" description="[2-3 sentence summary of requirements and details]" />

Write these XML tags directly inline within your response. The client-side parser will detect them and render them as premium interactive job cards.
Example response format:
"I found 2 React developer positions that match your background:
<job_recommendation title="Senior Frontend Developer" company="InnovateCorp" location="Remote, US" salary="$130,000 - $150,000" matchScore="92" description="Looking for a React and Next.js specialist to rebuild our core workflow engine. Experience with TailwindCSS and TypeScript is required." />

Let me know if you would like me to draft an application email or customize your cover letter for either of these!"

IMPORTANT RULES:
- Base advice on their actual experience.
- Keep responses relatively brief and highly professional (under 300 words). Avoid long, overwhelming text blocks.
- Answer in structured, clear markdown (bullets, bolding).`;

  // Format the sliding window history for LLM prompt
  const formattedHistory = recentMessages
    .map(m => `${m.role === 'user' ? 'Candidate' : 'AI Job Coach'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = `${systemPrompt}

${slicedResume ? `--- CANDIDATE RESUME PROFILE ---\n${slicedResume}\n\n` : ''}${slicedTracker ? `--- CANDIDATE TRACKER LIST ---\n${slicedTracker}\n\n` : ''}--- CONVERSATION HISTORY (RECENT) ---
${formattedHistory}

AI Job Coach:`;

  try {
    const aiResult = await callAI(fullPrompt, env, 1200);

    return NextResponse.json({
      text: aiResult.text,
      provider: aiResult.provider,
      model: aiResult.model,
    });
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    console.error('[Chat API Error]', msg);

    if (msg.startsWith('NO_KEY')) {
      return NextResponse.json({ error: msg.replace('NO_KEY: ', '') }, { status: 503 });
    }
    return NextResponse.json({ error: `Chat AI failed: ${msg}` }, { status: 500 });
  }
}
