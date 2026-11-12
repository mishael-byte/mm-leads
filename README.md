# Micah Mishael Lead Finder

Finds South African, US and Canadian businesses on Google Maps and saves them straight into the Micah Mishael CRM.

- **Live:** https://mm-leads.pages.dev (Cloudflare Pages, builds from `main`)
- **CRM:** https://mm-crm.pages.dev (same logins)

## How the Google key is kept safe

The Google Places key is **not** in this code. Every search goes to the Supabase Edge Function `places-search`, which holds the key as a secret, checks that the user is logged in and active, enforces the daily search limit (one area = one search, up to 3 pages of 20 results) and logs the search for the Founder's usage page.

## Environment variables (Cloudflare Pages → Settings → Variables)

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://ymizrwbxwzgxkkjntstb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the project's anon (public) key |
| `VITE_CRM_URL` | `https://mm-crm.pages.dev` |

## Website inspector

`site-inspector-worker.js` is the Cloudflare Worker that checks if a business website is outdated or has no online shop. It runs separately at `lead-finder.mishael-c4d.workers.dev`.
