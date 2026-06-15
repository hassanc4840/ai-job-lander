import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Phrases that signal a login wall
const LOGIN_WALL_PHRASES = [
  'sign in to',
  'log in to',
  'create an account',
  'sign in with apple',
  'sign in with google',
  'sign in with a passkey',
  'by clicking continue, you agree',
  'authwall',
  'join now to see',
  'please log in',
  'to apply for this job',
  'register to view',
];

// Keywords that confirm real job content was found
const JOB_CONTENT_KEYWORDS = [
  'responsibilities',
  'qualifications',
  'requirements',
  'experience',
  'skills',
  'salary',
  'benefits',
  'about the role',
  'about the job',
  'job description',
  'what you will do',
  "what you'll do",
  'who we are',
  'we are looking for',
  'you will be',
  'minimum qualifications',
  'preferred qualifications',
  'we offer',
  'what we offer',
  'equal opportunity',
];

function isLoginWall(text: string): boolean {
  const lower = text.toLowerCase();
  const loginHits = LOGIN_WALL_PHRASES.filter(p => lower.includes(p)).length;
  const jobHits = JOB_CONTENT_KEYWORDS.filter(p => lower.includes(p)).length;
  return loginHits >= 2 && jobHits < 2;
}

function hasJobContent(text: string): boolean {
  const lower = text.toLowerCase();
  return JOB_CONTENT_KEYWORDS.filter(p => lower.includes(p)).length >= 2;
}

/**
 * Strategy 1: Direct fetch with realistic browser headers + Cheerio parsing.
 * Works for Greenhouse, Lever, Workday, and most static career pages.
 */
async function fetchDirect(url: string): Promise<string | null> {
  const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  ];
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
        Connection: 'keep-alive',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, img, svg, video, header, footer, nav').remove();

    const selectors = [
      // Platform-specific selectors
      '#jobDescriptionText', '.jobsearch-jobDescriptionText', // Indeed
      '[data-test="description"]', '[data-testid="job-description"]', // Glassdoor
      '#content', '.posting-description', '.job-post-content', // Greenhouse / Lever
      '[class*="job-description"]', '[id*="job-description"]',
      '[class*="jobDescription"]', '[id*="jobDescription"]',
      '.job-details', '#job-details', '.job-content',
      // Workday
      '[data-automation-id="jobPostingDescription"]',
      // Generic
      'article', 'main', '[role="main"]', '.content', '#main-content',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        const text = el.text().replace(/\s+/g, ' ').trim();
        if (text.length > 200 && hasJobContent(text)) {
          return text.slice(0, 12000);
        }
      }
    }

    // Full-body fallback
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (hasJobContent(bodyText)) return bodyText.slice(0, 12000);

    return null;
  } catch {
    return null;
  }
}

/**
 * Strategy 2: Jina.ai Reader — free headless-browser proxy.
 * Prepend https://r.jina.ai/ to any URL; returns clean markdown.
 * Works for LinkedIn, Indeed, and most JS-rendered pages.
 */
async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        Accept: 'text/plain',
        'X-Return-Format': 'text',
        'X-Timeout': '25',
      },
      signal: AbortSignal.timeout(28000),
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (text && text.length > 300 && hasJobContent(text)) {
      return text.slice(0, 12000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Strategy 3: Google Cache — fetch Google's cached copy of the page.
 * Google's crawler has already seen the page with no IP restrictions.
 * Works for ~60-70% of job posts that Google has indexed.
 */
async function fetchViaGoogleCache(url: string): Promise<string | null> {
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}&hl=en`;
    const res = await fetch(cacheUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, header, footer, nav').remove();

    // Remove Google's cache banner
    $('#google-cache-hdr').remove();

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (bodyText.length > 200 && hasJobContent(bodyText)) {
      return bodyText.slice(0, 12000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Strategy 4: ScraperAPI — rotating residential proxy with JS rendering.
 * Requires SCRAPER_API_KEY in .env.local (free tier: 1000 req/month).
 * Use render=true to handle SPA career pages (React/Vue/Angular).
 * Sign up free at: https://scraperapi.com
 */
async function fetchViaScraperAPI(url: string, apiKey: string): Promise<string | null> {
  try {
    const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;
    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, header, footer, nav').remove();

    const selectors = [
      '#jobDescriptionText', '.jobsearch-jobDescriptionText',
      '[data-test="description"]', '[data-automation-id="jobPostingDescription"]',
      '#content', '.posting-description', 'article', 'main',
    ];

    for (const selector of selectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        const text = el.text().replace(/\s+/g, ' ').trim();
        if (text.length > 200 && hasJobContent(text)) {
          return text.slice(0, 12000);
        }
      }
    }

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (hasJobContent(bodyText)) return bodyText.slice(0, 12000);
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { url, linkedinCookie } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isLinkedIn = hostname.includes('linkedin.com');
    const scraperApiKey = process.env.SCRAPER_API_KEY || '';

    // ── LinkedIn with user cookie ──────────────────────────────────────────
    if (isLinkedIn && linkedinCookie) {
      console.log('[Scraper] LinkedIn with li_at cookie — trying authenticated fetch');
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Cookie: `li_at=${linkedinCookie}`,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          $('script, style, noscript, iframe, header, footer, nav').remove();
          const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
          if (hasJobContent(bodyText) && !isLoginWall(bodyText)) {
            return NextResponse.json({ text: bodyText.slice(0, 12000), method: 'linkedin_cookie' });
          }
        }
      } catch {
        // Fall through to Jina
      }
    }

    // ── 4-strategy fallback chain ──────────────────────────────────────────
    // Strategy order: Direct → Jina → Google Cache → ScraperAPI
    const strategies: [string, () => Promise<string | null>][] = [
      ['direct', () => fetchDirect(url)],
      ['jina', () => fetchViaJina(url)],
      ['google_cache', () => fetchViaGoogleCache(url)],
    ];

    if (scraperApiKey) {
      strategies.push(['scraperapi', () => fetchViaScraperAPI(url, scraperApiKey)]);
    }

    let lastResult: string | null = null;
    let successMethod = '';

    for (const [method, fetcher] of strategies) {
      console.log(`[Scraper] Trying strategy: ${method} for ${hostname}`);
      const result = await fetcher();

      if (result && !isLoginWall(result)) {
        return NextResponse.json({ text: result, method });
      }

      if (result) lastResult = result; // keep in case we want to show something
    }

    // All strategies failed
    if (lastResult) {
      // We got content but it seems to be a login wall
      return NextResponse.json(
        {
          error: isLinkedIn
            ? '🔒 LinkedIn requires login to view this job.\n\nTo bypass this, you can:\n1. Open the job link in your browser while logged in\n2. Copy the full job description text\n3. Click "Switch to Paste Text" below\n\nOR enter your LinkedIn session cookie in the advanced settings above.'
            : '🔒 This page requires login. Please copy the job description and paste it manually.',
          isLoginWall: true,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: 'Could not extract job content from this page.\n\nThis site may block automated access. Try:\n1. Copying the job description and using "Paste Text" mode\n2. Adding a SCRAPER_API_KEY to your .env.local for better bypass',
        isLoginWall: false,
      },
      { status: 422 }
    );
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please paste the job description manually.' },
      { status: 500 }
    );
  }
}
