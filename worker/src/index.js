import { validateLicense } from './auth.js';
import { incrementExports } from './kv.js';
import { handleStripeWebhook } from './stripe.js';
import { renderPDF } from './render/pdf.js';
import { renderDOCX } from './render/docx.js';

/**
 * MDExport Cloudflare Worker
 *
 * Endpoints:
 *   POST /export            — Render markdown to PDF or DOCX
 *   POST /validate-license  — Check license key status
 *   POST /webhook           — Stripe webhook receiver
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (request.method === 'POST' && url.pathname === '/export') {
        const response = await handleExport(request, env);
        addCorsHeaders(response, corsHeaders);
        return response;
      }

      if (request.method === 'POST' && url.pathname === '/validate-license') {
        const response = await handleValidateLicense(request, env);
        addCorsHeaders(response, corsHeaders);
        return response;
      }

      if (request.method === 'POST' && url.pathname === '/webhook') {
        return await handleStripeWebhook(request, env);
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Worker error:', err);
      const response = jsonResponse({ error: err.message || 'Internal error' }, 500);
      addCorsHeaders(response, corsHeaders);
      return response;
    }
  },
};

// ── /export ──────────────────────────────────────────────────────────

async function handleExport(request, env) {
  // Enforce size limit (1MB)
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > 1_048_576) {
    return jsonResponse({ error: 'Request too large (max 1MB)' }, 413);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { markdown, format = 'pdf', license_key, options = {} } = body;

  if (!markdown || typeof markdown !== 'string') {
    return jsonResponse({ error: 'Missing or invalid "markdown" field' }, 400);
  }

  if (markdown.length > 500_000) {
    return jsonResponse({ error: 'Markdown too large (max 500KB)' }, 413);
  }

  // Validate license
  const license = await validateLicense(license_key, env);
  const licensed = !!license;

  // Gate premium features
  if (!licensed) {
    if (format === 'docx') {
      return jsonResponse({ error: 'LICENSE_REQUIRED', message: 'DOCX export requires a license.' }, 403);
    }
    options.theme = 'clean';
    options.font = 'sans';
    options.cover = { enabled: false };
    options.margins = 'normal';
    options.line_spacing = 1.15;
    options.header = null;
    options.footer = null;
    options.page_numbers = false;
    options.accent_color = null;
  }

  let result;
  if (format === 'pdf') {
    result = await renderPDF(markdown, options, env);
  } else if (format === 'docx') {
    result = await renderDOCX(markdown, options, env);
  } else {
    return jsonResponse({ error: `Unsupported format: ${format}` }, 400);
  }

  // Track export count for licensed users
  if (licensed && license_key) {
    await incrementExports(license_key, env);
  }

  return result;
}

// ── /validate-license ────────────────────────────────────────────────

async function handleValidateLicense(request, env) {
  const { license_key } = await request.json();
  if (!license_key) {
    return jsonResponse({ error: 'Missing license_key' }, 400);
  }

  const license = await validateLicense(license_key, env);
  if (!license) {
    return jsonResponse({ valid: false }, 200);
  }

  return jsonResponse({
    valid: true,
    email: license.email,
    status: license.status,
    exports_count: license.exports_count || 0,
  }, 200);
}

// ── Helpers ──────────────────────────────────────────────────────────

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function addCorsHeaders(response, corsHeaders) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
}
