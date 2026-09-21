# kylemcconnell.com

Static single-page site: Kyle McConnell's bio and work, a portfolio of the software he
has built, and links out to every site he runs. Visitors arrive, scan, and click
through.

**There is no JavaScript on the deployed site.** No framework, no build step, no
runtime behavior — plain HTML and CSS. The cards are written into `index.html`; a local
script generates them from `sites.json` so adding a site stays a one-object edit.

```
index.html        home page: bio, timeline, what Kyle does, portfolio cards
sites/index.html  all sites, grouped by section
sites/<slug>/     one page per section, listing only that section
styles.css        all styles, shared by every page (light + dark)
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
| `category` | Who the site is for: `My businesses`, `Sites I've built for others`, `Sports programs`, `Family sites`, or `Personal sites`. One per site: every site appears in exactly one section. Filter buttons appear only for categories in use. Civic roles are never a category — they are plain text in their own section. |
| `built` | `true` = Kyle built it, so it also appears under "Things I've built". `false` = directory listing only. |
| `stack` | tech tags; omit or leave `[]` if not applicable |
| `status` | `live`, `coming-soon`, `seasonal`, or `private` (password or sign-in required). Anything other than `live` shows a badge on the card. |
| `linkable` | `false` for login-only/internal tools — the card renders with no outbound link |

Then regenerate the cards in `index.html`:

```bash
node tools/build-cards.mjs
```

In `index.html` it rewrites two generated blocks and leaves the rest alone: `BUILT`
(the portfolio cards) and `NAV` (the tab bar). Everything under `sites/` is generated
whole — `sites/index.html` plus one folder per section — so do not hand-edit those
files; change `sites.json` or the template in the script and re-run.

**A tab is a page, not an anchor.** `/sites/family-sites/` lists the family sites and
nothing else. That is the point: anchors on one long page meant every other section
was still sitting there under the one you jumped to. Adding a category to `sites.json`
creates its page and its tab; emptying one removes both. Add new pages to `sitemap.xml`
by hand.

Run it any time `sites.json` changes, and commit every file it touches. It refuses to run on an entry
missing `id`, `name`, or `category`, or using a category outside the list below.

Nothing about this is a deploy step: Render serves the committed files exactly as they
are. If you would rather edit the card markup in `index.html` by hand, that works too —
just keep `sites.json` in step, or the next run of the script will overwrite your edits.

Card order is fixed by category (My businesses, Sites I've built for others, Sports
programs, Family sites, Personal sites), then alphabetically — customer-facing sites come first without any manual
ordering. Each category becomes a plain heading above its own row of cards — there are
no filter buttons and nothing to click but the links themselves.

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

Hosted on **GitHub Pages**, published from the `main` branch, `/ (root)` folder.
Repo settings > Pages > Source: *Deploy from a branch* > Branch: `main` `/ (root)` > Save.

Push to `main` and Pages republishes automatically. There is nothing to compile — if it
renders locally, it renders in production.

Two files in the repo root support this:

- `CNAME` — the custom domain Pages serves, currently `kylemcconnell.com`. This file
  *is* the custom-domain setting: every push overwrites whatever the Pages screen shows,
  so change the domain here, not only in the web UI.
- `.nojekyll` — stops Pages running the files through Jekyll. Nothing here needs it.

**Render is the alternative host** if Pages is ever a problem: New > Static Site >
connect this repo, build command none, publish directory `.` (repo root), auto-deploy on.
Delete `CNAME` if you switch, since Render manages its domains in its own dashboard.

Local preview:

```bash
npx http-server . -p 8080 -c-1
```

## DNS

The domain is registered and its DNS is hosted at **Microsoft 365 admin center >
Settings > Domains > kylemcconnell.com > DNS records**. Nameservers are Microsoft's and
cannot be moved without transferring the domain, so hosting must work with plain `A` and
`CNAME` records. Both GitHub Pages and Render do.

For GitHub Pages, after adding the custom domain in repo settings > Pages, add what that
screen tells you to add. At the time of writing that is:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` | the four apex IPs GitHub lists on the Pages settings screen | 1 hour |
| CNAME | `www` | `mcconnellentllc-cloud.github.io` | 1 hour |

`kylemcconnell.com` is canonical, which is what the `CNAME` file in the repo root says.
The `www` record exists only so `www.kylemcconnell.com` redirects to the apex. **Use the values the Pages screen shows — do not use values from
memory.** For Render, use the IP and `*.onrender.com` hostname shown under Settings >
Custom Domains instead.

**Do not touch** existing MX, TXT, autodiscover, or SRV records — those run Microsoft
365 email. **Do not** click "Set as default" on the domain in M365; that changes the
default domain for the whole McConnell Enterprises tenant.

## Keeping this site alive

The site is plain HTML and CSS. No JavaScript, no framework, no build step, no package
to update, and no server-side code. Left completely alone
it will keep rendering correctly in any browser for as long as the two things below
are paid for:

1. **The domain** — `kylemcconnell.com`, registered through the Microsoft 365 admin
   center on the McConnell Enterprises tenant, auto-renew on. If that lapses, the
   address stops resolving and the site is unreachable even though the files are fine.
2. **The host** — GitHub Pages, serving the `main` branch of this repo. If GitHub goes
   away or the account closes, copy these files to any static host (Render, Netlify,
   a plain web server) and repoint the DNS records. Nothing in the code is
   host-specific.

If both lapse, the site goes dark but is not lost: this repository is the whole site.
Anyone with these files and a domain can put it back up in an afternoon.

## Social accounts

Add a `social` array beside `sites` in `sites.json`:

```json
"social": [
  { "id": "facebook", "name": "Facebook", "url": "https://facebook.com/…" }
]
```

`id` picks the icon and must be one of `facebook`, `x`, `linkedin`, `instagram`, or
`tiktok` — the generator stops if it does not recognize one. The links render in the
footer of every page. Leave the array out and nothing renders.

## Section colors

Each section has its own accent: businesses crimson, built for others green, sports
amber, family plum, personal navy. The generator puts a `sec-<slug>` class on every
group heading, list and card, and the CSS reads `--sec` from it, so a card, its
heading, its links and its page header all pick up the right color with no per-section
rules. All ten accents (five sections, two themes) clear WCAG AA.
