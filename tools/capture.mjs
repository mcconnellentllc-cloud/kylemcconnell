#!/usr/bin/env node
/*
 * Captures a 1280x800 screenshot of every public, linkable site in sites.json
 * and writes an optimized WebP to img/<id>.webp (target: <= 60 KB).
 *
 * Requirements (local machine, not the deployed site):
 *   npm install playwright sharp && npx playwright install chromium
 * Run:
 *   node tools/capture.mjs            # all sites
 *   node tools/capture.mjs m77ag      # one site by id
 *
 * Login-only sites (linkable:false) are skipped by design — never capture
 * behind a login.
 */
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

const MAX_BYTES = 60 * 1024;
const only = process.argv.slice(2);
const { sites = [] } = JSON.parse(readFileSync("sites.json", "utf8"));

const targets = sites.filter(
  (site) =>
    site.url &&
    site.linkable !== false &&
    site.status !== "coming-soon" &&
    (only.length === 0 || only.includes(site.id))
);

if (!targets.length) {
  console.error("No capturable sites matched.");
  process.exit(1);
}

mkdirSync("img", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});

for (const site of targets) {
  try {
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    const png = await page.screenshot({ type: "png" });

    let quality = 80;
    let out = await sharp(png).webp({ quality }).toBuffer();
    while (out.length > MAX_BYTES && quality > 30) {
      quality -= 10;
      out = await sharp(png).webp({ quality }).toBuffer();
    }

    const path = `img/${site.id}.webp`;
    await sharp(out).toFile(path);
    console.log(`${path}  ${(out.length / 1024).toFixed(1)} KB  q${quality}`);
    if (out.length > MAX_BYTES) console.warn(`  WARNING: over 60 KB budget`);
  } catch (error) {
    console.error(`${site.id}: capture failed — ${error.message}`);
  }
}

await browser.close();
