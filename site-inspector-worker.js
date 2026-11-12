/**
 * Lead Empire Pro — Site Inspector Worker
 * ----------------------------------------
 * Fetches a target website server-side (no CORS restrictions apply to
 * server-to-server requests) and scans the HTML for:
 *   - signals that the site is built on an old/outdated platform
 *   - signals that the site has (or lacks) ecommerce/checkout functionality
 *
 * DEPLOY:
 * 1. Go to https://dash.cloudflare.com -> Workers & Pages -> Create -> Worker
 * 2. Paste this whole file into the editor, replacing the default code
 * 3. Click "Deploy"
 * 4. Copy the worker URL (looks like https://lead-empire-inspector.YOUR-SUBDOMAIN.workers.dev)
 * 5. Paste that URL into INSPECTOR_WORKER_URL in App.jsx
 *
 * USAGE:
 *   GET https://your-worker.workers.dev?url=https://example.com
 *   -> { url, reachable, outdatedSignals: [...], hasEcommerce: bool }
 */

// Keep these in sync with App.jsx
const OUTDATED_BUILDER_PATTERNS = [
  { re: /wix\.com|wixsite/i, label: "Wix (legacy editor)" },
  { re: /weebly/i, label: "Weebly" },
  { re: /godaddy|websitebuilder/i, label: "GoDaddy Builder" },
  { re: /jimdo/i, label: "Jimdo" },
  { re: /squarespace.*7\./i, label: "Squarespace 7" },
  { re: /joomla/i, label: "Joomla" },
  { re: /flash|shockwave/i, label: "Flash/Shockwave" },
  { re: /<frameset|<frame /i, label: "HTML Frames" },
  { re: /font face=|<center>|marquee/i, label: "Pre-2010 HTML" },
  // "Copyright 20xx" only — not when preceded by est./since/founded, which
  // usually refers to the business's founding date, not a stale footer.
  { re: /(?<!est\.?\s)(?<!established\s)(?<!since\s)(?<!founded\s)copyright.{0,20}(19|20)(0[0-9]|1[0-5])\b/i, label: "Stale copyright year" },
];

// Strong signals: platform fingerprints, payment gateways, or markup attributes
// that are essentially unambiguous evidence of an online store.
const ECOMMERCE_STRONG_PATTERNS = [
  /shopify/i,
  /woocommerce/i,
  /\/cart\.js|cart_count|cart-count|cart-drawer|cart-icon/i,
  /payfast|paypal\.com\/|stripe\.com|js\.stripe|yoco\.com|peach\s?payments|snapscan/i,
  /data-add-to-cart|add-to-cart-button|js-add-to-cart/i,
  /<form[^>]*(action=["'][^"']*cart|checkout)/i,
  /online\s?store|web\s?shop|webshop/i,
];

// Weak signals: common words that *can* indicate ecommerce but also show up on
// non-commerce pages. Two or more weak signals together count as moderate evidence.
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function analyze(url, html) {
  const outdatedSignals = [];
  for (const p of OUTDATED_BUILDER_PATTERNS) {
    if (p.re.test(html)) outdatedSignals.push(p.label);
  }
  if (!/name=["']viewport["']/i.test(html)) outdatedSignals.push("No responsive viewport tag");
  const hasEcommerce = detectEcommerce(html);
  return { url, reachable: true, outdatedSignals, hasEcommerce };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target) {
      return new Response(JSON.stringify({ error: "Missing ?url= parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    let normalized;
    try {
      normalized = new URL(target);
      if (!/^https?:$/.test(normalized.protocol)) throw new Error("bad protocol");
    } catch {
      return new Response(JSON.stringify({ url: target, reachable: false, outdatedSignals: [], hasEcommerce: false }), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(normalized.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          // Pretend to be a normal browser — some sites block bare server requests
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return new Response(JSON.stringify({ url: target, reachable: false, outdatedSignals: [], hasEcommerce: false }), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return new Response(JSON.stringify({ url: target, reachable: true, outdatedSignals: [], hasEcommerce: false }), {
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }

      const html = (await res.text()).slice(0, 200000);
      const result = analyze(target, html);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    } catch (e) {
      return new Response(JSON.stringify({ url: target, reachable: false, outdatedSignals: [], hasEcommerce: false }), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
  },
};
