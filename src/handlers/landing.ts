/*
 * SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { VERSION } from '../version.js';

export function handleLanding(request: Request): Response {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  return new Response(renderHtml(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderHtml(): string {
  return /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Azkena — Pilotariak MCP Server</title>
  <meta name="description" content="Model Context Protocol server for Basque pelota data. Competitions, clubs, categories, specialties, and results — for your AI assistant." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
  <style>
    /* ── Design tokens (Pilotariak design system) ───────────────── */
    :root {
      --red:          #C8102E;
      --red-dark:     #970D25;
      --red-soft:     #FDE8EC;
      --cream:        #F7F4EF;
      --card:         #FFFDFC;
      --white:        #FFFFFF;
      --surface-alt:  #F2EDE7;
      --line:         #E5DED6;
      --ink:          #141414;
      --text:         #262626;
      --muted:        #7A7A7A;
      --subtle:       #A8A49E;
      --green:        #1F7A5A;
      --green-soft:   #E6F4EE;
      --amber:        #C8900A;
      --amber-soft:   #FFF8E7;
      --panel:        #1E1E1E;
      --shadow:       rgba(103, 18, 31, 0.10);
      --font: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }

    /* ── Reset & base ──────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font);
      background: var(--cream);
      color: var(--text);
      font-size: 16px;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
    }

    /* ── Container ─────────────────────────────────────────────── */
    .container { max-width: 1200px; margin: 0 auto; padding: 0 80px; }
    @media (max-width: 1279px) { .container { padding: 0 48px; } }
    @media (max-width: 1023px) { .container { padding: 0 32px; } }
    @media (max-width: 767px)  { .container { padding: 0 24px; } }

    /* ── Eyebrow ───────────────────────────────────────────────── */
    .eyebrow {
      display: block;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    /* ── Navigation ────────────────────────────────────────────── */
    .nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      padding: 0 80px;
      height: 64px;
      transition: background 200ms ease, border-color 200ms ease;
      border-bottom: 1px solid transparent;
    }
    .nav.scrolled { background: var(--white); border-bottom-color: var(--line); }
    @media (max-width: 767px) { .nav { padding: 0 24px; } }

    .nav-wordmark {
      display: flex; align-items: center; gap: 10px; text-decoration: none;
    }
    .nav-logo {
      width: 32px; height: 32px; background: var(--red); border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 14px; color: var(--white); flex-shrink: 0;
    }
    .nav-title {
      font-size: 15px; font-weight: 700; color: var(--white);
      transition: color 200ms ease;
    }
    .nav.scrolled .nav-title { color: var(--ink); }

    .nav-right {
      margin-left: auto; display: flex; align-items: center; gap: 24px;
    }
    .nav-link {
      font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.82);
      text-decoration: none; transition: color 150ms ease;
    }
    .nav.scrolled .nav-link { color: var(--text); }
    .nav-link:hover { color: var(--white); }
    .nav.scrolled .nav-link:hover { color: var(--red); }
    .nav-version {
      font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75);
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
      border-radius: 9999px; padding: 4px 12px;
      transition: background 200ms ease, border-color 200ms ease, color 200ms ease;
    }
    .nav.scrolled .nav-version {
      color: var(--muted); background: var(--surface-alt); border-color: var(--line);
    }
    @media (max-width: 767px) { .nav-link { display: none; } }

    /* ── Hero ──────────────────────────────────────────────────── */
    .hero {
      position: relative;
      background: linear-gradient(to bottom, var(--red) 0%, var(--red-dark) 45%, var(--cream) 100%);
      min-height: 480px;
      display: flex; align-items: center; justify-content: center;
      padding: 120px 80px 80px;
      overflow: hidden;
      text-align: center;
    }
    .hero-circle-1 {
      position: absolute; width: 400px; height: 400px; border-radius: 50%;
      background: rgba(255,255,255,0.07); top: -80px; right: -60px; pointer-events: none;
    }
    .hero-circle-2 {
      position: absolute; width: 280px; height: 280px; border-radius: 50%;
      background: rgba(255,255,255,0.07); bottom: 60px; left: -60px; pointer-events: none;
    }
    .hero-content { position: relative; z-index: 1; max-width: 800px; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
      text-transform: uppercase; color: rgba(255,255,255,0.75); margin-bottom: 20px;
    }
    .hero-dot {
      width: 6px; height: 6px; background: var(--green-soft); border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    .hero-title {
      font-size: 64px; font-weight: 900; letter-spacing: -1.5px;
      line-height: 1.0; color: var(--white); margin-bottom: 20px;
    }
    .hero-subtitle {
      font-size: 18px; font-weight: 400; line-height: 1.7;
      color: rgba(255,255,255,0.82); max-width: 560px;
      margin: 0 auto 32px;
    }
    .hero-actions {
      display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px;
    }
    .endpoint-pill {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--panel); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px; padding: 8px 16px;
      font-family: var(--mono); font-size: 13px; color: rgba(255,255,255,0.82);
    }
    .method-badge {
      background: rgba(200,16,46,0.65); color: var(--white);
      border-radius: 4px; padding: 2px 8px;
      font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
    }
    @media (max-width: 767px) {
      .hero { min-height: 320px; padding: 80px 24px 48px; }
      .hero-title { font-size: 36px; letter-spacing: -0.8px; }
      .hero-subtitle { font-size: 16px; }
    }
    @media (min-width: 768px) and (max-width: 1023px) {
      .hero { padding: 100px 48px 64px; }
      .hero-title { font-size: 48px; letter-spacing: -1px; }
    }

    /* ── Buttons ───────────────────────────────────────────────── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 12px 24px; border-radius: 8px;
      font-size: 16px; font-weight: 700; line-height: 1;
      text-decoration: none; cursor: pointer; border: 2px solid transparent; min-height: 44px;
      transition: background 150ms ease, color 150ms ease, border-color 150ms ease,
                  box-shadow 150ms ease, transform 200ms ease;
    }
    .btn-primary { background: var(--white); color: var(--red); border-color: var(--white); }
    .btn-primary:hover {
      background: rgba(255,255,255,0.9); transform: translateY(-1px);
      box-shadow: 0 4px 16px var(--shadow);
    }
    .btn-secondary {
      background: transparent; color: var(--white); border-color: rgba(255,255,255,0.5);
    }
    .btn-secondary:hover { border-color: var(--white); background: rgba(255,255,255,0.08); }
    .btn:active { transform: scale(0.98); }

    /* ── Section shell ─────────────────────────────────────────── */
    .section { padding: 80px 0; }
    @media (max-width: 767px) { .section { padding: 48px 0; } }
    .section-alt { background: var(--surface-alt); }

    .section-header { max-width: 640px; margin-bottom: 48px; }
    .section-header .eyebrow { color: var(--muted); margin-bottom: 8px; }
    .section-title {
      font-size: 36px; font-weight: 800; letter-spacing: -0.5px;
      line-height: 1.15; color: var(--ink); margin-bottom: 16px;
    }
    @media (max-width: 767px) { .section-title { font-size: 26px; } }
    .section-subtitle { font-size: 18px; font-weight: 400; line-height: 1.7; color: var(--muted); }
    .section-subtitle code {
      font-family: var(--mono); font-size: 14px; background: var(--line);
      border-radius: 4px; padding: 1px 6px; color: var(--text);
    }

    /* ── Cards grid ────────────────────────────────────────────── */
    .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    @media (max-width: 1023px) { .cards-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 639px)  { .cards-grid { grid-template-columns: 1fr; } }

    .card {
      background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 24px;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .card:hover { border-color: var(--red); box-shadow: 0 4px 12px rgba(103,18,31,0.07); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .card-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .card-title { font-size: 18px; font-weight: 700; color: var(--ink); }
    .card-desc { font-size: 14px; line-height: 1.55; color: var(--muted); margin-bottom: 14px; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      font-size: 12px; font-family: var(--mono); font-weight: 500;
      background: var(--surface-alt); border: 1px solid var(--line);
      border-radius: 6px; padding: 3px 8px; color: var(--text);
    }

    /* ── Tool list ─────────────────────────────────────────────── */
    .tools-list { display: flex; flex-direction: column; gap: 16px; }
    .tool-row {
      display: flex; align-items: flex-start; gap: 20px;
      background: var(--card); border: 1px solid var(--line);
      border-radius: 12px; padding: 20px 24px;
      transition: border-color 150ms ease;
    }
    .tool-row:hover { border-color: var(--red); }
    .tool-chip {
      flex-shrink: 0; font-family: var(--mono); font-size: 13px; font-weight: 600;
      color: var(--red-dark); background: var(--red-soft);
      border-radius: 6px; padding: 4px 10px; line-height: 1.6; white-space: nowrap;
    }
    .tool-desc { font-size: 15px; font-weight: 400; line-height: 1.6; color: var(--text); }
    .tool-desc strong { font-weight: 600; color: var(--ink); display: block; margin-bottom: 2px; }

    /* ── Code block ────────────────────────────────────────────── */
    .code-block { background: var(--ink); border-radius: 12px; overflow: hidden; }
    .code-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .code-dots { display: flex; gap: 6px; }
    .code-dots span { width: 10px; height: 10px; border-radius: 50%; }
    .code-lang {
      font-size: 12px; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--subtle);
    }
    pre {
      padding: 24px 28px; overflow-x: auto;
      font-family: var(--mono); font-size: 13px; line-height: 1.7;
      color: rgba(247,244,239,0.88);
    }
    .kw  { color: #C792EA; }
    .str { color: #C3E88D; }
    .cm  { color: var(--subtle); font-style: italic; }
    .acc { color: #82AAFF; }

    /* ── Setup steps ───────────────────────────────────────────── */
    .steps-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; counter-reset: step;
    }
    @media (max-width: 767px) { .steps-grid { grid-template-columns: 1fr; } }
    .step {
      position: relative; padding: 28px 24px;
      background: var(--card); border: 1px solid var(--line); border-radius: 12px;
      counter-increment: step;
    }
    .step::before {
      content: counter(step);
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: 9999px;
      background: var(--red); color: var(--white);
      font-size: 14px; font-weight: 700; margin-bottom: 16px;
    }
    .step-title { font-size: 17px; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
    .step-body { font-size: 14px; line-height: 1.6; color: var(--muted); }
    .step-code {
      display: inline-block; margin-top: 10px;
      font-family: var(--mono); font-size: 12px; font-weight: 600;
      color: var(--red-dark); background: var(--red-soft); border-radius: 6px; padding: 4px 10px;
    }

    /* ── Badge ─────────────────────────────────────────────────── */
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      border-radius: 9999px; padding: 5px 12px; font-size: 12px; font-weight: 700;
    }
    .badge-green { background: var(--green-soft); color: var(--green); }
    .badge-dot { width: 6px; height: 6px; border-radius: 9999px; background: currentColor; }

    /* ── Footer ─────────────────────────────────────────────────── */
    footer { background: var(--ink); padding: 40px 80px; }
    .footer-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
    }
    .footer-brand { display: flex; align-items: center; gap: 8px; }
    .footer-logo {
      width: 24px; height: 24px; background: var(--red); border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 11px; color: var(--white);
    }
    .footer-name {
      font-size: 14px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: var(--cream);
    }
    .footer-links { display: flex; align-items: center; gap: 24px; }
    .footer-links a {
      font-size: 14px; font-weight: 400; color: var(--subtle);
      text-decoration: none; transition: color 150ms ease;
    }
    .footer-links a:hover { color: var(--cream); }
    .footer-sep { color: rgba(255,255,255,0.12); }
    @media (max-width: 767px) {
      footer { padding: 40px 24px; }
      .footer-inner { justify-content: center; text-align: center; }
      .footer-links { flex-wrap: wrap; justify-content: center; gap: 16px; }
    }

    /* ── Focus ring ─────────────────────────────────────────────── */
    :focus-visible {
      outline: 2px solid var(--red); outline-offset: 3px;
      border-radius: 4px; box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.12);
    }
  </style>
</head>
<body>

  <!-- Navigation -->
  <nav id="navbar" class="nav" role="navigation" aria-label="Main navigation">
    <a class="nav-wordmark" href="/">
      <div class="nav-logo" aria-hidden="true">A</div>
      <span class="nav-title">Azkena</span>
    </a>
    <div class="nav-right">
      <a class="nav-link" href="#tools">Tools</a>
      <a class="nav-link" href="#quickstart">Quick Start</a>
      <a class="nav-link" href="https://github.com/Pilotariak/azkena" target="_blank" rel="noopener">GitHub</a>
      <span class="nav-version">v${VERSION}</span>
    </div>
  </nav>

  <!-- Hero -->
  <div class="hero" role="banner">
    <div class="hero-circle-1" aria-hidden="true"></div>
    <div class="hero-circle-2" aria-hidden="true"></div>
    <div class="hero-content">
      <div class="hero-eyebrow">
        <span class="hero-dot" aria-hidden="true"></span>
        Model Context Protocol Server
      </div>
      <h1 class="hero-title">Pilotariak<br>MCP Server</h1>
      <p class="hero-subtitle">
        Basque pelota data for your AI assistant. Competitions, clubs, categories,
        specialties, and results — all accessible through the Model Context Protocol.
      </p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="https://github.com/Pilotariak/azkena" target="_blank" rel="noopener">GitHub</a>
        <a class="btn btn-secondary" href="#quickstart">Quick Start</a>
      </div>
      <div class="endpoint-pill">
        <span class="method-badge">POST</span>
        /mcp
      </div>
    </div>
  </div>

  <main>

    <!-- What it is -->
    <section class="section" id="features" aria-labelledby="features-title">
      <div class="container">
        <header class="section-header">
          <span class="eyebrow">Why Azkena</span>
          <h2 class="section-title" id="features-title">Basque pelota data, MCP-native</h2>
          <p class="section-subtitle">
            Azkena exposes the Pilotariak dataset through the
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener" style="color:var(--red);text-decoration:none;font-weight:600;">Model Context Protocol</a>,
            so any MCP-compatible AI client can query competitions, results, and clubs with zero custom integration.
          </p>
        </header>
        <div class="cards-grid" role="list">
          <article class="card" role="listitem">
            <div class="card-header">
              <div class="card-icon" style="background: var(--red-soft);">🔌</div>
              <h3 class="card-title">MCP Native</h3>
            </div>
            <p class="card-desc">
              Works out of the box with Claude, Cursor, and any client that speaks the
              Model Context Protocol — no custom API client needed.
            </p>
          </article>
          <article class="card" role="listitem">
            <div class="card-header">
              <div class="card-icon" style="background: var(--amber-soft);">🏟️</div>
              <h3 class="card-title">Full Dataset</h3>
            </div>
            <p class="card-desc">
              Five domain tools covering the entire competition graph: clubs, categories,
              specialties, competitions, and match results per league.
            </p>
          </article>
          <article class="card" role="listitem">
            <div class="card-header">
              <div class="card-icon" style="background: var(--green-soft);">⚡</div>
              <h3 class="card-title">Edge Deployed</h3>
            </div>
            <p class="card-desc">
              Runs on Cloudflare Workers — globally distributed, zero cold starts,
              always on for your assistant.
            </p>
          </article>
        </div>
      </div>
    </section>

    <!-- Tools -->
    <section class="section section-alt" id="tools" aria-labelledby="tools-title">
      <div class="container">
        <header class="section-header">
          <span class="eyebrow">MCP Tools</span>
          <h2 class="section-title" id="tools-title">Five domain tools</h2>
          <p class="section-subtitle">
            Each tool targets a specific domain. Pass the <code>league</code> parameter
            to scope results to the right federation (e.g. <code>lcapb</code>).
          </p>
        </header>
        <div class="tools-list" role="list">
          <div class="tool-row" role="listitem">
            <span class="tool-chip">list_competitions</span>
            <div class="tool-desc">
              <strong>Competitions</strong>
              Lists all championship seasons available for a league — annual groupings
              like "Championnat CCAPB 2025-2026".
            </div>
          </div>
          <div class="tool-row" role="listitem">
            <span class="tool-chip">list_clubs</span>
            <div class="tool-desc">
              <strong>Clubs</strong>
              Returns all pelota clubs registered in the given league, with their
              identifiers and names.
            </div>
          </div>
          <div class="tool-row" role="listitem">
            <span class="tool-chip">list_categories</span>
            <div class="tool-desc">
              <strong>Categories</strong>
              Enumerates age and skill divisions (Seniors, Juniors, Vétérans…) shared
              across competitions.
            </div>
          </div>
          <div class="tool-row" role="listitem">
            <span class="tool-chip">list_specialties</span>
            <div class="tool-desc">
              <strong>Specialties</strong>
              Lists Basque pelota disciplines — Place Libre, Trinquet, Mur à Gauche,
              and more — for a given league.
            </div>
          </div>
          <div class="tool-row" role="listitem">
            <span class="tool-chip">list_results</span>
            <div class="tool-desc">
              <strong>Results</strong>
              Fetches match results filtered by competition, specialty, and category —
              scores, dates, and club lineups.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Quick start -->
    <section class="section" id="quickstart" aria-labelledby="quickstart-title">
      <div class="container">
        <header class="section-header">
          <span class="eyebrow">Developer</span>
          <h2 class="section-title" id="quickstart-title">Quick Start</h2>
          <p class="section-subtitle">
            Connect any MCP client to the <code>/mcp</code> endpoint and start querying
            Basque pelota data in seconds.
          </p>
        </header>
        <div class="code-block">
          <div class="code-header">
            <div class="code-dots" aria-hidden="true">
              <span style="background:#ff5f57"></span>
              <span style="background:#febc2e"></span>
              <span style="background:#28c840"></span>
            </div>
            <span class="code-lang">claude_desktop_config.json</span>
          </div>
          <pre>{
  <span class="str">"mcpServers"</span>: {
    <span class="str">"azkena"</span>: {
      <span class="str">"type"</span>: <span class="str">"http"</span>,
      <span class="str">"url"</span>: <span class="str">"https://azkena.pilotariak.com/mcp"</span>
    }
  }
}</pre>
        </div>
      </div>
    </section>

    <!-- Setup steps -->
    <section class="section section-alt" id="setup" aria-labelledby="setup-title">
      <div class="container">
        <header class="section-header">
          <span class="eyebrow">Get Started</span>
          <h2 class="section-title" id="setup-title">Up and running in three steps</h2>
        </header>
        <div class="steps-grid">
          <article class="step">
            <h3 class="step-title">Add to your MCP client</h3>
            <p class="step-body">
              Paste the server URL into your MCP client configuration
              (Claude Desktop, Cursor, or any compatible client).
            </p>
            <code class="step-code">https://azkena.pilotariak.com/mcp</code>
          </article>
          <article class="step">
            <h3 class="step-title">Pick a league</h3>
            <p class="step-body">
              Most tools require a <strong>league</strong> parameter. Start with
              <code style="font-family:var(--mono);font-size:12px;background:var(--red-soft);border-radius:4px;padding:1px 5px;color:var(--red-dark);">lcapb</code>
              for the Ligue Côte d'Argent de Pelote Basque.
            </p>
          </article>
          <article class="step">
            <h3 class="step-title">Ask your assistant</h3>
            <p class="step-body">
              Your AI now knows Basque pelota. Ask about competitions,
              results, or clubs — in English or French.
            </p>
            <code class="step-code">list competitions for lcapb</code>
          </article>
        </div>
      </div>
    </section>

    <!-- Status strip -->
    <section class="section" aria-label="Server status">
      <div class="container" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
        <div>
          <span class="eyebrow" style="color:var(--muted);margin-bottom:6px;">Current status</span>
          <p style="font-size:18px;font-weight:700;color:var(--ink);">All systems operational</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="badge badge-green">
            <span class="badge-dot" aria-hidden="true"></span>
            Live
          </span>
          <span style="font-size:14px;color:var(--muted);">v${VERSION}</span>
        </div>
      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer role="contentinfo">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="footer-logo" aria-hidden="true">A</div>
        <span class="footer-name">Azkena</span>
      </div>
      <div class="footer-links">
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener">MCP Spec</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a href="https://github.com/Pilotariak/azkena/blob/main/LICENSE" target="_blank" rel="noopener">Apache-2.0</a>
        <span class="footer-sep" aria-hidden="true">·</span>
        <a href="https://github.com/Pilotariak" target="_blank" rel="noopener">Pilotariak</a>
      </div>
    </div>
  </footer>

  <script>
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  </script>

</body>
</html>`;
}
