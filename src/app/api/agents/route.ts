import { NextResponse } from 'next/server';
import { callAI } from '@/lib/llm';

export async function POST(req: Request) {
  // Collect all configured provider keys from environment
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
          'No AI provider keys are configured.\n\nAdd at least one to your .env.local:\n' +
          '  GEMINI_API_KEY — https://aistudio.google.com/apikey (free)\n' +
          '  GROQ_API_KEY   — https://console.groq.com (free)\n' +
          '  OPENAI_API_KEY — https://platform.openai.com ($5 free trial)',
      },
      { status: 503 }
    );
  }

  let resumeText: string;
  let jobDescription: string;
  try {
    ({ resumeText, jobDescription } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!resumeText?.trim()) {
    return NextResponse.json(
      { error: 'Resume text is empty. Make sure your PDF was read correctly.' },
      { status: 400 }
    );
  }
  if (!jobDescription?.trim()) {
    return NextResponse.json(
      { error: 'Job description is empty. Please paste or fetch the job details.' },
      { status: 400 }
    );
  }

  const resume = resumeText.trim().slice(0, 4500);
  const job = jobDescription.trim().slice(0, 3500);

  try {
    // ── CALL 1: Analysis Agents ─────────────────────────────────────────────
    // Match score + Skills gap + Radar chart + Salary estimation + Interview coach + Missing Skills strategist
    // Returns structured JSON so any provider can handle it identically.
    const CALL_1_PROMPT = `You are a senior HR specialist, interview coach, and compensation analyst.

Given the RESUME and JOB DESCRIPTION below, return a single valid JSON object with NO markdown, NO code fences, NO explanation — ONLY raw JSON:

{
  "score": <integer 0-100, how well resume matches job>,
  "matched": [<array of 4-6 specific skills/tools present in BOTH resume and job>],
  "missing": [<array of 3-5 important skills in the job NOT found in resume>],
  "missingStrategies": [
    {
      "skill": "<exact skill name from missing array>",
      "strategy": "<a 2-3 sentence pivot/answer script to explain lacking this skill in an interview. Acknowledge it, connect to related transferrable skills you have, and express interest/capacity to pick it up instantly.>"
    }
  ],
  "radar": {
    "technical": <integer 0-100, technical skills match>,
    "experience": <integer 0-100, years/depth of experience match>,
    "leadership": <integer 0-100, leadership/ownership signals in resume vs job>,
    "communication": <integer 0-100, written communication quality and soft skills match>,
    "culturalFit": <integer 0-100, estimated cultural alignment based on language and values>,
    "education": <integer 0-100, education requirements match>
  },
  "salary": {
    "min": <integer, estimated minimum annual salary in USD>,
    "max": <integer, estimated maximum annual salary in USD>,
    "currency": "USD",
    "basis": "annual",
    "note": "<1 sentence explaining the estimate based on role, skills, seniority>"
  },
  "coach": [
    {"q": "<interview question>", "a": "<specific answer strategy using candidate's actual resume experience>"},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "..." , "a": "..."}
  ]
}

Generate exactly 7 coach Q&A items. Base answer strategies ONLY on the candidate's actual resume.
For salary, use current market data for the job title, required skills, and seniority level.

--- CANDIDATE RESUME ---
${resume}

--- JOB DESCRIPTION ---
${job}`;

    // ── CALL 2: Writing Agents + Gap Explainer ─────────────────────────────
    // 5 documents in one call, split by exact delimiter lines.
    // Bundled to minimise API requests and stay within free-tier RPM limits.
    const CALL_2_PROMPT = `You are a professional resume writer, cover letter specialist, career coach, and employment gap strategist.

Using the candidate's RESUME and the JOB DESCRIPTION below, produce FIVE documents separated by these EXACT delimiter lines:
===COVER_LETTER===
===FOLLOW_UP_EMAIL===
===COLD_OUTREACH===
===GAP_EXPLAINER===
===CANDIDATE_STRATEGY===

DOCUMENT 1 (before ===COVER_LETTER===): ATS-optimized resume.
Rules:
- Use ONLY facts from the original resume — never invent experience
- Add keywords from the job description naturally
- Improve bullets with action verbs and quantified results where possible
- Sections: Professional Summary, Technical Skills, Work Experience, Education

===COVER_LETTER===

DOCUMENT 2 (between ===COVER_LETTER=== and ===FOLLOW_UP_EMAIL===): A 3-paragraph professional cover letter.
Rules:
- Base on the candidate's actual experience from their resume only
- Be specific, human, confident — no clichés
- Start with "Dear Hiring Manager,"
- Identify any key skill gaps (technologies or skills in the job description that the candidate lacks). Proactively address this gap in the body of the cover letter by writing a highly motivating statement explaining how your existing transferrable experience enables you to master these missing skills rapidly.
- Under 300 words

===FOLLOW_UP_EMAIL===

DOCUMENT 3 (between ===FOLLOW_UP_EMAIL=== and ===COLD_OUTREACH===): A follow-up email sent 5 days after applying.
Rules:
- Subject line on first line (format: Subject: ...)
- Polite, confident, under 150 words
- Reference the specific role and company

===COLD_OUTREACH===

DOCUMENT 4 (between ===COLD_OUTREACH=== and ===GAP_EXPLAINER===): A cold outreach message to a recruiter or hiring manager on LinkedIn.
Rules:
- Short connection message format (under 280 characters for LinkedIn note)
- Then a full InMail message (under 200 words)
- Both separated by a blank line

===GAP_EXPLAINER===

DOCUMENT 5 — PART A (between ===GAP_EXPLAINER=== and ===CANDIDATE_STRATEGY===): Gap Explainer — recruiter-facing paragraph.
- Carefully analyze the RESUME for any employment gaps (periods with no listed job, unexplained breaks, overlapping dates)
- Write a confident, honest 3-5 sentence paragraph to insert into the cover letter
- Acknowledge the gap briefly and without apology
- Turn the gap into a strength: what was learned, built, or developed during that time
- Directly connect it to the specific skills/traits this recruiter is looking for
- Tone: professional, forward-looking, warm — NOT defensive
- If NO significant gap detected (< 3 months): write only "No significant employment gap detected."

===CANDIDATE_STRATEGY===

DOCUMENT 5 — PART B (after ===CANDIDATE_STRATEGY===): Gap Explainer — private coaching note for the candidate only.
- If a gap exists: list the specific dates/duration of the gap detected
- Explain exactly WHY recruiters might flag this (their typical concern)
- Give 3-4 specific strategies to address it in interviews (STAR-format examples if possible)
- Suggest skills/certifications that would bridge the gap for THIS specific job
- Tone: supportive coach, direct and practical
- If no gap: confirm this and give 1 proactive tip

--- CANDIDATE RESUME ---
${resume}

--- JOB DESCRIPTION ---
${job}`;

    // ── Run 2 parallel calls with automatic provider fallback ───────────────
    // Each call independently tries Gemini → Groq → OpenAI until one works.
    // Pass optimized maxTokens (1500 and 3000) to fit within free tier TPM limits.
    const [call1Result, call2Result] = await Promise.all([
      callAI(CALL_1_PROMPT, env, 1500),
      callAI(CALL_2_PROMPT, env, 3000),
    ]);

    const analysisRaw = call1Result.text;
    const writingRaw  = call2Result.text;

    // ── Parse Call 1: JSON ─────────────────────────────────────────────────
    type RadarData = {
      technical: number; experience: number; leadership: number;
      communication: number; culturalFit: number; education: number;
    };
    type SalaryData = { min: number; max: number; currency: string; basis: string; note: string };
    type AnalysisResult = {
      score: number;
      matched: string[];
      missing: string[];
      missingStrategies?: { skill: string; strategy: string }[];
      radar: RadarData;
      salary: SalaryData;
      coach: { q: string; a: string }[];
    };

    let analysisData: AnalysisResult = {
      score: 0, matched: [], missing: [], missingStrategies: [],
      radar: { technical: 0, experience: 0, leadership: 0, communication: 0, culturalFit: 0, education: 0 },
      salary: { min: 0, max: 0, currency: 'USD', basis: 'annual', note: '' },
      coach: [],
    };

    try {
      const clean = analysisRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      analysisData = JSON.parse(clean);
    } catch {
      const match = analysisRaw.match(/\{[\s\S]*\}/);
      if (match) {
        try { analysisData = JSON.parse(match[0]); } catch {}
      }
    }

    // ── Parse Call 2: Split on delimiters ─────────────────────────────────
    const splitOn = (text: string, delimiter: string): [string, string] => {
      const idx = text.indexOf(delimiter);
      if (idx === -1) return [text.trim(), ''];
      return [text.slice(0, idx).trim(), text.slice(idx + delimiter.length).trim()];
    };

    const [resumeOutput, afterResume]          = splitOn(writingRaw,    '===COVER_LETTER===');
    const [coverOutput, afterCover]            = splitOn(afterResume,   '===FOLLOW_UP_EMAIL===');
    const [followUpOutput, afterFollowUp]      = splitOn(afterCover,    '===COLD_OUTREACH===');
    const [coldOutreachOutput, afterOutreach]  = splitOn(afterFollowUp, '===GAP_EXPLAINER===');
    const [gapCoverParagraph, gapCoachingNote] = splitOn(afterOutreach, '===CANDIDATE_STRATEGY===');

    const hasGap = !gapCoverParagraph.toLowerCase().includes('no significant employment gap');

    return NextResponse.json({
      gap: {
        score: analysisData.score,
        matched: analysisData.matched,
        missing: analysisData.missing,
        missingStrategies: analysisData.missingStrategies || [],
      },
      radar: analysisData.radar,
      salary: analysisData.salary,
      resume: resumeOutput,
      cover: coverOutput,
      email: {
        followUp: followUpOutput,
        coldOutreach: coldOutreachOutput,
      },
      coach: analysisData.coach,
      gapExplainer: {
        hasGap,
        coverParagraph: gapCoverParagraph.trim(),
        coachingNote: gapCoachingNote.trim(),
      },
      isLive: true,
      // Show which providers were actually used for each call
      modelUsed: `${call1Result.provider}/${call1Result.model} + ${call2Result.provider}/${call2Result.model}`,
      providers: {
        analysis: { provider: call1Result.provider, model: call1Result.model },
        writing:  { provider: call2Result.provider, model: call2Result.model },
      },
    });

  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    console.error('[Pipeline Error]', msg);

    if (msg.startsWith('NO_KEY')) {
      return NextResponse.json(
        { error: msg.replace('NO_KEY: ', '') },
        { status: 503 }
      );
    }
    if (msg.startsWith('ALL_FAILED')) {
      return NextResponse.json(
        {
          error:
            'All AI providers failed (quota or error).\n\nPlease wait ~1 minute for rate limits to reset, then try again.\n\nTo add more providers, add GROQ_API_KEY or OPENAI_API_KEY to your .env.local file.',
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: `AI pipeline failed: ${msg}` }, { status: 500 });
  }
}
