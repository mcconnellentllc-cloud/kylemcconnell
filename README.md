# kylemcconnell.com

Static single-page site: a directory of every public site Kyle McConnell runs, plus a
portfolio of the software he has built. No framework, no build step — the files in this
repo are what gets served.

```
index.html        page markup, SEO tags, JSON-LD
styles.css        all styles (light + dark via prefers-color-scheme)
main.js           renders cards from sites.json, category filters, footer year
sites.json        single source of truth for every site listed
img/              screenshots (WebP), Open Graph image, touch icon
favicon.svg       site icon
footer-snippet.html  copy-paste cross-link footer for Kyle's other sites
tools/            local maintenance scripts (never run at deploy time)
```

## Add or edit a site

Add one object to the `sites` array in `sites.json`:

```json
{
  "id": "m77ag",
  "name": "M77 AG",
  "url": "https://m77ag.com",
  "category": "My businesses",
  "description": "One sentence, plain language.",
  "built": true,
  "stack": ["React", "Node", "MongoDB"],
  "image": "img/m77ag.webp",
  "status": "live",
  "linkable": true
}
```

| Field | Meaning |
|---|---|
| `id` | lowercase slug; also the screenshot filename (`img/<id>.webp`) |
| `category` | Who the site is for: `My businesses`, `Built for others`, `Tools`, `Family`, or `Personal`. One per site, no overlap. Filter buttons appear only for categories in use. Civic roles are never a category — they are plain text in their own section. |
| `built` | `true` = Kyle built it, so it also appears under "Things I've built". `false` = directory listing only. |
| `stack` | tech tags; omit or leave `[]` if not applicable |
| `status` | `live`, `coming-soon`, or `seasonal`. Non-live statuses show a badge. |
| `linkable` | `false` for login-only/internal tools — the card renders with no outbound link |

Then regenerate the no-JavaScript fallback list:

```bash
node tools/sync-noscript.mjs
```

That rewrites the block between the `NOSCRIPT:START` / `NOSCRIPT:END` markers in
`index.html`. Run it any time `sites.json` changes, and commit both files.

Card order is fixed by category (My businesses, Built for others, Tools, Family,
Personal), then alphabetically — customer-facing sites come first without any manual
ordering.

Category and `built` are two different questions. Category is *who the site is for*;
`built` is *who wrote the code*. A site can sit under "My businesses" and still appear
in the portfolio because `built` is `true`.

## Replace a screenshot

Screenshots are 1280x800 WebP, 60 KB or less, lazy-loaded with explicit dimensions.

```bash
npm install playwright sharp && npx playwright install chromium
node tools/capture.mjs            # every public site in sites.json
node tools/capture.mjs m77ag      # just one, by id
```

The script writes `img/<id>.webp`, stepping quality down until it fits the 60 KB
budget, and warns if it cannot. It skips `linkable: false` sites on purpose — never
capture behind a login. For those, drop a supplied image at `img/<id>.webp` sized
1280x800 and convert it:

```bash
node -e "require('sharp')('input.png').resize(1280,800,{fit:'cover'}).webp({quality:75}).toFile('img/<id>.webp')"
```

`node_modules/` is gitignored; the tooling is local-only and never ships.

## Civic roles

Colorado FSA State Committee and Colorado Corn Growers Association service is plain
text in the "Civic & community" section of `index.html`. Keep it out of the card grid,
use no USDA/FSA logos, and do not link the STC site unless it is confirmed public.

## Deploy

Hosted as a **Render Static Site** connected to this repo.

- Build command: *(none)*
- Publish directory: `.` (repo root)
- Auto-deploy on push: on

Push to the deploy branch and Render rebuilds automatically. There is nothing to
compile — if it renders locally, it renders in production.

Local preview:

```bash
npx http-server . -p 8080 -c-1
```

## DNS

The domain is registered and its DNS is hosted at **Microsoft 365 admin center >
Settings > Domains > kylemcconnell.com > DNS records**. Nameservers are Microsoft's
and cannot be moved without transferring the domain, so hosting must work with plain
`A` and `CNAME` records.

Records for Render (use the exact values Render shows under Settings > Custom Domains —
never values from memory):

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` | IP address shown by Render | 1 hour |
| CNAME | `www` | `<name>.onrender.com` shown by Render | 1 hour |

**Do not touch** existing MX, TXT, autodiscover, or SRV records — those run Microsoft
365 email. **Do not** click "Set as default" on the domain in M365; that changes the
default domain for the whole McConnell Enterprises tenant.
