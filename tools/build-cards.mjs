#!/usr/bin/env node
/*
 * Generates the site pages from sites.json.
 *
 * The deployed site is pure HTML and CSS with no JavaScript, so every page
 * exists as a real file. Edit sites.json, then run:
 *
 *   node tools/build-cards.mjs
 *
 * It writes:
 *   index.html          the portfolio cards and tab bar (rest of the file untouched)
 *   sites/index.html    the full index: every site, grouped
 *   sites/<slug>/       one page per category, listing only that category
 *
 * A tab is a page, not an anchor, so a visitor on Family sees Family only.
 * This is a local maintenance step, not a deploy build step — the host serves
 * the committed files as-is.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const CATEGORY_ORDER = ["My businesses", "Sites I've built for others", "Sports programs", "Family sites", "Personal sites"];
const STATUS_LABEL = { "coming-soon": "Coming soon", seasonal: "Seasonal", private: "Sign-in required" };

// Short labels for the tab bar; the full names stay on the section headings.
const NAV_LABEL = {
  "My businesses": "My businesses",
  "Sites I've built for others": "Built for others",
  "Sports programs": "Sports",
  "Family sites": "Family",
  "Personal sites": "Personal",
};
const INDENT = "    ";

// One line of context at the top of each category page.
const LEDE = {
  "My businesses": "The businesses I own and run.",
  "Sites I've built for others": "Sites I built and maintain for other people and organizations.",
  "Sports programs": "Teams and tournaments.",
  "Family sites": "Ours.",
  "Personal sites": "Projects and interests of my own.",
};

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const host = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const { sites = [], social = [] } = JSON.parse(readFileSync("sites.json", "utf8"));

// Simple one-colour glyphs; no external icon files, nothing to load.
const ICONS = {
  facebook:
    "M17 2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  x: "M3 3h4.5l4.2 5.8L16.8 3H21l-6.9 8L21.4 21h-4.5l-4.6-6.3L6.7 21H2.5l7.2-8.3z",
  linkedin:
    "M4.5 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM3 8.5h3V21H3zM9 8.5h2.9v1.7a3.2 3.2 0 0 1 2.9-1.6c3 0 3.7 1.9 3.7 4.5V21h-3v-6.3c0-1.5-.3-2.6-1.8-2.6s-2.1 1-2.1 2.5V21H9z",
  instagram:
    "M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.8-2.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z",
  suno:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm3.6 4.4v6.9a2.6 2.6 0 1 1-1.6-2.4V8.5l-4.4 1v5.6a2.6 2.6 0 1 1-1.6-2.4V8.2z",
  tiktok:
    "M16 2h-3v13.2a2.9 2.9 0 1 1-2.4-2.9V9.2A6.2 6.2 0 1 0 16 15.3V9.1a7.3 7.3 0 0 0 4 1.2V7.2A4.3 4.3 0 0 1 16 2.9z",
};

function socialLinks(pad = "      ") {
  if (!social.length) return "";
  const items = social.map((account) => {
    const path = ICONS[account.id];
    if (!path) {
      console.error(`No icon for social account "${account.id}".`);
      process.exit(1);
    }
    return `${pad}  <li><a href="${esc(account.url)}" target="_blank" rel="noopener me" aria-label="${esc(account.name)} (opens in a new tab)">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>` +
      `<span>${esc(account.name)}</span></a></li>`;
  });
  return `${pad}<ul class="social">\n${items.join("\n")}\n${pad}</ul>`;
}


for (const site of sites) {
  if (!site.id || !site.name || !site.category) {
    console.error(`Every site needs id, name and category. Bad entry: ${JSON.stringify(site)}`);
    process.exit(1);
  }
  if (!CATEGORY_ORDER.includes(site.category)) {
    console.error(`Unknown category "${site.category}" on "${site.id}". Use one of: ${CATEGORY_ORDER.join(", ")}`);
    process.exit(1);
  }
  if (site.linkable !== false && !site.url) {
    console.error(`"${site.id}" is linkable but has no url.`);
    process.exit(1);
  }
}

const byName = (a, b) => a.name.localeCompare(b.name);

function card(site, level, pad, showCategory = false) {
  const lines = [];
  lines.push(`${pad}<li class="card sec-${categoryId(site.category)}">`);

  if (site.image) {
    lines.push(
      `${pad}  <img class="card-media" src="${esc(site.image)}" alt="Screenshot of the ${esc(site.name)} website" loading="lazy" decoding="async" width="1280" height="800">`
    );
  }

  lines.push(`${pad}  <div class="card-body">`);

  if (showCategory) {
    lines.push(`${pad}    <p class="card-category">${esc(NAV_LABEL[site.category] || site.category)}</p>`);
  }

  const linkable = site.linkable !== false && site.url;
  lines.push(
    linkable
      ? `${pad}    <h${level}><a href="${esc(site.url)}" target="_blank" rel="noopener" aria-label="${esc(site.name)} (opens in a new tab)">${esc(site.name)}</a></h${level}>`
      : `${pad}    <h${level}>${esc(site.name)}</h${level}>`
  );

  if (STATUS_LABEL[site.status]) {
    lines.push(`${pad}    <p class="badge">${esc(STATUS_LABEL[site.status])}</p>`);
  }

  if (site.description) {
    lines.push(`${pad}    <p class="card-desc">${esc(site.description)}</p>`);
  }

  lines.push(
    linkable
      ? `${pad}    <p class="card-url">${esc(host(site.url))}</p>`
      : `${pad}    <p class="card-url">Private tool — no public link</p>`
  );

  if (Array.isArray(site.stack) && site.stack.length) {
    lines.push(`${pad}    <ul class="tags">`);
    for (const tag of site.stack) lines.push(`${pad}      <li class="tag">${esc(tag)}</li>`);
    lines.push(`${pad}    </ul>`);
  }

  lines.push(`${pad}  </div>`);
  lines.push(`${pad}</li>`);
  return lines.join("\n");
}

function indexRow(site, pad) {
  const linkable = site.linkable !== false && site.url;
  const name = linkable
    ? `<a href="${esc(site.url)}" target="_blank" rel="noopener" aria-label="${esc(site.name)} (opens in a new tab)">${esc(site.name)}</a>`
    : `<span class="index-name">${esc(site.name)}</span>`;
  const badge = STATUS_LABEL[site.status]
    ? ` <span class="index-badge">${esc(STATUS_LABEL[site.status])}</span>`
    : "";
  const note = linkable ? esc(host(site.url)) : "No public link";
  const desc = site.description ? `<span class="index-desc">${esc(site.description)}</span>` : "";
  return `${pad}<li>\n${pad}  <span class="index-head">${name}${badge}</span>\n${pad}  ${desc}\n${pad}  <span class="index-host">${note}</span>\n${pad}</li>`;
}

function categoryId(category) {
  return category.toLowerCase().replace(/[^a-z]+/g, "-");
}

const usedCategories = () => CATEGORY_ORDER.filter((c) => sites.some((s) => s.category === c));

// Tabs are links to pages. `current` marks the page you are on.
function navTabs(current, pad = "      ") {
  const out = [`${pad}<li><a href="/sites/"${current === "all" ? ' aria-current="page"' : ""}>All sites</a></li>`];
  for (const category of usedCategories()) {
    const href = `/sites/${categoryId(category)}/`;
    const active = current === category ? ' aria-current="page"' : "";
    out.push(`${pad}<li><a href="${href}"${active}>${esc(NAV_LABEL[category] || category)}</a></li>`);
  }
  return out.join("\n");
}

function listFor(category, pad = INDENT) {
  const group = sites.filter((site) => site.category === category).sort(byName);
  return [
    `${pad}<ul class="card-grid sec-${categoryId(category)}">`,
    ...group.map((s) => card(s, 3, `${pad}  `)),
    `${pad}</ul>`,
  ].join("\n");
}

function groupedIndex(pad = INDENT) {
  const out = [];
  for (const category of usedCategories()) {
    out.push(`${pad}<h2 class="group-title sec-${categoryId(category)}" id="group-${categoryId(category)}">${esc(category)}</h2>`);
    out.push(listFor(category, pad));
  }
  return out.join("\n");
}

function replaceBlock(html, name, body, indent = INDENT) {
  const start = html.indexOf(`<!-- ${name}:START`);
  const end = html.indexOf(`<!-- ${name}:END -->`);
  if (start === -1 || end === -1) {
    console.error(`Could not find the ${name} markers in the page.`);
    process.exit(1);
  }
  const startEnd = html.indexOf("-->", start) + 3;
  return html.slice(0, startEnd) + (body ? `\n${body}\n${indent}` : "\n" + indent) + html.slice(end);
}

// One template for every generated page under /sites/.
function page({ title, heading, lede, path, description, current, listing, count }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="https://kylemcconnell.com${path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kyle McConnell">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="https://kylemcconnell.com${path}">
<meta property="og:image" content="https://kylemcconnell.com/img/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="https://kylemcconnell.com/img/og.png">
<meta name="theme-color" content="#14110f" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0c0b" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="stylesheet" href="/styles.css">
</head>
<body${current && current !== "all" ? ` class="sec-${categoryId(current)}"` : ""}>
<a class="skip-link" href="#main">Skip to content</a>

<nav class="tab-nav" aria-label="Site sections">
  <div class="wrap">
    <ul>
${navTabs(current)}
    </ul>
  </div>
</nav>

<header class="site-header page-header">
  <div class="wrap">
    <p class="eyebrow"><a href="/">Kyle McConnell</a></p>
    <h1>${esc(heading)}</h1>
    <p class="lede">${esc(lede)}</p>
  </div>
</header>

<main id="main" class="wrap">
  <section aria-label="${esc(heading)}">
    <p class="count">${count === 1 ? "1 site" : `${count} sites`}</p>
${listing}
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
${socialLinks("    ")}
    <p><a href="/">Back to kylemcconnell.com</a></p>
    <p>&copy; Kyle McConnell &middot; Haxtun, Colorado</p>
  </div>
</footer>
</body>
</html>
`;
}

function skillTags(pad = INDENT) {
  const tags = [...new Set(sites.flatMap((s) => s.stack || []))].sort((a, b) => a.localeCompare(b));
  if (!tags.length) return "";
  return [`${pad}<ul class="tags tags-lg">`, ...tags.map((t) => `${pad}  <li class="tag">${esc(t)}</li>`), `${pad}</ul>`].join("\n");
}

// Public profiles for the Person schema: linkable sites, minus anything gated, plus social.
function sameAs() {
  const urls = [
    ...sites.filter((s) => s.linkable !== false && s.url && s.status !== "private").map((s) => s.url),
    ...social.map((a) => a.url),
  ];
  return [...new Set(urls)].map((u) => `    "${esc(u)}"`).join(",\n");
}

function replaceSameAs(html) {
  const match = html.match(/  "sameAs": \[\n[\s\S]*?\n  \],\n/);
  if (!match) {
    console.error("Could not find the sameAs list in index.html.");
    process.exit(1);
  }
  return html.replace(match[0], `  "sameAs": [\n${sameAs()}\n  ],\n`);
}

// Home page: portfolio cards, and tabs that cross over to the category pages.
let home = readFileSync("index.html", "utf8");
home = replaceBlock(home, "NAV", navTabs(null), "    ");
home = replaceBlock(home, "SOCIALHEAD", socialLinks("      "), "    ");
home = replaceBlock(home, "SOCIAL", socialLinks("      "), "    ");
home = replaceBlock(home, "SKILLS", skillTags());
home = replaceSameAs(home);
writeFileSync("index.html", home);

// The full index, every category on one page.
writeFileSync(
  "sites/index.html",
  page({
    title: "All sites — Kyle McConnell",
    heading: "All sites",
    lede: "Every site I run or have built, grouped by who it is for.",
    path: "/sites/",
    description:
      "Every website Kyle McConnell runs or has built, grouped by section: businesses, sites built for others, sports, family, and personal.",
    current: "all",
    listing: groupedIndex(),
    count: sites.length,
  })
);

// One page per category, listing that category only.
for (const category of usedCategories()) {
  const slug = categoryId(category);
  const group = sites.filter((site) => site.category === category);
  mkdirSync(`sites/${slug}`, { recursive: true });
  writeFileSync(
    `sites/${slug}/index.html`,
    page({
      title: `${category} — Kyle McConnell`,
      heading: category,
      lede: LEDE[category] || "",
      path: `/sites/${slug}/`,
      description: `${category}: ${group.map((s) => s.name).join(", ")}.`,
      current: category,
      listing: listFor(category),
      count: group.length,
    })
  );
}

console.log(
  `index.html: resume, ` +
    `${social.length} social link(s), ${sameAs().split("\n").length} sameAs entries. ` +
    `sites/: all ${sites.length} plus ${usedCategories().length} category page(s).`
);
