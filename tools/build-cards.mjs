#!/usr/bin/env node
/*
 * Writes the site cards in index.html from sites.json.
 *
 * The deployed site is pure HTML and CSS with no JavaScript, so the cards
 * have to exist in the markup. Edit sites.json, then run:
 *
 *   node tools/build-cards.mjs
 *
 * It rewrites the two generated blocks in index.html (CARDS and BUILT) and
 * leaves everything else alone. This is a local maintenance step, not a
 * deploy build step — Render serves the committed files as-is.
 */
import { readFileSync, writeFileSync } from "node:fs";

const CATEGORY_ORDER = ["My businesses", "Sites I've built for others", "Family sites", "Personal sites"];
const STATUS_LABEL = { "coming-soon": "Coming soon", seasonal: "Seasonal", private: "Sign-in required" };
const INDENT = "    ";

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

function card(site, level, pad) {
  const lines = [];
  lines.push(`${pad}<li class="card">`);

  if (site.image) {
    lines.push(
      `${pad}  <img class="card-media" src="${esc(site.image)}" alt="Screenshot of the ${esc(site.name)} website" loading="lazy" decoding="async" width="1280" height="800">`
    );
  }

  lines.push(`${pad}  <div class="card-body">`);

  const linkable = site.linkable !== false && site.url;
  lines.push(
    linkable
      ? `${pad}    <h${level}><a href="${esc(site.url)}" rel="noopener">${esc(site.name)}</a></h${level}>`
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

function groupedCards() {
  const out = [];
  for (const category of CATEGORY_ORDER) {
    const group = sites.filter((site) => site.category === category).sort(byName);
    if (!group.length) continue;
    const id = category.toLowerCase().replace(/[^a-z]+/g, "-");
    out.push(`${INDENT}<h3 class="group-title" id="group-${id}">${esc(category)}</h3>`);
    out.push(`${INDENT}<ul class="card-grid">`);
    for (const site of group) out.push(card(site, 4, `${INDENT}  `));
    out.push(`${INDENT}</ul>`);
  }
  return out.join("\n");
}

function builtCards() {
  const built = sites.filter((site) => site.built === true).sort(byName);
  if (!built.length) return "";
  const out = [`${INDENT}<ul class="card-grid">`];
  for (const site of built) out.push(card(site, 3, `${INDENT}  `));
  out.push(`${INDENT}</ul>`);
  return out.join("\n");
}

function replaceBlock(html, name, body) {
  const start = html.indexOf(`<!-- ${name}:START`);
  const end = html.indexOf(`<!-- ${name}:END -->`);
  if (start === -1 || end === -1) {
    console.error(`Could not find the ${name} markers in index.html.`);
    process.exit(1);
  }
  const startEnd = html.indexOf("-->", start) + 3;
  return html.slice(0, startEnd) + (body ? `\n${body}\n${INDENT}` : "\n" + INDENT) + html.slice(end);
}

let html = readFileSync("index.html", "utf8");
html = replaceBlock(html, "CARDS", groupedCards());
html = replaceBlock(html, "BUILT", builtCards());
writeFileSync("index.html", html);

console.log(`Wrote ${sites.length} site card(s); ${sites.filter((s) => s.built).length} in the portfolio.`);
