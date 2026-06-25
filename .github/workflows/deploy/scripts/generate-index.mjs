#!/usr/bin/env node
/**
 * generate-index.mjs
 *
 * Scans the repo root (and optionally subfolders) for standalone .html tools
 * and generates index.html — a directory page linking to each one.
 *
 * Conventions it relies on, per tool file:
 *   <title>...</title>                         -> used as the tool's name
 *   <meta name="description" content="...">    -> optional, used as blurb
 *
 * Usage: node scripts/generate-index.mjs
 * Run this from the repo root, or set ROOT_DIR env var.
 */

import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, basename } from 'path';

const ROOT_DIR = process.env.ROOT_DIR || process.cwd();
const OUTPUT_FILE = join(ROOT_DIR, 'index.html');
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.github', 'scripts']);
const EXCLUDE_FILES = new Set(['index.html']);

function findHtmlFiles(dir, base = ROOT_DIR) {
  let results = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(findHtmlFiles(full, base));
    } else if (entry.toLowerCase().endsWith('.html') && !EXCLUDE_FILES.has(entry)) {
      results.push(relative(base, full));
    }
  }
  return results;
}

function extractMeta(filePath) {
  const html = readFileSync(filePath, 'utf-8');

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].trim()
    : basename(filePath, '.html');

  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']\s*\/?>/i
  );
  const description = descMatch ? descMatch[1].trim() : '';

  return { title, description };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildIndexHtml(tools) {
  const cards = tools
    .map(({ href, title, description }) => `
      <a class="card" href="${escapeHtml(href)}">
        <div class="card-title">${escapeHtml(title)}</div>
        ${description ? `<div class="card-desc">${escapeHtml(description)}</div>` : ''}
        <div class="card-path">${escapeHtml(href)}</div>
      </a>`)
    .join('\n');

  const count = tools.length;
  const generated = new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tools</title>
<style>
  :root{
    --ink:#1c1f26;
    --paper:#fbfaf7;
    --line:#dcd7cc;
    --accent:#b5562e;
    --accent-soft:#f0e3d8;
    --mono:#5a5650;
    --panel:#ffffff;
  }
  *{box-sizing:border-box;}
  body{
    margin:0;
    font-family:'Iowan Old Style','Georgia',serif;
    background:var(--paper);
    color:var(--ink);
  }
  header{
    padding:36px 32px 22px;
    border-bottom:1px solid var(--line);
  }
  header h1{
    margin:0;
    font-size:26px;
    font-weight:600;
    letter-spacing:.2px;
  }
  header h1 span{color:var(--accent);}
  header p{
    margin:6px 0 0;
    color:var(--mono);
    font-size:13px;
    font-family:'IBM Plex Mono','SF Mono',monospace;
  }
  main{
    max-width:880px;
    margin:0 auto;
    padding:32px;
  }
  .grid{
    display:grid;
    grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));
    gap:16px;
  }
  .card{
    display:block;
    background:var(--panel);
    border:1px solid var(--line);
    border-radius:3px;
    padding:18px;
    text-decoration:none;
    color:var(--ink);
    transition:border-color .15s, transform .1s;
  }
  .card:hover{
    border-color:var(--accent);
    transform:translateY(-1px);
  }
  .card-title{
    font-size:16px;
    font-weight:600;
    margin-bottom:6px;
  }
  .card-desc{
    font-size:13px;
    color:var(--mono);
    font-family:'IBM Plex Mono',monospace;
    line-height:1.5;
    margin-bottom:10px;
  }
  .card-path{
    font-size:11px;
    color:var(--accent);
    font-family:'IBM Plex Mono',monospace;
    letter-spacing:.3px;
  }
  .empty{
    text-align:center;
    color:var(--mono);
    padding:60px 20px;
    border:1px dashed var(--line);
    border-radius:3px;
    font-family:'IBM Plex Mono',monospace;
    font-size:13px;
  }
  footer{
    max-width:880px;
    margin:0 auto;
    padding:0 32px 40px;
    color:var(--mono);
    font-size:11.5px;
    font-family:'IBM Plex Mono',monospace;
  }
</style>
</head>
<body>
<header>
  <h1>Tool<span>box</span></h1>
  <p>${count} tool${count === 1 ? '' : 's'} &middot; single-page, no install &middot; generated ${generated}</p>
</header>
<main>
  ${count > 0
    ? `<div class="grid">${cards}</div>`
    : `<div class="empty">No tools found yet. Add an .html file to the repo root and redeploy.</div>`
  }
</main>
<footer>
  This page is generated automatically on deploy by scripts/generate-index.mjs — do not edit index.html directly, your changes will be overwritten on the next build.
</footer>
</body>
</html>
`;
}

function main() {
  const files = findHtmlFiles(ROOT_DIR).sort();
  const tools = files.map((f) => {
    const { title, description } = extractMeta(join(ROOT_DIR, f));
    return { href: f, title, description };
  });

  const html = buildIndexHtml(tools);
  writeFileSync(OUTPUT_FILE, html, 'utf-8');

  console.log(`Generated index.html with ${tools.length} tool(s):`);
  tools.forEach((t) => console.log(`  - ${t.title}  (${t.href})`));
}

main();
