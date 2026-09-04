# CLAUDE.md — Goodle Project Context & AI Guidance

## 📌 Project Overview
**Goodle** is a full-stack propositional symbolic logic web game inspired by Irving M. Copi’s classic textbooks (*Symbolic Logic* and *Introduction to Logic*). The core mechanic revolves around formal natural deduction proofs, letting players prove statements in multiple valid ways as long as each step strictly adheres to the propositional rules.

---

- **Minimalist Editorial Aesthetic (Swiss & Japanese Monochromatic Design)**: Inspired by high-fashion editorial layouts (e.g. Yohji Yamamoto) and precision Korean graphic typography (e.g. Lee Yoojin). High-contrast palette (`#FAFAFA` paper white in light mode, `#0A0A0A` pitch black in dark mode), hairline grid dividers, generous whitespace, and pure focus on deduction.
- **Distraction-Free Solving Space**: When solving, the canvas presents strictly the target statement to prove (`∴ Conclusion`) and the sequenced order of logical premises, followed by clean line derivations.
- **Subtle Settings Icon & Utility Panel**: Integrated gear icon in the header for switching light/dark appearance and selecting logic notation traditions.
- **Typography**: Editorial serifs (*Newsreader*, *Crimson Pro*, *Lora*) for logic statements and math notation, paired with Swiss grotesques (*Plus Jakarta Sans*) and monospaced indices (*JetBrains Mono*).
- **LaTeX Math Rendering**: Formulas are rendered with **KaTeX** and support dynamic real-time notation switching across four traditions:
  - **Copi (Classic)**: `~`, `•`, `⊃`, `≡`
  - **Modern Math / Standard**: `¬`, `∧`, `→`, `↔`
  - **Whitehead & Russell (Principia)**: `~`, `·`, `⊃`, `≡`
  - **ASCII / Programmer**: `~`, `&`, `->`, `<->`

---

## 🛑 Critical Scope Constraints
- **Strictly Rules of Inference & Rules of Replacement**: Only Irving Copi's **19 propositional rules** are included.
- **Do NOT include** predicate calculus / first-order logic (no quantifiers $\forall, \exists$, UI, EG, UG, EI) or advanced techniques like Conditional Proof (CP) / Indirect Proof (IP) unless explicitly instructed in future expansions.

### Copi's 19 Rules:
1. **9 Rules of Inference** (whole lines only):
   - `MP` (Modus Ponens): $p \supset q, p \vdash q$
   - `MT` (Modus Tollens): $p \supset q, \sim q \vdash \sim p$
   - `HS` (Hypothetical Syllogism): $p \supset q, q \supset r \vdash p \supset r$
   - `DS` (Disjunctive Syllogism): $p \lor q, \sim p \vdash q$
   - `CD` (Constructive Dilemma): $(p \supset q) \bullet (r \supset s), p \lor r \vdash q \lor s$
   - `ABS` (Absorption): $p \supset q \vdash p \supset (p \bullet q)$
   - `SIMP` (Simplification): $p \bullet q \vdash p$ (and $q$)
   - `CONJ` (Conjunction): $p, q \vdash p \bullet q$
   - `ADD` (Addition): $p \vdash p \lor q$
