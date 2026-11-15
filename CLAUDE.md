# CLAUDE.md — gödle Project Context & AI Guidance

> **gödle** is a full-stack propositional symbolic logic web game inspired by Irving M. Copi's
> classic textbooks (*Symbolic Logic* and *Introduction to Logic*). The core mechanic revolves
> around formal natural deduction proofs, letting players prove statements in multiple valid
> ways as long as each step strictly adheres to Copi's 19 propositional rules.

---

## Table of Contents

1. [Design Philosophy](#-design-philosophy)
2. [Critical Scope Constraints](#-critical-scope-constraints)
3. [Architecture & Tech Stack](#-architecture--tech-stack)
4. [Directory Structure](#-directory-structure)
5. [Essential Commands](#-essential-commands)
6. [Environment Variables](#-environment-variables)
7. [Database Schema](#-database-schema)
8. [API Endpoint Reference](#-api-endpoint-reference)
9. [Authentication System](#-authentication-system)
10. [Security Measures](#-security-measures)
11. [Logic Engine Internals](#-logic-engine-internals)
12. [Component Architecture](#-component-architecture)
13. [Stores & State Management](#-stores--state-management)
14. [Styling & Typography](#-styling--typography)
15. [Deployment](#-deployment)
16. [Known Issues & Architectural Debt](#-known-issues--architectural-debt)
17. [Code Conventions](#-code-conventions)

---

## 🎨 Design Philosophy

- **Minimalist Editorial Aesthetic (Swiss & Japanese Monochromatic Design)**: Inspired by
  high-fashion editorial layouts (e.g. Yohji Yamamoto) and precision Korean graphic typography
  (e.g. Lee Yoojin). High-contrast palette (`#FAFAFA` paper white / `#0A0A0A` pitch black),
  hairline grid dividers, generous whitespace, and pure focus on deduction.
- **Distraction-Free Solving Space**: The canvas presents strictly the target statement to
  prove (`∴ Conclusion`) and the sequenced order of logical premises, followed by clean line
  derivations.
- **The proof is the moment**: Chrome stays quiet (pure monochrome, no accent hue, no emoji,
  no glows or gradients). The one rich element on a solving screen is the proof sheet: the
  conclusion set large, lines typeset like a textbook exercise, justifications in a ruled
  right margin ("1, 2  MP"), and a closing ∎ / Q.E.D. That margin note is the signature detail;
  use it only on proof lines.
- **Copy**: sentence case everywhere, no uppercase tracked labels, no exclamation marks, no
  trailing periods on labels/buttons, plain words ("Add line", not "Derive Step").
- **Typography**: Editorial serifs (*Newsreader*, *Crimson Pro*, *Lora*) for logic statements
  and math notation, paired with Swiss grotesques (*Plus Jakarta Sans*, *Inter*) for all UI text,
  labels, indices, and numerals. The design deliberately excludes monospaced typefaces in favor
  of clean, high-density grotesque typography with tabular OpenType features.
- **LaTeX Math Rendering**: Formulas rendered with **KaTeX** supporting dynamic real-time
  notation switching across two traditions:
  - **Modern Math / Standard**: `¬`, `∧`, `→`, `↔`
  - **Whitehead & Russell (Principia)**: `~`, `·`, `⊃`, `≡`

---

## 🛑 Critical Scope Constraints

- **Strictly Rules of Inference & Rules of Replacement**: Only Irving Copi's **19
  propositional rules** are included.
- **Do NOT include** predicate calculus / first-order logic (no quantifiers ∀, ∃, UI, EG,
  UG, EI) or advanced techniques like Conditional Proof (CP) / Indirect Proof (IP) unless
  explicitly instructed in future expansions.

### Copi's 19 Rules

**9 Rules of Inference** (whole lines only):
| Abbr   | Name                    | Schema                                                      | Premises |
|--------|-------------------------|-------------------------------------------------------------|----------|
| `MP`   | Modus Ponens            | p ⊃ q, p ⊢ q                                               | 2        |
| `MT`   | Modus Tollens           | p ⊃ q, ~q ⊢ ~p                                             | 2        |
| `HS`   | Hypothetical Syllogism  | p ⊃ q, q ⊃ r ⊢ p ⊃ r                                      | 2        |
| `DS`   | Disjunctive Syllogism   | p ∨ q, ~p ⊢ q                                              | 2        |
| `CD`   | Constructive Dilemma    | (p ⊃ q) • (r ⊃ s), p ∨ r ⊢ q ∨ s                          | 2        |
| `ABS`  | Absorption              | p ⊃ q ⊢ p ⊃ (p • q)                                       | 1        |
| `SIMP` | Simplification          | p • q ⊢ p  (or q)                                          | 1        |
| `CONJ` | Conjunction             | p, q ⊢ p • q                                               | 2        |
| `ADD`  | Addition                | p ⊢ p ∨ q                                                  | 1        |

**10 Rules of Replacement** (applicable to whole lines OR arbitrary sub-expressions):
| Abbr    | Name                   | Schema                                                         |
|---------|------------------------|----------------------------------------------------------------|
| `DEM`   | De Morgan's Theorems   | ~(p • q) ≡ (~p ∨ ~q) and ~(p ∨ q) ≡ (~p • ~q)                |
| `COM`   | Commutation            | (p ∨ q) ≡ (q ∨ p) and (p • q) ≡ (q • p)                      |
| `ASSOC` | Association            | [p ∨ (q ∨ r)] ≡ [(p ∨ q) ∨ r] and [p • (q • r)] ≡ [(p • q) • r] |
| `DIST`  | Distribution           | [p • (q ∨ r)] ≡ [(p • q) ∨ (p • r)] and [p ∨ (q • r)] ≡ [(p ∨ q) • (p ∨ r)] |
| `DN`    | Double Negation        | p ≡ ~~p                                                       |
| `TRANS` | Transposition          | (p ⊃ q) ≡ (~q ⊃ ~p)                                          |
| `IMPL`  | Material Implication   | (p ⊃ q) ≡ (~p ∨ q)                                            |
| `EQUIV` | Material Equivalence   | (p ≡ q) ≡ [(p ⊃ q) • (q ⊃ p)] and (p ≡ q) ≡ [(p • q) ∨ (~p • ~q)] |
| `EXP`   | Exportation            | [(p • q) ⊃ r] ≡ [p ⊃ (q ⊃ r)]                                |
| `TAUT`  | Tautology              | p ≡ (p ∨ p) and p ≡ (p • p)                                   |

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: Svelte 5 (`@sveltejs/vite-plugin-svelte` + Vite 6)
- **Styling**: Tailwind CSS 3 with class-based dark mode + custom typography system
- **Math Rendering**: KaTeX 0.16 via CDN
- **State Management**: Svelte writable stores (`authStore`, `notationStore`, `activeTabStore`, `themeStore`)
- **Icons**: Lucide Svelte
- **Confetti**: canvas-confetti (victory celebrations)

### Backend
- **Server**: Express.js 4 with TypeScript (run via `tsx`)
- **Database**: Native `node:sqlite` (`DatabaseSync` in Node.js 22+) in WAL mode
- **Auth**: Async scrypt password hashing + JWT (30-day tokens) via httpOnly cookies
- **OAuth**: Server-side GitHub OAuth code exchange with a cookie-bound one-time `state`
- **Bot Protection**: Self-hosted SVG captcha, HMAC-signed with `JWT_SECRET`, single-use nonces
- **Security**: Custom security headers (CSP, HSTS, X-Frame-Options), CORS whitelist,
  sliding-window rate limiting, timing-safe password comparison

### Deployment
- **Target**: Vercel (serverless functions + static SPA)
- **Entry**: `api/index.js`, a committed esbuild bundle of `server/index.ts` (rebuild with `npm run build`)
- **Dev**: `concurrently` runs Express (port 3001) and Vite (port 5173) with API proxy

---

## 📁 Directory Structure

```
goodle/
├── api/
│   └── index.js               # Vercel serverless entry — esbuild bundle of server/index.ts (COMMITTED, rebuild on server changes)
├── data/
│   └── goodle.db              # SQLite database (WAL mode, gitignored)
├── server/
│   ├── captcha.ts             # HMAC-signed SVG captcha (generate / verify, single-use nonces)
│   ├── db.ts                  # Database init, schema, migrations (node:sqlite or Turso/libSQL)
│   └── index.ts               # Express app: middleware, auth, all API routes (~1430 lines)
├── src/
│   ├── data/
│   │   └── changelog.ts       # Version changelog entries (shared single source of truth)
│   ├── types/
│   │   └── logic.ts           # Formula AST, RuleId, ProofStep, Problem, game state types
│   ├── logic/
│   │   ├── ast.ts             # formulasEqual, cloneFormula, countNodes, replaceSubformulaSingle
│   │   ├── parser.ts          # Recursive-descent parser, tokenizer, multi-notation lexer
│   │   ├── latex.ts           # formulaToLaTeX, formulaToString, NOTATION_CONFIGS
│   │   ├── rules.ts           # COPI_RULES, RULE_MAP, canApplyReplacement engine
│   │   ├── checker.ts         # validateProofStep — step validation pipeline
│   │   ├── solver.ts          # BFS proof search (solveProblem), hint generator (getProofHint)
│   │   ├── generator.ts       # Seeded PRNG (Mulberry32), 15 problem templates, share encoding
│   │   ├── presets.ts         # 96 Copi textbook problems, getDailyProblem hash selector
│   │   ├── lessons.ts         # Rules lessons: truth-table entailment, distractor generation, practice substitution, progress
│   │   ├── oauth.ts           # Client GitHub OAuth start (fetches one-time state, redirects to GitHub)
│   │   ├── celebrate.ts       # Monochrome, theme-aware confetti
│   │   └── sound.ts           # Victory clip playback honoring sound settings
│   ├── components/
│   │   ├── Header.svelte      # Navbar, tabs, notation switcher, user avatar & streak
│   │   ├── LaTeX.svelte       # KaTeX reactive renderer with notation-aware fallback & hibernation
│   │   ├── ProofTable.svelte  # Typeset proof sheet: large ∴ conclusion, numbered lines, margin justifications, ∎ / Q.E.D.
│   │   ├── StepInput.svelte   # Next-line editor: formula, rule, citations, live preview, Ctrl/Cmd+Enter to add
│   │   ├── RulesReferenceModal.svelte # In-game 19 Copi rules reference drawer with search & 1-click select
│   │   ├── SymbolKeyboard.svelte  # Virtual logic symbol keypad (notation-adaptive)
│   │   ├── WordleMode.svelte  # Daily challenge (3 stages: easy/medium/hard) with state retention
│   │   ├── FrenzyMode.svelte  # Survival mode (3 hearts, timer, seeded problems) with pause/resume
│   │   ├── SandboxMode.svelte # Library browser, generator, custom problem creator with state retention
│   │   ├── TutorialView.svelte    # Rules tab: course map + four-step lesson per rule (Brilliant-style)
│   │   ├── AuthModal.svelte       # Login, register, reset password, OAuth, attach password
│   │   ├── ProfileModal.svelte    # Profile editor, activity heatmap, account settings, danger zone
│   │   ├── PublicProfileModal.svelte  # Read-only public profile with reporting system
│   │   ├── StatsModal.svelte      # Daily stats distribution & frenzy leaderboard
│   │   ├── SettingsModal.svelte   # Theme toggle & notation selector with live preview
│   │   ├── LegalModal.svelte      # Privacy Policy & Terms of Service modal with tab switching
│   │   ├── ShareModal.svelte      # Canvas proof card renderer, social sharing, clipboard
│   │   ├── CaptchaGate.svelte     # reCAPTCHA gate with dev bypass fallback
│   │   ├── LandingPage.svelte     # Centered hero over LogicField, modes row, changelog, footer
│   │   ├── LogicField.svelte      # Canvas background of logic glyphs (reading band, glyph swaps, cursor lens)
│   │   └── AboutView.svelte       # About tab: Copi heritage, PHILO 12, creator, repo, synced changelog
│   ├── stores/
│   │   ├── auth.ts            # authStore (user, token, captcha), notationStore, activeTabStore
│   │   ├── theme.ts           # themeStore (light/dark), toggleTheme, isSettingsOpen
│   │   └── legal.ts           # legalModalStore, openLegalModal, closeLegalModal
│   ├── App.svelte             # Root layout, view router, modal orchestration
│   ├── app.css                # Monochrome tokens (CSS vars), component classes (.btn, .field, .seg, .panel, .kbd …)
│   └── main.ts                # Svelte 5 mount(App, { target: #app })
├── .gitignore                 # Ignores node_modules/, dist/, data/*.db*, .env*
├── CLAUDE.md                  # This file
├── AGENTS.md                  # Multi-agent operational handbook
├── index.html                 # HTML shell, anti-FOUC script, font/KaTeX CDN links
├── package.json               # Dependencies, scripts (dev, build, start)
├── postcss.config.js          # Tailwind + Autoprefixer
├── svelte.config.js           # vitePreprocess()
├── tailwind.config.js         # Dark mode class, editorial fonts, ink/paper token colors, meta/caption sizes
├── tsconfig.json              # ES2022, ESNext modules, bundler resolution
├── vercel.json                # Rewrites: /api/* → api/index.js, /* → SPA
└── vite.config.ts             # Svelte plugin, port 5173, /api proxy to :3001
```

---

## 💻 Essential Commands

```bash
# Full development stack (Express on :3001, Vite on :5173 with /api proxy)
npm run dev

# Backend only (with watch/hot-reload via tsx)
npm run dev:server

# Frontend only (Vite dev server)
npm run dev:app

# Production build: Vite client into dist/ AND esbuild server bundle into api/index.js.
# api/index.js is what Vercel runs — commit it after ANY change under server/ or src/logic/.
npm run build

# Rebuild only the API bundle
npm run build:api

# Production server (serves API + dist/ SPA on :3001, via tsx)
npm start

# Database backup / restore (Turso or local)
npm run db:backup
npm run db:restore

# Quick API smoke test
node -e "fetch('http://127.0.0.1:3001/api/wordle/today').then(r=>r.json()).then(console.log)"
```

---

## 🔐 Environment Variables

| Variable              | Required     | Default                                            | Purpose                                           |
|-----------------------|--------------|----------------------------------------------------|----------------------------------------------------|
| `PORT`                | Optional     | `3001`                                             | Express listen port                                |
| `JWT_SECRET`          | **Production** | `'goodle-super-secret-key-copi-19-rules'`        | Signs JWTs AND captcha tokens. The default is public (repo is public) — MUST be set in production |
| `NODE_ENV`            | Optional     | —                                                  | `'production'`: enables HSTS, secure cookies, strict OAuth |
| `VERCEL`              | Auto         | —                                                  | Set by Vercel; redirects SQLite to `/tmp`, skips `app.listen()` |
| `VERCEL_URL`          | Auto         | —                                                  | Auto-added to CORS whitelist as `https://${VERCEL_URL}` |
| `APP_URL`             | Optional     | —                                                  | Custom domain added to CORS whitelist              |
| `DATABASE_DIR`        | Optional     | `<cwd>/data`                                       | Directory for SQLite DB file                       |
| `DATABASE_PATH`       | Optional     | `<DATABASE_DIR>/goodle.db`                         | Exact path to SQLite file                          |
| `TURSO_DATABASE_URL`  | Production   | —                                                  | libSQL/Turso URL; with the token, replaces SQLite  |
| `TURSO_AUTH_TOKEN`    | Production   | —                                                  | Turso auth token                                   |
| `GITHUB_CLIENT_ID`    | **Production** | —                                                | GitHub OAuth app client ID                         |
| `GITHUB_CLIENT_SECRET`| **Production** | —                                                | GitHub OAuth app client secret                     |
| `ALLOW_DEV_OAUTH`     | Local only   | —                                                  | `=1` enables simulated GitHub sign-in locally. Ignored when `NODE_ENV=production` or on Vercel |

---

## 🗄️ Database Schema

SQLite via Node.js 22 built-in `node:sqlite` (`DatabaseSync`). WAL journal mode, foreign keys enforced.

### `users`
| Column                | Type     | Constraints                          |
|-----------------------|----------|--------------------------------------|
| `id`                  | TEXT     | PRIMARY KEY                          |
| `username`            | TEXT     | UNIQUE NOT NULL                      |
| `email`               | TEXT     | UNIQUE                               |
| `password_hash`       | TEXT     | NOT NULL                             |
| `avatar_color`        | TEXT     | DEFAULT `'#2563EB'`                  |
| `avatar_icon`         | TEXT     | DEFAULT `'⊢'`                       |
| `avatar_image`        | TEXT     | DEFAULT `''` (migration)             |
| `bio`                 | TEXT     | DEFAULT `''` (migration)             |
| `streak_count`        | INTEGER  | DEFAULT 0                            |
| `best_streak`         | INTEGER  | DEFAULT 0                            |
| `last_played_date`    | TEXT     | NULL                                 |
| `opt_out_leaderboard` | INTEGER  | DEFAULT 0 (migration)                |
| `google_id`           | TEXT     | DEFAULT NULL (migration)             |
| `github_id`           | TEXT     | DEFAULT NULL (migration)             |
| `has_password`        | INTEGER  | DEFAULT 1 (migration)                |
| `created_at`          | DATETIME | DEFAULT CURRENT_TIMESTAMP            |

### `wordle_completions`
| Column           | Type     | Constraints                                              |
|------------------|----------|----------------------------------------------------------|
| `id`             | TEXT     | PRIMARY KEY                                              |
| `user_id`        | TEXT     | FK → users(id) ON DELETE CASCADE                         |
| `date`           | TEXT     | NOT NULL                                                 |
| `difficulty`     | TEXT     | NOT NULL                                                 |
| `step_count`     | INTEGER  | NOT NULL                                                 |
| `duration_seconds`| INTEGER | NOT NULL                                                 |
| `proof_steps_json`| TEXT    | DEFAULT NULL (migration)                                 |
| `created_at`     | DATETIME | DEFAULT CURRENT_TIMESTAMP                                |

### `frenzy_records`
| Column        | Type     | Constraints                                                 |
|---------------|----------|-------------------------------------------------------------|
| `id`          | TEXT     | PRIMARY KEY                                                 |
| `user_id`     | TEXT     | FK → users(id) ON DELETE SET NULL                           |
| `player_name` | TEXT     | NULL                                                        |
| `seed`        | TEXT     | NOT NULL                                                    |
| `hearts_left` | INTEGER  | NOT NULL                                                    |
| `score`       | INTEGER  | NOT NULL                                                    |
| `time_seconds`| INTEGER  | NOT NULL                                                    |
| `won`         | INTEGER  | NOT NULL (0 or 1)                                           |
| `created_at`  | DATETIME | DEFAULT CURRENT_TIMESTAMP                                   |

### `shared_puzzles`
| Column            | Type     | Constraints                            |
|-------------------|----------|----------------------------------------|
| `id`              | TEXT     | PRIMARY KEY                            |
| `share_code`      | TEXT     | UNIQUE NOT NULL                        |
| `title`           | TEXT     | NOT NULL                               |
| `difficulty`      | TEXT     | NOT NULL                               |
| `premises_json`   | TEXT     | NOT NULL                               |
| `conclusion_json` | TEXT     | NOT NULL                               |
| `creator_username`| TEXT     | DEFAULT `'Anonymous Logician'`         |
| `plays_count`     | INTEGER  | DEFAULT 0                              |
| `created_at`      | DATETIME | DEFAULT CURRENT_TIMESTAMP              |

### `user_saved_proofs`
| Column           | Type     | Constraints                                   |
|------------------|----------|-----------------------------------------------|
| `id`             | TEXT     | PRIMARY KEY                                   |
| `user_id`        | TEXT     | NOT NULL, FK → users(id) ON DELETE CASCADE    |
| `title`          | TEXT     | NOT NULL                                      |
| `difficulty`     | TEXT     | DEFAULT `'custom'`                            |
| `premises_json`  | TEXT     | NOT NULL                                      |
| `conclusion_json`| TEXT     | NOT NULL                                      |
| `notes`          | TEXT     | NULL                                          |
| `created_at`     | DATETIME | DEFAULT CURRENT_TIMESTAMP                     |

### `profile_reports`
| Column             | Type     | Constraints                         |
|--------------------|----------|-------------------------------------|
| `id`               | TEXT     | PRIMARY KEY                         |
| `reporter_user_id` | TEXT     | NULL                                |
| `reported_username`| TEXT     | NOT NULL                            |
| `reason`           | TEXT     | NOT NULL                            |
| `details`          | TEXT     | NULL                                |
| `status`           | TEXT     | DEFAULT `'pending'`                 |
| `created_at`       | DATETIME | DEFAULT CURRENT_TIMESTAMP           |

### `community_theorems`
| Column               | Type     | Constraints                                   |
|----------------------|----------|-----------------------------------------------|
| `id`                 | TEXT     | PRIMARY KEY                                   |
| `user_id`            | TEXT     | NULL, FK → users(id) ON DELETE SET NULL       |
| `title`              | TEXT     | NOT NULL                                      |
| `difficulty`         | TEXT     | DEFAULT `'medium'`                            |
| `premises_json`      | TEXT     | NOT NULL                                      |
| `conclusion_json`    | TEXT     | NOT NULL                                      |
| `creator_username`   | TEXT     | NOT NULL                                      |
| `proof_steps_count`  | INTEGER  | DEFAULT 0                                     |
| `is_valid`           | INTEGER  | DEFAULT 1                                     |
| `created_at`         | DATETIME | DEFAULT CURRENT_TIMESTAMP                     |

---

## 📡 API Endpoint Reference

All endpoints are defined in `server/index.ts`. Rate-limited routes are marked with ⏱️.

### Authentication (`/api/auth/*`) ⏱️ 25 req / 15 min

| Method | Path                        | Auth     | Description                                                    |
|--------|-----------------------------|----------|----------------------------------------------------------------|
| POST   | `/api/auth/register`        | Public   | Create account (scrypt hash, random avatar color, 30d JWT)     |
| POST   | `/api/auth/login`           | Public   | Authenticate with username/password, return JWT + cookie        |
| GET    | `/api/auth/me`              | Optional | Fetch current user profile, streak, rank, heatmap, standings   |
| POST   | `/api/auth/logout`          | Public   | Clear auth cookie                                              |
| GET    | `/api/auth/captcha`         | Public   | Issue an HMAC-signed SVG captcha challenge `{ token, svg }`    |
| POST   | `/api/auth/verify-captcha`  | Public   | Verify a captcha answer against its signed token (single use)  |
| POST   | `/api/auth/change-password` | Required | Update password after verifying current password                |
| POST   | `/api/auth/attach-password` | Required | Attach password to OAuth-only accounts (sets `has_password=1`) |
| POST   | `/api/auth/reset-password`  | Public   | Reset password (requires matching registered email + captcha; see Known Issues) |
| POST   | `/api/auth/update-profile`  | Required | Update username, bio, avatar, email, leaderboard opt-out       |
| GET    | `/api/auth/oauth/config`    | Public   | `{ githubClientId, devMode }`                                   |
| POST   | `/api/auth/oauth/github/start` | Public | Issue one-time OAuth `state`, set httpOnly `gh_oauth_state` cookie |
| POST   | `/api/auth/oauth/github`    | Optional | GitHub OAuth callback: verify `state` against cookie, exchange code, link/create/login |
| POST   | `/api/auth/oauth/disconnect`| Required | Unlink GitHub provider                                          |

### User Management (`/api/user/*`)

| Method | Path                        | Auth     | Description                                                    |
|--------|-----------------------------|----------|----------------------------------------------------------------|
| GET    | `/api/user/profile/:user`   | Public   | Fetch public profile (rank, stats, 90-day activity heatmap)    |
| POST   | `/api/user/report`          | Optional | Submit moderation report against a profile                     |
| POST   | `/api/user/reset-stats`     | Required | Danger: clear all completions/records (requires "RESET STATS") |
| POST   | `/api/user/delete-account`  | Required | Danger: permanently delete account (requires username match)   |
| GET    | `/api/user/history`         | Required | Last 25 wordle completions + last 25 frenzy records            |
| GET    | `/api/user/saved-proofs`    | Required | Fetch all saved custom proofs                                  |
| POST   | `/api/user/saved-proofs`    | Required | Save a custom proof                                            |
| DELETE | `/api/user/saved-proofs/:id`| Required | Delete a saved proof                                           |

### Logic Engine (`/api/logic/*`)

| Method | Path                    | Auth   | Description                                            |
|--------|-------------------------|--------|--------------------------------------------------------|
| POST   | `/api/logic/validate-step` | Public | Validate a single deduction step against Copi rules    |
| POST   | `/api/logic/hint`          | Public | Generate next-step hint for current proof state        |
| POST   | `/api/logic/assess`        | Public | ⏱️ 60 req/min. Solve/assess a problem via BFS solver  |

### Daily Challenge (`/api/wordle/*`)

| Method | Path                  | Auth     | Description                                                                                             |
|--------|-----------------------|----------|---------------------------------------------------------------------------------------------------------|
| GET    | `/api/wordle/today`   | Optional | Get daily problem for date + difficulty (forbids future dates; returns solved status & steps if authed) |
| POST   | `/api/wordle/submit`  | Optional | Record daily completion with proof steps, deduplicate entries, update streak (if authenticated)          |

### Frenzy Mode (`/api/frenzy/*`)

| Method | Path                     | Auth     | Description                                              |
|--------|--------------------------|----------|----------------------------------------------------------|
| GET    | `/api/frenzy/generate`   | Public   | Generate random frenzy puzzle with seed                  |
| POST   | `/api/frenzy/submit`     | Optional | Record completed frenzy run                              |
| GET    | `/api/frenzy/leaderboard`| Public   | Top 20 winning runs (excludes opted-out users)           |

### Puzzle Sharing (`/api/puzzles/*`)

| Method | Path                  | Auth     | Description                                              |
|--------|-----------------------|----------|----------------------------------------------------------|
| POST   | `/api/puzzles/share`  | Optional | Store custom puzzle with 8-hex share code                |
| GET    | `/api/puzzles/:code`  | Public   | Retrieve shared puzzle by code; increments play count    |

### Community Theorems (`/api/community/*`)

| Method | Path                       | Auth     | Description                                                          |
|--------|----------------------------|----------|----------------------------------------------------------------------|
| GET    | `/api/community/theorems`  | Public   | Fetch verified community theorem submissions                         |
| POST   | `/api/community/theorems`  | Optional | Submit theorem to community library (validated by BFS theorem solver)|

---

## 🔑 Authentication System

### Token Lifecycle
1. **Registration / Login**: Server hashes password with async `scrypt` (16-byte salt, 64-byte
   derived key), signs a JWT (`{ id, username }`, 30-day expiry), and sets an `httpOnly` cookie.
2. **Request Auth**: Middleware reads from `Authorization: Bearer <token>` header or
   `req.cookies.token`. On valid JWT, sets `req.user = decoded`. On failure, proceeds as guest.
3. **Client Storage**: Token also stored in `localStorage('goodle_token')` for SPA persistence.
   `authStore.checkAuth()` validates on app mount via `GET /api/auth/me`.

### OAuth 2.0 Flow (GitHub)
1. Client calls `startGitHubOAuth()` (`src/logic/oauth.ts`) → `POST /api/auth/oauth/github/start`
   returns a random `state` and sets it in an httpOnly, SameSite=lax cookie (`gh_oauth_state`,
   path `/api/auth/oauth`, 10 min).
2. Browser is redirected to GitHub with `client_id`, `redirect_uri` (site origin) and `state`.
3. GitHub returns to `/?code=…&state=…`; `App.svelte` posts both to `/api/auth/oauth/github`.
4. Server clears the cookie and requires `state` to match it (timing-safe, single use) before
   exchanging the code, then fetches `api.github.com/user` and links (if signed in) or
   logs in / creates the account.
- **Never** bypass the state check or trust client-supplied GitHub ids: without it, a link
  with an attacker's code could attach their GitHub to a victim's account (account takeover).
- A `github_id` already linked to another user cannot be linked again (409).
- Linking from Profile also goes through steps 1–4.
- **Dev OAuth** (no code): only when `ALLOW_DEV_OAUTH=1` and not production/Vercel. The client
  `githubId` is ignored; dev ids are `dev:<name>`, which cannot collide with numeric GitHub ids.
- **Password Attachment**: OAuth-only accounts (`has_password=0`) are prompted to attach a
  master password. Without it, they can only authenticate via their OAuth provider.
- **Provider Disconnection**: Users can unlink GitHub via `POST /api/auth/oauth/disconnect`.

### Password Reset
- Requires the account to have a registered recovery email on file.
- Server verifies supplied email matches `user.email` before permitting the reset.
- Returns `403 Forbidden` if no recovery email is registered.

### Rank System
Calculated server-side in `GET /api/auth/me` based on `totalSolved`:
- 0: Initiate · 1+: Novice · 5+: Apprentice · 15+: Adept · 30+: Scholar
- 50+: Logician · 75+: Philosopher · 100+: Master · 150+: Grandmaster · 200+: Archon

---

## 🛡️ Security Measures

### Headers (Helmet-equivalent manual middleware)
- `X-Frame-Options: SAMEORIGIN` — clickjacking prevention
- `X-Content-Type-Options: nosniff` — MIME sniffing prevention
- `X-XSS-Protection: 1; mode=block` — legacy XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: off`
- `Content-Security-Policy` — strict allowlist for scripts, styles, fonts, frames, images, connects
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (production only)
- `x-powered-by` disabled

### CORS
Explicit origin whitelist: `localhost:5173`, `localhost:5174`, `127.0.0.1:517x`, `APP_URL`,
`VERCEL_URL`. In development, any `http://localhost:*` origin is accepted. Unauthorized
origins receive a CORS error callback.

### Rate Limiting
Custom sliding-window in-memory limiter (per-IP, via `x-forwarded-for` or `remoteAddress`):
- **Auth routes**: 25 requests / 15 minutes
- **Logic assess**: 60 requests / 1 minute
- Returns `429 Too Many Requests` with `Retry-After` and `X-RateLimit-*` headers.

### Cryptography
- **Password Hashing**: Async `scrypt` via `promisify(crypto.scrypt)`, 16-byte random salt,
  64-byte derived key, stored as `${salt}:${derivedKey}`.
- **Comparison**: `crypto.timingSafeEqual` — immune to timing side-channel attacks.

### Cookie Security
- `httpOnly: true` — prevents XSS cookie theft
- `sameSite: 'lax'` — CSRF mitigation
- `secure: true` in production — HTTPS only
- `maxAge: 30 days`

### Input Validation & Sanitization
- JSON payload limit: 2 MB
- Avatar image payload: max 200,000 characters
- Bio: max 160 characters
- Report details: max 500 characters
- All DB queries use prepared statements (SQL injection prevention)
- Danger zone actions require exact confirmation text

---

## ⚙️ Logic Engine Internals

### AST (`src/types/logic.ts` + `src/logic/ast.ts`)
Recursive discriminated union: `Formula = AtomFormula | NotFormula | BinaryFormula`.
- `AtomFormula`: `{ type: 'atom', name: string }` — propositional variables (P, Q, R, ...)
- `NotFormula`: `{ type: 'not', operand: Formula }` — unary negation
- `BinaryFormula`: `{ type: 'and'|'or'|'implies'|'iff', left: Formula, right: Formula }`

Key functions: `formulasEqual()` (structural equality), `cloneFormula()` (deep copy),
`countNodes()` (tree complexity), `getAtomicVariables()` (variable extraction),
`replaceSubformulaSingle()` (generates all single-occurrence replacements).

### Parser (`src/logic/parser.ts`)
Recursive-descent with operator precedence: `iff(1) > implies(2, right-assoc) > or(3) > and(4) > not(5) > primary`.

Tokenizer accepts all four notation systems simultaneously:
- NOT: `~`, `¬`, `!`, `-`
- AND: `•`, `·`, `*`, `&`, `^`, `∧`, `&&`
- OR: `∨`, `|`, `+`, `||`, `v`/`V` (context-aware: `v` after atom/rparen → OR)
- IMPLIES: `⊃`, `>`, `→`, `->`, `=>`
- IFF: `≡`, `=`, `↔`, `<->`, `<=>`
- Parentheses: `()`, `[]`, `{}`
- Atoms: `[a-zA-Z]` normalized to uppercase

### Rules Engine (`src/logic/rules.ts`)
- `COPI_RULES`: Full array of 19 `RuleDefinition` objects with schemas and examples.
- `RULE_MAP`: O(1) lookup by `RuleId`.
- `isDirectReplacementMatch(a, b, ruleId)`: Tests bidirectional equivalence at root level.
- `canApplyReplacement(source, target, ruleId)`: Recursively checks if replacement applies
  at any subformula depth (critical: replacement rules can target any sub-expression).

### Proof Validator (`src/logic/checker.ts`)
`validateProofStep(existingSteps, newFormula, ruleId, citations)`:
1. Verifies rule exists and citation count matches `requiredPremiseCount`.
2. For replacement rules: checks `canApplyReplacement(cited, newFormula, ruleId)`.
3. For inference rules: checks both citation orderings (order-insensitive for 2-premise rules).

### BFS Solver (`src/logic/solver.ts`)
`solveProblem(premises, conclusion, maxSteps=7)`:
- BFS over deductive closure with `Set<string>` visited tracking via `JSON.stringify`.
- Iteration cap: 400 states. Expands 1-premise (SIMP, ABS, DN, COM, IMPL, DEM, TRANS) and
  2-premise (MP, MT, HS, DS, CD) deductions.
- `getProofHint()`: Runs solver with maxSteps=6, inspects optimal next step, returns targeted
  hint like "Look at lines X and Y. Can you apply Modus Ponens?"

### Problem Generator (`src/logic/generator.ts`)
- Deterministic Mulberry32 PRNG seeded via FNV-1a hash.
- 15 problem templates (5 per difficulty: easy/medium/hard) with variable substitution.
- Share encoding: JSON → Base64 for shareable puzzle codes.

### Daily Problem Selector (`src/logic/presets.ts`)
- 96 canonical Copi textbook problems across 3 difficulties (32 easy, 32 medium, 32 hard).
- `getDailyProblem(dateStr, difficulty)`: Java-style polynomial hash of date string, modular
  index into difficulty-filtered preset set.

---

## 🧩 Component Architecture

### View Router (`App.svelte`)
Persistent tab containers: `$activeTabStore` switches between `WordleMode`, `FrenzyMode`,
`SandboxMode`, `TutorialView`, and `AboutView` using hidden container toggling (`class:hidden={$activeTabStore !== '...'}`)
and passing `hibernated={$activeTabStore !== '...'}` down to proof components. This guarantees
solving progress, citations, input drafts, and timer state are completely preserved across tab switches,
while KaTeX math rendering is hibernated in the background for zero rendering overhead.

### Game Mode Components

| Component           | Purpose                                     | Key Features                                     |
|---------------------|---------------------------------------------|--------------------------------------------------|
| `WordleMode`        | Daily 3-stage challenge (Novice→Adept→Master) | Heading shows the date; problem titles stay in the data (saves, shares) but are hidden while solving |
| `FrenzyMode`        | Survival mode (3 hearts, timer)             | Auto-pause on tab switch, penalty shake, seeded challenges |
| `SandboxMode`       | Library + generator + custom problems       | Progress retention, solver assessment, theorem library |
| `TutorialView`      | Rules lessons                               | Course map (intro + 9 inference + 10 replacement), four steps per rule: Pattern → Example (reveal lines) → Spot it (multiple choice) → Use it (write the line, graded by `validateProofStep`) |
| `AboutView`         | Context, links, creator & philosophical roots | Heritage, UP Diliman PHILO 12, synced changelog   |

### Core Proof Components

| Component              | Purpose                                       | Events                            |
|------------------------|-----------------------------------------------|-----------------------------------|
| `ProofTable`           | Typeset proof sheet, margin justifications, ∎ on the conclusion line | `citeLine`, `undoStep`, `insertFormula` (supports `hibernated`) |
| `StepInput`            | Formula input (keyword auto-conversion) + typed rule with suggestions + citation chips + Rules Guide. Enter in a field or Ctrl/Cmd+Enter anywhere adds the line; the global hotkey is ignored when `hibernated`, disabled, or a dialog is open | `submitStep` (supports `hibernated`) |
| `RulesReferenceModal`  | Copi's 19 rules in-game reference drawer with live search, formal schemas, and 1-click rule selection | `selectRule`, `close`             |
| `SymbolKeyboard`       | Virtual keypad (notation-adaptive)            | `insert`, `backspace`, `clear`    |
| `LaTeX`                | KaTeX renderer with dynamic notation & hibernation support | —                                 |

### Modal Components

| Component             | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `AuthModal`           | Login/register/reset-password/OAuth/attach-password  |
| `ProfileModal`        | Profile editor + account settings + danger zone      |
| `PublicProfileModal`  | Read-only public profile with report system          |
| `StatsModal`          | Daily stats + frenzy leaderboard                     |
| `SettingsModal`       | Theme toggle + notation selector with live preview   |
| `LegalModal`          | Privacy Policy + Terms of Service viewer with tabs   |
| `ShareModal`          | Canvas proof card renderer + social sharing          |
| `RulesReferenceModal` | In-game rules reference modal with search & 1-click select |
| `CaptchaGate`         | reCAPTCHA overlay with dev bypass                    |
| `LandingPage`         | Centered wordmark hero over `LogicField`, modes row, changelog |

### Rules Lessons (`src/logic/lessons.ts`)
- `buildLesson(rule)` parses the rule's example, then builds 3 wrong choices from near-misses
  of the answer, rearranged premise parts and letter combinations. Every wrong choice is
  checked with `entails()` (truth table) so it never follows from the premises. One-letter
  rules (DN, Taut) borrow a second letter. Choice order is a stable per-rule shuffle.
- Practice substitutes `P → A ∨ B, Q → C, R → ~D, S → E` into the example.
- When changing lessons or rules, check that all 19 lessons still have
  3 non-entailed distractors and a practice answer accepted by `validateProofStep`.

### Landing Background (`LogicField.svelte`)
Canvas, ~30fps, sparse grid of connectives and italic p/q/r in Newsreader; a slow diagonal
"reading" band, occasional glyph swaps, a cursor lens, and an elliptical clear zone behind the
wordmark. Follows the theme via `--ink`, pauses when the tab is hidden, static frame under
`prefers-reduced-motion`.

### Inter-Component Communication
- **Event dispatching**: Components use `createEventDispatcher()` with typed payloads.
- **Store subscriptions**: Reactive `$store` syntax for global state.
- **Component binding**: `bind:this={ref}` for imperative method calls (e.g., `stepInput.toggleCitation()`).
- **Prop drilling**: Parent → child via typed props.

---

## 📦 Stores & State Management

### `authStore` (`src/stores/auth.ts`)
- **State**: `{ user: User | null, loading: boolean, token: string | null, isCaptchaVerified: boolean }`
- **Methods**: `setUser()`, `logout()`, `checkAuth()`, `setCaptchaVerified()`
- **Persistence**: Token in `localStorage('goodle_token')`, captcha in `localStorage('godle_captcha_verified')`

### `notationStore` (`src/stores/auth.ts`)
- Writable store defaulting to `localStorage('goodle_notation') || 'standard'`
- Values: `'standard' | 'whitehead'`
- Auto-persists changes back to localStorage via subscription

### `activeTabStore` (`src/stores/auth.ts`)
- Writable store initialized to `'wordle'`
- Values: `'wordle' | 'frenzy' | 'sandbox' | 'tutorial' | 'about'`

### `activeSandboxProblem` (`src/stores/auth.ts`)
- Writable store holding active custom sandbox problem definition
- Used to pass problems between components (e.g., from StatsModal to SandboxMode)

### Other `localStorage` keys
`goodle_daily_completions` (daily solves by date), `goodle_local_saved_proofs` (guest library),
`goodle_rules_progress` (learned rule ids), `godle_captcha_verified`.

### `themeStore` (`src/stores/theme.ts`)
- Resolves initial theme: `localStorage('goodle_theme')` → OS prefers-color-scheme → `'light'`
- Subscription syncs `document.documentElement.classList` and localStorage
- `toggleTheme()`: inverts current theme
- `isSettingsOpen`: global boolean store for SettingsModal visibility

### `legalModalStore` (`src/stores/legal.ts`)
- **State**: `{ isOpen: boolean, activeTab: 'privacy' | 'terms' }`
- **Helpers**: `openLegalModal(tab?)`, `closeLegalModal()`
- Controls the visibility and active tab of `LegalModal.svelte`

---

## 🎨 Styling & Typography

### Monochrome token system
Defined once as CSS variables in `src/app.css` (`:root` and `:root.dark`) and exposed as Tailwind
colors, so components never need `dark:` color variants.

| Token        | Tailwind            | Light      | Dark       | Use                                  |
|--------------|---------------------|------------|------------|--------------------------------------|
| `--paper`    | `bg-paper`          | `#FAFAFA`  | `#0A0A0A`  | Page background                      |
| `--card`     | `bg-card`           | `#FFFFFF`  | `#121213`  | Panels, inputs                       |
| `--raised`   | `bg-raised`         | `#F3F3F4`  | `#1C1C1E`  | Hover/selected rows, segmented track |
| `--ink`      | `text-ink`/`bg-ink` | `#0A0A0A`  | `#F0F0F0`  | Primary text, primary button fill    |
| `--ink-2`    | `text-ink-2`        | `#525252`  | `#A3A3A8`  | Secondary text                       |
| `--ink-3`    | `text-ink-3`        | `#737373`  | `#85858B`  | Muted text, meta, icons              |
| hairline     | `border-line` / `border-line-strong` | ink @ 9% / 16% | same | Borders, dividers       |

- **No accent hue.** Emphasis comes from size, weight 500, and ink/paper inversion. Semantic
  states (errors, success) are monochrome too: an ink border or an icon, never red/green.
- **Radius**: keycap 4 (`rounded`), controls 8 (`rounded-lg`), cards 12 (`rounded-xl`),
  panels/dialogs 16 (`rounded-2xl`).
- **Type sizes**: `text-meta` (12/16) for labels and meta, `text-caption` (13/20) for secondary
  copy; body 14–15; page titles use `.page-title` (Newsreader ~34px).

### Component classes (`@layer components` in `app.css`)
`.label`, `.page-title`, `.panel`, `.tile`, `.btn` + `.btn-primary | .btn-secondary | .btn-ghost`
(+ `.btn-sm`, `.btn-lg`), `.btn-icon`, `.link`, `.field`, `.seg` / `.seg-item` (segmented control,
active via `aria-pressed="true"`), `.kbd` (keycap), `.tag`, `.margin-note` (proof justification).
Use these before writing ad-hoc utility stacks.

### Font Stack
- **Serif** (formulas, page titles, quotes): Newsreader → Crimson Pro → Georgia
- **Sans** (UI labels, buttons, numerals): Plus Jakarta Sans → Inter → system-ui
- **Wordmark**: "gödle" in Plus Jakarta Sans `font-black tracking-tight` — keep exactly as is.
- **OpenType features**: `cv02`, `cv03`, `cv04`, `cv11`; use `tabular-nums` for figures.
- No uppercase tracked labels, no italic for emphasis (italic only for book titles and the
  p/q/r glyphs in `LogicField`).

### Icons & Motion
- Inline lucide-style SVGs, 16px, stroke 1.5, `currentColor` (text role color). No emoji.
- One easing curve `cubic-bezier(0.22, 1, 0.36, 1)` (Tailwind default `ease`/`ease-out`).
  Transition named properties (`transition-colors`, `transition-[transform,opacity]`), never
  `transition-all`. Press: `active:scale-[0.98]`. No looping decorative motion except `LogicField`.
- Confetti is monochrome (`src/logic/celebrate.ts`). The Frenzy penalty uses `.animate-shake`.

### Dark Mode
- Class-based (`darkMode: 'class'` in Tailwind config); tokens switch under `:root.dark`
- Anti-FOUC: synchronous `<script>` in `index.html` reads localStorage before first paint
- Three-layer sync: head script → theme store subscription → onMount verification

----------------|------------|-----------|
| Canvas         | `#FAFAFA`  | `#0A0A0A` |
| Scrollbar track| `#F4EFE6`  | —         |
| Scrollbar thumb| `#D8D1C5`  | —         |

### Font Stack
- **Serif** (formulas, quotes): Newsreader → Crimson Pro → Playfair Display → Georgia
- **Sans** (UI labels, badges, indices, numerals): Plus Jakarta Sans → Inter → system-ui
- **OpenType features**: `cv02`, `cv03`, `cv04`, `cv11` for refined number/glyph alternates

### Dark Mode
- Class-based (`darkMode: 'class'` in Tailwind config)
- Anti-FOUC: synchronous `<script>` in `index.html` reads localStorage before first paint
- Three-layer sync: head script → theme store subscription → onMount verification

---

## 🚀 Deployment

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/((?!api/.*).*)", "destination": "/index.html" }
  ]
}
```
- All `/api/*` routes → serverless function `api/index.js` (committed esbuild bundle of the Express app)
- All other routes → SPA fallback (`index.html`)

### Production Checklist
1. Set `JWT_SECRET` to a cryptographically random string
2. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`; never set `ALLOW_DEV_OAUTH` in production
3. Set `APP_URL` to your production domain
4. Set `NODE_ENV=production` for HSTS and secure cookies
5. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (SQLite on `/tmp` is ephemeral)
6. Run `npm run build` and commit `api/index.js` before pushing server changes

---

## ⚠️ Known Issues & Architectural Debt

1. **Ephemeral SQLite on Vercel without Turso**: without `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`,
   `server/db.ts` falls back to `/tmp/goodle.db` on Vercel and data is lost between instances.
2. **In-Memory Rate Limiting**: The sliding-window limiter stores state in a local `Map`.
   In serverless or multi-instance deployments, limits apply per container, not globally.
   Consider Redis-backed rate limiting for production.
3. **Unused Dependencies**: `express-rate-limit` and `helmet` are in `package.json` but
   `server/index.ts` uses custom implementations. Either use the packages or remove them.
4. **Committed API bundle**: Vercel runs `api/index.js`, an esbuild bundle of `server/index.ts`.
   It is NOT rebuilt on deploy from source you edit — run `npm run build` (or `build:api`) and
   commit `api/index.js` with every server-side change, or production keeps the old code.
5. **Default Secret**: `JWT_SECRET` has a hardcoded fallback that is public in the repo. If it is
   unset in production, anyone can forge sessions and captcha tokens. Always set it.
6. **No Email Service**: Password reset verifies email match but doesn't actually send a
   reset email. The flow currently resets inline after email verification.
7. **Remaining security items** (from the November 2026 assessment; GitHub OAuth CSRF and the
   dev-OAuth bypass are fixed):
   - Password reset only checks username + email (no proof of inbox ownership).
   - JWTs are not revoked on password change/reset/deletion; token also lives in `localStorage`.
   - Rate limiter keys on client `X-Forwarded-For` (spoofable off Vercel), in-memory per instance.
   - `/api/wordle/submit` and `/api/frenzy/submit` trust client data (forgeable streaks/scores;
     guests can post under any `playerName`).
   - Anonymous community theorem submissions feed `/api/wordle/today` and store unvalidated ASTs.
   - Logic endpoints accept arbitrary nested ASTs (DoS); `LaTeX.svelte` falls back to raw `{@html}`.
   - Security headers are set by Express only, so the static `index.html` on Vercel has no CSP/HSTS;
     CSP allows `'unsafe-inline'` scripts; CORS allows every `*.vercel.app` origin with credentials.
   - `/api/health` is public; profile fields (`avatarImage`, `avatarIcon`, `avatarColor`) unvalidated.
8. **Captcha leftovers**: the server uses its own HMAC SVG captcha, but `CaptchaGate.svelte` still
   contains reCAPTCHA (`grecaptcha`) client code.
9. **Rules progress is per device**: lesson completion lives in `localStorage('goodle_rules_progress')`,
   not in the account.

---

## 📝 Code Conventions

- **Language**: TypeScript throughout (both server and client)
- **Module System**: ES Modules (`"type": "module"` in package.json)
- **File Encoding**: UTF-8 without BOM (⚠️ PowerShell 5.1's `Out-File -Encoding utf8`
  injects BOM that breaks `JSON.parse`; use `Set-Content` or Node scripts)
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **State**: Svelte writable stores for global state, local `let` bindings for component state
- **API Pattern**: Express routes with `async` handlers, prepared SQL statements, structured
  JSON responses (`{ user, token }`, `{ error }`, `{ valid, error, hint }`)
- **Error Shape**: `{ error: string }` with appropriate HTTP status codes
- **Auth Pattern**: Optional auth middleware globally mounted; routes check `req.user` presence
  for protected endpoints
- **Reactive Patterns**: `$:` reactive declarations, `$store` auto-subscriptions,
  `createEventDispatcher()` for component events
- **Server changes ship via the bundle**: after editing `server/` (or logic it imports), run
  `npm run build` and commit `api/index.js` in the same change
- **Changelog**: add user-facing changes to `src/data/changelog.ts` (newest first, tag `Latest`;
  demote the previous entry to `Release`). It renders on the landing page and About tab

### Formula reuse and victory audio

Settings includes a Sounds on/off switch backed by `soundEnabledStore` in `src/stores/theme.ts`. It defaults to on and persists in `localStorage('goodle_sound_enabled')`. Turning sounds off stops any currently playing victory clip and prevents future playback across all modes. The Volume slider uses `soundVolumeStore`, defaults to 35%, persists in `localStorage('goodle_sound_volume')`, and updates playback volume immediately.

Rendered formulas copy as parseable plain text in the active notation. The parser normalizes Unicode mathematical letters, invisible formatting characters, and alternate tilde, dot, and arrow glyphs. Clicking a proof formula opens inline **Use** and **Cite** actions; `ProofTable` emits `insertFormula`, and Daily, Frenzy, and Sandbox pass it to `StepInput.insertFormula()` to populate and focus the editor. Cite uses the existing citation toggle; line-number clicks continue to cite lines. A faint dotted underline indicates that formulas are interactive.

`src/logic/sound.ts` plays the shared `/audio/victory.mp3` clip (source recorded in `public/audio/README.md`) for newly completed Daily, Frenzy, and Sandbox puzzles. Restoring a completed daily puzzle does not replay it. Audio failure never blocks solving.
