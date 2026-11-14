/**
 * Micah Mishael Lead Finder — Site Inspector Worker
 * -------------------------------------------------
 * Deployed as the Cloudflare Worker "lead-finder"
 * (https://lead-finder.mishael-c4d.workers.dev).
 *
 * Fetches a target website server-side (no CORS restrictions apply to
 * server-to-server requests) and scans the HTML for:
 *   - signals that the site is built on an old/outdated platform
 *   - signals that the site has (or lacks) ecommerce/checkout functionality
 *   - pitch hints: what the site DOES have (useful for no-ecommerce pitch angle)
 *   - email addresses published on the site
 *
 * USAGE:
 *   GET ?url=https://example.com
 *   -> { url, reachable, outdatedSignals: [...], hasEcommerce, pitchHints: [...], emails: [...] }
 *
 *   GET ?url=https://example.com&emails=1
 *   -> { url, reachable, emails: [...] }
 *   Email-only mode. Scans the home page, and if no email is found there,
 *   also scans up to 3 contact/about pages on the same site.
 */

// ── OUTDATED SITE PATTERNS ────────────────────────────────────────────────────
// Keep in sync with App.jsx
const OUTDATED_BUILDER_PATTERNS = [
  { re: /wix\.com|wixsite/i,            label: "Wix (legacy editor)" },
  { re: /weebly/i,                       label: "Weebly" },
  { re: /godaddy|websitebuilder/i,       label: "GoDaddy Builder" },
  { re: /jimdo/i,                        label: "Jimdo" },
  { re: /squarespace.*7\./i,             label: "Squarespace 7" },
  { re: /joomla/i,                       label: "Joomla" },
  { re: /flash|shockwave/i,              label: "Flash/Shockwave" },
  { re: /<frameset|<frame /i,            label: "HTML Frames" },
  { re: /font face=|<center>|marquee/i,  label: "Pre-2010 HTML" },
  { re: /<table[^>]*width=["']?\d+%?["']?/i, label: "Table-based layout" },
  // Stale copyright year — not when preceded by est./since/founded
  { re: /(?<!est\.?\s)(?<!established\s)(?<!since\s)(?<!founded\s)copyright.{0,20}(19|20)(0[0-9]|1[0-5])\b/i, label: "Stale copyright year" },
];

// Missing modern-web tag checks
function detectMissingModernTags(html) {
  const missing = [];
  if (!/name=["']viewport["']/i.test(html))           missing.push("No responsive viewport");
  if (!/<meta[^>]+name=["']description["']/i.test(html)) missing.push("No meta description");
  if (!/<meta[^>]+property=["']og:/i.test(html))      missing.push("No Open Graph tags");
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) missing.push("No canonical URL");
  return missing;
}

// ── ECOMMERCE PATTERNS ────────────────────────────────────────────────────────
// Strong signals: essentially unambiguous evidence of an online store
const ECOMMERCE_STRONG_PATTERNS = [
  /shopify/i,
  /woocommerce/i,
  /\/cart\.js|cart_count|cart-count|cart-drawer|cart-icon/i,
  /payfast|paypal\.com\/|stripe\.com|js\.stripe|yoco\.com|peach\s?payments|snapscan/i,
  // Additional SA & African payment gateways
  /ozow\.com|dpo\s?group|paygate|payu|zapper\.com|mobicred|capitecpay/i,
  /data-add-to-cart|add-to-cart-button|js-add-to-cart/i,
  /data-product-id|data-variant-id/i,
  /<form[^>]*(action=["'][^"']*cart|checkout)/i,
  /online\s?store|web\s?shop|webshop/i,
  // JSON-LD Product schema
  /"@type"\s*:\s*"Product"/i,
  // WooCommerce block themes & headless
  /wc-block|woocommerce-cart|woocommerce-checkout/i,
];

// Weak signals: can indicate ecommerce but also appear on non-commerce pages.
// Two or more together count as moderate evidence.
const ECOMMERCE_WEAK_PATTERNS = [
  /\badd\s?to\s?cart\b/i,
  /\bcheckout\b/i,
  /\bshopping\s?cart\b/i,
  /\bbuy\s?now\b/i,
  /\bprice\b.{0,40}\b(r|zar|\$|usd|gbp|€)\s?\d/i,
];

function detectEcommerce(html) {
  if (ECOMMERCE_STRONG_PATTERNS.some((re) => re.test(html))) return true;
  const weakMatches = ECOMMERCE_WEAK_PATTERNS.filter((re) => re.test(html)).length;
  return weakMatches >= 2;
}

// ── PITCH HINTS ───────────────────────────────────────────────────────────────
// What the site DOES have — useful for tailoring the no-ecommerce pitch angle
function detectPitchHints(html, hasEcommerce) {
  if (hasEcommerce) return [];
  const hints = [];
  if (/<form[^>]*>/i.test(html))                              hints.push("Has contact form");
  if (/whatsapp|wa\.me/i.test(html))                         hints.push("Uses WhatsApp");
  if (/price|pricelist|price.?list|our.?rates/i.test(html))  hints.push("Has price list");
  if (/book.?now|appointment|booking/i.test(html))           hints.push("Has booking");
  if (/gallery|portfolio|our.?work/i.test(html))             hints.push("Has gallery");
  if (/facebook\.com|instagram\.com|twitter\.com/i.test(html)) hints.push("Has social links");
  return hints;
}

// ── EMAIL EXTRACTION ──────────────────────────────────────────────────────────
const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]{0,63}@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}/gi;

// Addresses and domains that are placeholders, tracking or platform noise
const EMAIL_JUNK_DOMAINS = /(^|\.)(example\.(com|org|net)|domain\.com|email\.com|yourdomain\.|yoursite\.|yourcompany\.|company\.com|sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|wix\.com|squarespace\.com|godaddy\.com|wordpress\.(com|org)|w3\.org|schema\.org|googleapis\.com|gstatic\.com|cloudflare\.com|jquery\.com|mailchimp\.com|sentry\.wixpress\.com)$/i;
const EMAIL_JUNK_LOCAL = /^(your|you|name|user|username|email|test|john\.?doe|jane\.?doe|someone|info@example)$/i;
const EMAIL_FILE_EXT = /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|woff2?|ttf|eot|mp4|webm|pdf)$/i;

// Cloudflare "email protection" hides emails as data-cfemail="hex"
function decodeCfEmail(hex) {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = "";
    for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    return out;
  } catch {
    return "";
  }
}

function cleanEmail(raw) {
  let e = raw.trim().toLowerCase();
  try { e = decodeURIComponent(e); } catch { /* keep as is */ }
  e = e.replace(/^mailto:/, "").split("?")[0].replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(e)) return null;
  const [local, domain] = e.split("@");
  if (EMAIL_FILE_EXT.test(e)) return null;             // e.g. logo@2x.png
  if (EMAIL_JUNK_DOMAINS.test(domain)) return null;
  if (EMAIL_JUNK_LOCAL.test(local)) return null;
  if (/^[0-9a-f]{16,}$/.test(local)) return null;     // tracking hashes
  return e;
}

function extractEmails(html) {
  const found = new Set();
  const add = (raw) => { const e = cleanEmail(raw); if (e) found.add(e); };

  // 1. mailto: links (most reliable)
  for (const m of html.matchAll(/mailto:([^"'\s>?]+)/gi)) add(m[1]);
  // 2. Cloudflare-protected emails
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)) add(decodeCfEmail(m[1]));
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) add(decodeCfEmail(m[1]));
  // 3. Plain-text emails, incl. simple "name [at] domain [dot] com" obfuscation
  const text = html
    .replace(/&#64;|&#x40;|&commat;/gi, "@")
    .replace(/\s*[[(]\s*at\s*[\])]\s*/gi, "@")
    .replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".");
  for (const m of text.matchAll(EMAIL_RE)) add(m[0]);

  return [...found];
}

// Put emails on the business's own domain first, then generic inboxes
function rankEmails(emails, siteUrl) {
  let host = "";
  try { host = new URL(siteUrl).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  const score = (e) => {
    const [local, domain] = e.split("@");
    let s = 0;
    if (host && (domain === host || host.endsWith("." + domain) || domain.endsWith("." + host))) s += 10;
    if (/^(info|hello|contact|enquiries|enquiry|inquiries|admin|office|sales|bookings|reception)$/.test(local)) s += 3;
    if (/^(noreply|no-reply|donotreply|privacy|abuse|webmaster|postmaster)$/.test(local)) s -= 8;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a)).slice(0, 5);
}

// Same-site links that usually hold contact details
function findContactLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const links = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const href = m[1];
    const label = m[2].replace(/<[^>]+>/g, " ");
    if (!/contact|get-in-touch|getintouch|reach-us|about|kontak|find-us|enquir/i.test(href + " " + label)) continue;
    try {
      const u = new URL(href, base);
      if (!/^https?:$/.test(u.protocol)) continue;
      if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
      u.hash = "";
      const s = u.toString();
      if (s !== base.toString() && !links.includes(s)) links.push(s);
    } catch { /* ignore bad hrefs */ }
  }
  // Contact pages before about pages
  links.sort((a, b) => (/contact/i.test(b) ? 1 : 0) - (/contact/i.test(a) ? 1 : 0));
  return links.slice(0, 3);
}

// ── FETCH HELPER ──────────────────────────────────────────────────────────────
async function fetchHtml(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Pretend to be a normal browser — some sites block bare server requests
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { ok: false };
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return { ok: true, html: "", finalUrl: res.url || url };
    const html = (await res.text()).slice(0, 300000);
    return { ok: true, html, finalUrl: res.url || url };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

// ── MAIN ANALYSIS ─────────────────────────────────────────────────────────────
function analyze(url, html) {
  const outdatedSignals = [];

  // HTTP-only (worker follows redirects, so check original URL)
  if (/^http:\/\//i.test(url)) outdatedSignals.push("No HTTPS");

  // Builder/era patterns
  for (const p of OUTDATED_BUILDER_PATTERNS) {
    if (p.re.test(html)) outdatedSignals.push(p.label);
  }

  // Missing modern tags
  outdatedSignals.push(...detectMissingModernTags(html));

  const hasEcommerce = detectEcommerce(html);
  const pitchHints = detectPitchHints(html, hasEcommerce);
  const emails = rankEmails(extractEmails(html), url);

  return { url, reachable: true, outdatedSignals, hasEcommerce, pitchHints, emails };
}

async function findEmails(url) {
  const home = await fetchHtml(url, 9000);
  if (!home.ok) return { url, reachable: false, emails: [] };
  let emails = extractEmails(home.html || "");
  if (emails.length === 0 && home.html) {
    const pages = findContactLinks(home.html, home.finalUrl || url);
    const results = await Promise.all(pages.map((p) => fetchHtml(p, 7000)));
    for (const r of results) if (r.ok && r.html) emails.push(...extractEmails(r.html));
    emails = [...new Set(emails)];
  }
  return { url, reachable: true, emails: rankEmails(emails, home.finalUrl || url) };
}

// ── CORS HEADERS ──────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });

// ── WORKER ENTRY POINT ────────────────────────────────────────────────────────
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const params = new URL(request.url).searchParams;
    const target = params.get("url");
    const emailsOnly = params.get("emails") === "1";
    if (!target) return json({ error: "Missing ?url= parameter" }, 400);

    const unreachable = emailsOnly
      ? { url: target, reachable: false, emails: [] }
      : { url: target, reachable: false, outdatedSignals: [], hasEcommerce: false, pitchHints: [], emails: [] };

    let normalized;
    try {
      normalized = new URL(target);
      if (!/^https?:$/.test(normalized.protocol)) throw new Error("bad protocol");
    } catch {
      return json(unreachable);
    }

    if (emailsOnly) return json(await findEmails(normalized.toString()));

    const page = await fetchHtml(normalized.toString(), 9000);
    if (!page.ok) return json(unreachable);
    if (!page.html) return json({ ...unreachable, reachable: true });
    return json(analyze(target, page.html));
  },
};
