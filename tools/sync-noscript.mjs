#!/usr/bin/env node
/*
 * Regenerates the <noscript> plain link list in index.html from sites.json.
 * Run manually after editing sites.json:  node tools/sync-noscript.mjs
 * This is a maintenance helper only — the deployed site has no build step.
 */
import { readFileSync, writeFileSync } from "node:fs";

const START = "<!-- NOSCRIPT:START (generated from sites.json by tools/sync-noscript.mjs — do not hand-edit) -->";
const END = "<!-- NOSCRIPT:END -->";

const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const { sites = [] } = JSON.parse(readFileSync("sites.json", "utf8"));

const items = sites.map((site) => {
  const label = escape(site.name);
  const link =
    site.linkable !== false && site.url
      ? `<a href="${escape(site.url)}" rel="noopener">${label}</a>`
      : label;
  const description = site.description ? ` — ${escape(site.description)}` : "";
  return `        <li>${link}${description}</li>`;
});

const block = items.length
  ? `      <ul>\n${items.join("\n")}\n      </ul>`
  : "";

const html = readFileSync("index.html", "utf8");
const pattern = new RegExp(
  `${START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);

if (!pattern.test(html)) {
  console.error("Could not find the NOSCRIPT markers in index.html.");
  process.exit(1);
}

writeFileSync("index.html", html.replace(pattern, `${START}\n${block}\n      ${END}`));
console.log(`Synced ${items.length} site(s) into the <noscript> list.`);
