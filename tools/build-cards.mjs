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

const { sites = [] } = JSON.parse(readFileSync("sites.json", "utf8"));


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
  lines.push(`${pad}<li class="card">`);

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
  return [`${pad}<ul class="index-list">`, ...group.map((s) => indexRow(s, `${pad}  `)), `${pad}</ul>`].join("\n");
}

function groupedIndex(pad = INDENT) {
  const out = [];
  for (const category of usedCategories()) {
    out.push(`${pad}<h2 class="group-title" id="group-${categoryId(category)}">${esc(category)}</h2>`);
    out.push(listFor(category, pad));
  }
  return out.join("\n");
}

function builtCards() {
  const built = sites.filter((site) => site.built === true).sort(byName);
  if (!built.length) return "";
  const out = [`${INDENT}<ul class="card-grid">`];
  for (const site of built) out.push(card(site, 3, `${INDENT}  `, true));
  out.push(`${INDENT}</ul>`);
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
<body>
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
    <p><a href="/">Back to kylemcconnell.com</a></p>
    <p>&copy; Kyle McConnell &middot; Haxtun, Colorado</p>
  </div>
</footer>
</body>
</html>
`;
}

// Home page: portfolio cards, and tabs that cross over to the category pages.
let home = readFileSync("index.html", "utf8");
home = replaceBlock(home, "NAV", navTabs(null), "    ");
home = replaceBlock(home, "BUILT", builtCards());
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
  `index.html: ${sites.filter((s) => s.built).length} portfolio card(s). ` +
    `sites/: all ${sites.length} plus ${usedCategories().length} category page(s).`
);
