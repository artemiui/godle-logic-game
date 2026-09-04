# gödle — Propositional Symbolic Logic Game

> A formal propositional logic web game built on **Svelte** and **Node.js** with **SQLite**, implementing Irving M. Copi's 19 rules of natural deduction (9 Rules of Inference & 10 Rules of Replacement).

---

## ✨ Features

### 📅 Flagship Daily Wordle Mode
- **Daily Propositional Challenge**: A fresh logical theorem to prove each calendar day based on date seeds.
- **3-Stage Selectable Difficulty**:
  - **Stage 1 (Novice)**: 2–3 premises, basic inference rules (Modus Ponens, Modus Tollens, Simplification, Conjunction).
  - **Stage 2 (Adept)**: 3–4 premises, chained implications, Disjunctive Syllogism, Constructive Dilemma, Absorption.
  - **Stage 3 (Master)**: 4–6 premises, complex multi-step deductions requiring Rules of Replacement (De Morgan's, Distribution, Transposition, Exportation).
- **Wordle-Style Share Card**: Generates a spoiler-free copyable emoji card (e.g. `🟩🟩🟩🟩`) with step count and time.
- **Multiple Proof Paths**: Proves statements flexibly—any logically sound deduction sequence reaching the conclusion is valid!

### ⚡ Frenzy Mode (Seeded & 3 Hearts)
- **High-Stakes Seeding**: Generate procedural seeds (e.g. `#omega-4921`) or enter custom seeds to compete on identical puzzles.
- **Shareable Formatted Logic Statements**: Copy and share structured problem statements (e.g. `P ⊃ Q, ~Q, P ∨ R ⊢ R`) with direct URLs.
- **Strict 3 Hearts Rule**: If a step lacks necessary arguments or misapplies a rule, you lose 1 heart (`❤️ ❤️ ❤️` → `💔`).
- **Live Leaderboard**: Scores based on remaining hearts, speed, and minimal proof paths recorded in the SQLite database.

### 🧪 Self-Sufficient Logic Checking & Problem Assessor
- **Interactive Prover**: Validates user-submitted steps with detailed mathematical feedback and hints.
- **Procedural Problem Generator**: Generates guaranteed-solvable propositional puzzles with seed consistency.
- **Automated Assessor (Theorem Prover)**: Analyzes custom user-defined premises and conclusions, verifies provability, and computes minimal proof lengths.
- **Textbook Library**: Built-in exercises directly from Irving Copi's *Symbolic Logic* and *Introduction to Logic*.

### 📐 LaTeX Rendering & Notation Selector
Render symbols dynamically via KaTeX in four distinct historical and mathematical systems:
1. **Copi (Classic)**: `~` (tilde), `•` (dot), `∨` (wedge), `⊃` (horseshoe), `≡` (triple bar)
2. **Modern Math / Standard**: `¬`, `∧`, `∨`, `→`, `↔`
3. **Whitehead & Russell (Principia Mathematica)**: `~`, `·`, `∨`, `⊃`, `≡`
4. **ASCII / Programmer**: `~`, `&`, `v`, `->`, `<->`

### 📖 Comprehensive Tutorial & Interactive Handbook
- Full documentation-style tab explaining propositional deduction from first principles.
- Intuitive explanations, truth-table rationale, and worked examples for all **19 Rules of Copi**:
  - **9 Rules of Inference**: Modus Ponens (M.P.), Modus Tollens (M.T.), Hypothetical Syllogism (H.S.), Disjunctive Syllogism (D.S.), Constructive Dilemma (C.D.), Absorption (Abs.), Simplification (Simp.), Conjunction (Conj.), Addition (Add.).
  - **10 Rules of Replacement**: De Morgan's Theorems (De M.), Commutation (Com.), Association (Assoc.), Distribution (Dist.), Double Negation (D.N.), Transposition (Trans.), Material Implication (Impl.), Material Equivalence (Equiv.), Exportation (Exp.), Tautology (Taut.).
- Interactive rule practice sandbox to test individual rules in isolation.

### 👤 Accounts, Streaks & Database Handling
- Full user authentication with password hashing (`scrypt`) and JWT tokens.
- SQLite database (`data/goodle.db` via native `node:sqlite`) storing users, daily completion streaks, frenzy leaderboard, and shared logic puzzles.

---

## 🎨 Design Philosophy

Designed with **Brilliant.org-style pedagogical elegance**:
- **Warm Academic Canvas**: `#FAF8F5` background, tactile 3D buttons (`active:translate-y-0.5 shadow-tactile-amber`), and soft rounded cards.
- **Serif Typography**: Prominently featuring *Crimson Pro*, *Playfair Display*, *Newsreader*, and *Lora* alongside *JetBrains Mono* for logic code.
- **Visual Feedback**: Real-time LaTeX preview, line citation chips, celebratory confetti, and clear diagnostic explanations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js v22+ (v26+ recommended for built-in `node:sqlite`)
- npm

### Installation
```bash
git clone https://github.com/artemiui/goodle.git
cd goodle
npm install
```

### Running in Development
Starts both the Express backend (`localhost:3001`) and Vite frontend (`localhost:5173`):
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Running the Production Server
The production server serves both the REST API and the compiled Svelte single-page application on `http://localhost:3001`:
```bash
npm start
```

---

## 🗄️ Database Architecture

The application uses an SQLite database located at `data/goodle.db` with WAL mode enabled:
- `users`: User credentials, avatar colors, daily streak counts, best streaks.
- `wordle_completions`: Records of daily puzzles solved per user and stage.
- `frenzy_records`: Frenzy runs with seeds, remaining hearts, completion times, and scores.
- `shared_puzzles`: Community-shared custom logic problems with shareable codes.

---

## 📜 Irving Copi's 19 Rules Reference

### Rules of Inference (Whole lines only)
1. **Modus Ponens (M.P.)**: `p ⊃ q, p ⊢ q`
2. **Modus Tollens (M.T.)**: `p ⊃ q, ~q ⊢ ~p`
3. **Hypothetical Syllogism (H.S.)**: `p ⊃ q, q ⊃ r ⊢ p ⊃ r`
4. **Disjunctive Syllogism (D.S.)**: `p ∨ q, ~p ⊢ q`
5. **Constructive Dilemma (C.D.)**: `(p ⊃ q) • (r ⊃ s), p ∨ r ⊢ q ∨ s`
6. **Absorption (Abs.)**: `p ⊃ q ⊢ p ⊃ (p • q)`
7. **Simplification (Simp.)**: `p • q ⊢ p`
8. **Conjunction (Conj.)**: `p, q ⊢ p • q`
9. **Addition (Add.)**: `p ⊢ p ∨ q`

### Rules of Replacement (Any sub-expression)
10. **De Morgan's Theorems (De M.)**: `~(p • q) ≡ (~p ∨ ~q)` and `~(p ∨ q) ≡ (~p • ~q)`
11. **Commutation (Com.)**: `(p ∨ q) ≡ (q ∨ p)` and `(p • q) ≡ (q • p)`
12. **Association (Assoc.)**: `[p ∨ (q ∨ r)] ≡ [(p ∨ q) ∨ r]` and `[p • (q • r)] ≡ [(p • q) • r]`
13. **Distribution (Dist.)**: `[p • (q ∨ r)] ≡ [(p • q) ∨ (p • r)]` and `[p ∨ (q • r)] ≡ [(p ∨ q) • (p ∨ r)]`
14. **Double Negation (D.N.)**: `p ≡ ~~p`
15. **Transposition (Trans.)**: `(p ⊃ q) ≡ (~q ⊃ ~p)`
16. **Material Implication (Impl.)**: `(p ⊃ q) ≡ (~p ∨ q)`
17. **Material Equivalence (Equiv.)**: `(p ≡ q) ≡ [(p ⊃ q) • (q ⊃ p)]` and `(p ≡ q) ≡ [(p • q) ∨ (~p • ~q)]`
18. **Exportation (Exp.)**: `[(p • q) ⊃ r] ≡ [p ⊃ (q ⊃ r)]`
19. **Tautology (Taut.)**: `p ≡ (p ∨ p)` and `p ≡ (p • p)`