2. **10 Rules of Replacement** (applicable to whole lines OR arbitrary sub-expressions):
   - `DEM` (De Morgan's Theorems): $\sim(p \bullet q) \equiv (\sim p \lor \sim q)$ and $\sim(p \lor q) \equiv (\sim p \bullet \sim q)$
   - `COM` (Commutation): $(p \lor q) \equiv (q \lor p)$ and $(p \bullet q) \equiv (q \bullet p)$
   - `ASSOC` (Association): $[p \lor (q \lor r)] \equiv [(p \lor q) \lor r]$ and $[p \bullet (q \bullet r)] \equiv [(p \bullet q) \bullet r]$
   - `DIST` (Distribution): $[p \bullet (q \lor r)] \equiv [(p \bullet q) \lor (p \bullet r)]$ and $[p \lor (q \bullet r)] \equiv [(p \lor q) \bullet (p \lor r)]$
   - `DN` (Double Negation): $p \equiv \sim\sim p$
   - `TRANS` (Transposition): $(p \supset q) \equiv (\sim q \supset \sim p)$
   - `IMPL` (Material Implication): $(p \supset q) \equiv (\sim p \lor q)$
   - `EQUIV` (Material Equivalence): $(p \equiv q) \equiv [(p \supset q) \bullet (q \supset p)]$ and $(p \equiv q) \equiv [(p \bullet q) \lor (\sim p \bullet \sim q)]$
   - `EXP` (Exportation): $[(p \bullet q) \supset r] \equiv [p \supset (q \supset r)]$
   - `TAUT` (Tautology): $p \equiv (p \lor p)$ and $p \equiv (p \bullet p)$

---

## 🛠️ Architecture & Tech Stack

### Frontend
- **Framework**: Svelte 5 / SvelteKit (`@sveltejs/vite-plugin-svelte` + `vite`)
- **Styling**: Tailwind CSS + custom typography & tactile shadow system
- **Math Rendering**: KaTeX (`katex`)
- **State Management**: Svelte Stores (`auth.ts` for session, active tab, notation)

### Backend & Database
- **Server**: Express.js with TypeScript (`tsx` runner)
- **Database**: Native `node:sqlite` (`DatabaseSync` in Node.js 22+) in WAL mode at `data/goodle.db`
- **Auth**: Native `scryptSync` password hashing + JWT tokens (cookies & `Authorization: Bearer` header)
- **Deployment**: Single command `npm start` serves both the Express API and compiled Svelte static assets (`dist/`)

---

## 📁 Directory Structure
```
goodle/
├── data/
│   └── goodle.db              # SQLite Database (WAL mode, foreign keys)
├── server/
│   ├── db.ts                  # SQLite schema: users, wordle_completions, frenzy_records, shared_puzzles
│   └── index.ts               # Express API endpoints (auth, wordle, frenzy, logic, puzzles)
├── src/
│   ├── types/
│   │   └── logic.ts           # AST Formulas, Rules, ProofStep, Problem, NotationStyle
│   ├── logic/
│   │   ├── ast.ts             # AST equality, cloning, sub-formula replacement
│   │   ├── parser.ts          # Recursive-descent Pratt-like parser for logic strings
│   │   ├── latex.ts           # KaTeX LaTeX stringifier & notation mappings
│   │   ├── rules.ts           # Copi 19 rules definitions & recursive replacement engine
│   │   ├── checker.ts         # Proof step validation & diagnostic feedback
│   │   ├── solver.ts          # BFS automated logic theorem prover & hint generator
│   │   ├── generator.ts       # Seeded procedural problem generator (Mulberry32 PRNG)
│   │   └── presets.ts         # Textbook problem library from Copi's Symbolic Logic
│   ├── components/
│   │   ├── Header.svelte      # Navbar, tabs, notation switcher, user avatar & streak
│   │   ├── LaTeX.svelte       # KaTeX reactive math renderer
│   │   ├── ProofTable.svelte  # Formal 2-column proof table (Line, Formula, Rule, Status)
│   │   ├── StepInput.svelte   # Formula input, Copi rule picker, line citation chips
│   │   ├── SymbolKeyboard.svelte # Virtual logic symbol keypad
│   │   ├── WordleMode.svelte  # 3-Stage Daily challenge, streak, emoji share card
│   │   ├── FrenzyMode.svelte  # 3 Hearts seeded mode, timer, statement share
│   │   ├── SandboxMode.svelte # Custom problem creator, generator, solver assessor
│   │   ├── TutorialView.svelte # Interactive 19 rules documentation & practice sandboxes
│   │   ├── AuthModal.svelte   # Login, registration, profile & streaks
│   │   └── StatsModal.svelte  # Daily stats distribution & Frenzy leaderboard
│   ├── stores/
│   │   └── auth.ts            # authStore, notationStore, activeTabStore
│   ├── App.svelte             # Root layout & view router
│   └── main.ts                # Svelte entry point
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 💻 Essential Commands

```bash
# Start full development stack (API on 3001, Vite on 5173 with proxy)
npm run dev

# Build production frontend bundle into dist/
npm run build

# Run production server (serves API + dist/ SPA on port 3001)
npm start

# Run API test suite
node -e "fetch('http://127.0.0.1:3001/api/wordle/today').then(r => r.json()).then(console.log)"
```

---

## ⚠️ Windows & File Encoding Notice
- Always ensure `.json`, `.ts`, and `.svelte` files are encoded in **UTF-8 without BOM**.
- PowerShell's `Out-File -Encoding utf8` in PowerShell 5.1 injects a UTF-8 BOM (`0xEF 0xBB 0xBF`), which breaks `JSON.parse` in Node. Always strip BOM or use `Set-Content` / Node scripts.
