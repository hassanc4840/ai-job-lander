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

  // Optimize input tokens by slicing inputs to a tighter character window
  const resume = resumeText.trim().slice(0, 2800);
  const job = jobDescription.trim().slice(0, 2000);

  try {
    // ── CALL 1: Analysis Agents (Match score + Radar + Salary + Coach + Strategies)
    // Reduce coach Q&A to exactly 4 items to optimize token limits
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
    {"q": "...", "a": "..."}
  ]
}

Generate exactly 4 coach Q&A items. Base answer strategies ONLY on the candidate's actual resume.
For salary, use current market data for the job title, required skills, and seniority level.

--- CANDIDATE RESUME ---
${resume}

--- JOB DESCRIPTION ---
${job}`;

    // ── CALL 2: Writing Agents + Gap Explainer
    const CALL_2_PROMPT = `You are a professional resume writer, cover letter specialist, and career coach.

Using the RESUME and JOB DESCRIPTION below, produce 5 documents separated by EXACT delimiters. Do NOT skip any delimiter.

DOCUMENT 1 — ATS Resume (output BEFORE ===COVER_LETTER===):
- Keep ALL facts from the original resume, never invent experience
- Naturally add missing keywords from the job description into bullets
- Strengthen bullets with action verbs and quantified results
- Sections: Professional Summary | Technical Skills | Work Experience | Education

===COVER_LETTER===
DOCUMENT 2 — Cover Letter (3 paragraphs, under 280 words):
- Start: "Dear Hiring Manager,"
- Specific to candidate's real experience, no clichés
- Address any skill gaps confidently with transferable skills

===FOLLOW_UP_EMAIL===
DOCUMENT 3 — Follow-up email (Subject line first, under 120 words, send 5 days after applying)

===COLD_OUTREACH===
DOCUMENT 4 — LinkedIn message to recruiter (under 100 words, value-hook focused)

===GAP_EXPLAINER===
DOCUMENT 5A — Employment gap recruiter paragraph:
- If gap exists (>3 months): 3-5 confident sentences for cover letter. Turn gap into strength.
- If NO gap: write exactly "No significant employment gap detected."

===CANDIDATE_STRATEGY===
DOCUMENT 5B — Private coaching note (candidate eyes only):
- If gap: dates, why recruiters flag it, 3 interview strategies
- If no gap: 1 proactive tip

--- RESUME ---
${resume}

--- JOB DESCRIPTION ---
${job}`;

    // Call 1: 1200 tokens for JSON analysis. Call 2: 3500 tokens for full document set.
    const [call1Result, call2Result] = await Promise.all([
      callAI(CALL_1_PROMPT, env, 1200),
      callAI(CALL_2_PROMPT, env, 3500),
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
