# AGENTS.md — gödle Multi-Agent Operational Handbook

> Operational reference for AI coding agents performing maintenance, scaling, feature
> development, security auditing, and incident response on the gödle codebase. Read
> `CLAUDE.md` first for full architectural context.

---

## Table of Contents

1. [Agent Roles & Responsibilities](#1-agent-roles--responsibilities)
2. [Codebase Navigation Quick Reference](#2-codebase-navigation-quick-reference)
3. [Maintenance Procedures](#3-maintenance-procedures)
4. [Feature Development Workflows](#4-feature-development-workflows)
5. [Security Audit Checklist](#5-security-audit-checklist)
6. [Scaling Strategies](#6-scaling-strategies)
7. [Testing Procedures](#7-testing-procedures)
8. [Deployment & Release](#8-deployment--release)
9. [Database Operations](#9-database-operations)
10. [Incident Response](#10-incident-response)
11. [Performance Optimization](#11-performance-optimization)
12. [Common Tasks Reference](#12-common-tasks-reference)

---

## 1. Agent Roles & Responsibilities

### 🔧 Maintenance Agent
**Scope**: Dependency updates, bug fixes, code cleanup, migration authoring.
- **Files to watch**: `package.json`, `server/db.ts` (migrations), `tsconfig.json`
- **Constraints**: Never modify Copi's 19 rules definitions. Preserve editorial typography.
- **Pre-flight**: Always run `npm run build` to verify no compilation errors after changes.

### 🏗️ Feature Development Agent
**Scope**: New game modes, UI components, API endpoints, logic system extensions.
- **Files to modify**: `src/components/*.svelte`, `server/index.ts`, `src/stores/*.ts`
- **Constraints**: Maintain the minimalist aesthetic. No predicate logic (∀, ∃) unless
  explicitly instructed. All new endpoints need auth middleware consideration.
- **Process**: Design → implement → validate build → test endpoints → update CLAUDE.md.

### 🛡️ Security Agent
**Scope**: Vulnerability scanning, penetration testing, hardening, dependency audits.
- **Files to audit**: `server/index.ts` (all middleware, auth flows, input validation),
  `server/db.ts` (SQL patterns), `src/stores/auth.ts` (token handling),
  `src/components/AuthModal.svelte` (client-side auth flows).
- **Process**: Follow the [Security Audit Checklist](#5-security-audit-checklist) below.

### 📈 Scaling Agent
**Scope**: Database migration to persistent storage, caching, performance profiling.
- **Files to modify**: `server/db.ts`, `server/index.ts` (rate limiter, caching layers)
- **Focus areas**: SQLite → PostgreSQL/Turso migration, Redis rate limiting, CDN configuration.

### 🧪 Testing Agent
**Scope**: Writing and executing test suites, integration tests, smoke tests.
- **Approach**: Node.js script-based testing (no test framework currently installed).
- **Coverage targets**: All API endpoints, auth flows, logic engine correctness, edge cases.

### 📚 Documentation Agent
**Scope**: Keeping CLAUDE.md, AGENTS.md, and inline docs current.
- **Trigger**: After any structural change (new endpoints, schema changes, new components).
- **Rule**: Every new API endpoint, database table, component, or store must be documented.

---

## 2. Codebase Navigation Quick Reference

### Where Things Live

| Task                        | Primary File(s)                                    |
|-----------------------------|----------------------------------------------------|
| Add/modify API endpoint     | `server/index.ts`                                  |
| Add database table/column   | `server/db.ts` (add migration in `safeAlterTable`) |
| Add new Svelte component    | `src/components/<Name>.svelte`                     |
| Modify auth flow            | `server/index.ts` + `src/stores/auth.ts` + `src/components/AuthModal.svelte` |
| Add inference/replacement rule | `src/logic/rules.ts` + `src/types/logic.ts` + `src/logic/checker.ts` + `src/logic/solver.ts` |
| Add new game mode           | `src/components/<Mode>.svelte` + `src/App.svelte` (router) + `src/stores/auth.ts` (tab type) |
| Modify styling/theme        | `src/app.css` + `tailwind.config.js`               |
| Add environment variable    | `server/index.ts` (usage) + `vercel.json` (if needed) + CLAUDE.md (document) |
| Modify deployment config    | `vercel.json` + `api/index.ts`                     |
| Add problem presets         | `src/logic/presets.ts`                              |
| Modify parser syntax        | `src/logic/parser.ts` (tokenizer + grammar)         |

### Key Architectural Decisions

| Decision                    | Rationale                                                                 |
|-----------------------------|---------------------------------------------------------------------------|
| Native `node:sqlite`        | Zero-dependency, built into Node 22+, sufficient for MVP/small-scale     |
| Custom rate limiter         | Avoids dependency overhead; works for single-instance deployments         |
| Manual security headers     | Full control over CSP and header values without helmet abstraction         |
| JWT in httpOnly cookies     | Prevents XSS token theft while maintaining stateless auth                 |
| Dual token source           | Cookie for browser requests, Bearer header for API clients                |
| BFS solver with 400 cap     | Prevents DoS from complex problems while covering typical proofs          |
| Mulberry32 PRNG             | Deterministic seeded generation for reproducible daily/frenzy problems    |
| Canvas-based avatar compress| Client-side image processing avoids server compute for avatar uploads      |

---

## 3. Maintenance Procedures

### 3.1 Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update non-breaking changes
npm update

# For major version bumps, update individually and test
npm install <package>@latest

# Always verify after updates
npm run build
```

**High-risk dependencies** (test thoroughly after updating):
- `svelte` / `@sveltejs/vite-plugin-svelte` — may change component API
- `vite` — may affect build pipeline and dev proxy
- `jsonwebtoken` — auth system depends on this
- `katex` — rendering changes may affect formula display

### 3.2 Database Migrations

All migrations live in `server/db.ts` using a safe pattern:

```typescript
// Add new column migration:
try { db.exec(`ALTER TABLE users ADD COLUMN new_field TEXT DEFAULT ''`); } catch (e) {}
```

**Migration rules**:
1. Always use `try/catch` — migrations must be idempotent (safe to re-run).
2. Always provide `DEFAULT` values — existing rows must remain valid.
3. Never rename or drop columns in SQLite (not supported without table recreation).
4. For new tables, add `CREATE TABLE IF NOT EXISTS` in the schema section.
5. Test with a fresh database (delete `data/goodle.db`) AND with an existing one.

### 3.3 Bug Fix Workflow

1. **Reproduce**: Identify the affected component/endpoint.
2. **Locate**: Use the navigation table above to find relevant files.
3. **Fix**: Make minimal, targeted changes.
4. **Verify**: Run `npm run build` (compile check) + manual endpoint testing.
5. **Document**: Update CLAUDE.md if the fix changes API behavior or schemas.
6. **Commit**: Use conventional commit format: `fix: <description>`.

### 3.4 Code Cleanup Tasks

- [ ] Remove unused `express-rate-limit` and `helmet` from `package.json` (custom
  implementations are used instead)
- [ ] Fix `package.json` `"start"` script to use `tsx server/index.ts` instead of
  `node server/index.js`
- [ ] Add proper email sending integration for password reset flow
- [ ] Replace simulated OAuth dialogs with real OAuth redirect flows in production

---

## 4. Feature Development Workflows

### 4.1 Adding a New API Endpoint

1. **Define the route** in `server/index.ts`:
   ```typescript
   app.post('/api/<domain>/<action>', async (req, res) => {
     try {
       // 1. Auth check (if needed)
       if (!req.user) return res.status(401).json({ error: 'Authentication required' });
       // 2. Input validation
       const { field } = req.body;
       if (!field) return res.status(400).json({ error: 'Field is required' });
       // 3. Database operation (prepared statement)
       const stmt = db.prepare('SELECT * FROM table WHERE id = ?');
       const row = stmt.get(field);
       // 4. Response
       res.json({ data: row });
     } catch (err) {
       res.status(500).json({ error: 'Internal server error' });
     }
   });
   ```
2. **Add rate limiting** if the endpoint is expensive or abuse-prone:
   ```typescript
   app.post('/api/<domain>/<action>', myRateLimiter, async (req, res) => { ... });
   ```
3. **Update CLAUDE.md** with the new endpoint in the API reference table.
4. **Test** with curl or a Node.js script.

### 4.2 Adding a New Svelte Component

1. **Create** `src/components/NewComponent.svelte`.
2. **Define props** with TypeScript:
   ```svelte
   <script lang="ts">
     import { createEventDispatcher } from 'svelte';
     export let isOpen: boolean = false;
     const dispatch = createEventDispatcher();
   </script>
   ```
3. **Follow design language**: Use `bg-[#FAFAFA] dark:bg-[#0A0A0A]`, serif fonts for logic
   content, sans fonts for UI elements.
4. **Import** in `App.svelte` or parent component.
5. **Update** CLAUDE.md component table.

### 4.3 Adding a New Game Mode

1. Create `src/components/NewMode.svelte` following `WordleMode.svelte` or `FrenzyMode.svelte`
   as templates.
2. Add the tab to `ActiveTab` type in `src/stores/auth.ts`:
   ```typescript
   export type ActiveTab = 'wordle' | 'frenzy' | 'sandbox' | 'tutorial' | 'newmode';
   ```
3. Add the routing block in `App.svelte`:
   ```svelte
   {:else if $activeTabStore === 'newmode'}
     <NewMode />
   ```
4. Add the navigation tab in `Header.svelte`.
5. Add any backend endpoints in `server/index.ts`.
6. Add any new database tables in `server/db.ts`.

### 4.4 Adding a New Inference/Replacement Rule

> ⚠️ Only do this if explicitly instructed. The current system strictly implements Copi's 19.

1. Add the rule ID to `InferenceRuleId` or `ReplacementRuleId` in `src/types/logic.ts`.
2. Add the `RuleDefinition` to `COPI_RULES` array in `src/logic/rules.ts`.
3. For replacement rules: add a matcher function (`isNewRuleDirect`) and integrate it into
   `isDirectReplacementMatch()`.
4. For inference rules: add the validation case in `validateProofStep()` in
   `src/logic/checker.ts`.
5. Add the deduction expansion in `src/logic/solver.ts` (both `getSinglePremiseDeductions`
   and/or `getTwoPremiseDeductions`).
6. The `TutorialView.svelte` will automatically pick up the new rule from `COPI_RULES`.

### 4.5 Adding Preset Problems

Add entries to `COPI_PRESET_PROBLEMS` in `src/logic/presets.ts`:

```typescript
{
  id: 'copi-new-1',
  title: '§X.Y Ex. Z: Descriptive Title',
  premises: [parseFormula('A > B'), parseFormula('B > C')],
  conclusion: parseFormula('A > C'),
  difficulty: 'easy',  // 'easy' | 'medium' | 'hard'
  presetId: 'copi-new-1',
}
```

Ensure the problem is solvable: test with `solveProblem(premises, conclusion)` from the solver.

---

## 5. Security Audit Checklist

### 5.1 Authentication & Authorization

- [ ] **JWT secret strength**: Verify `JWT_SECRET` env var is set and sufficiently random
  in production (not the hardcoded fallback).
- [ ] **Token expiry**: Verify 30-day expiry is appropriate for your threat model.
- [ ] **Auth middleware coverage**: Verify all protected endpoints check `req.user` presence.
- [ ] **GitHub code exchange**: Verify authorization codes are exchanged server-side with
  valid `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.
- [ ] **Password reset**: Verify email matching is enforced before permitting resets.
- [ ] **Password attachment**: Verify only users with `has_password=0` can attach passwords.
- [ ] **OAuth disconnect safety**: Verify users can't disconnect their only auth method
  (must have a password OR at least one OAuth provider).

### 5.2 Input Validation

- [ ] **SQL injection**: Verify ALL database queries use prepared statements with `?` params.
  Grep for string interpolation in SQL: `grep -n "db\.\(exec\|prepare\)" server/index.ts`
  and verify no template literals contain user input.
- [ ] **XSS prevention**: Verify user-generated content (usernames, bios) is not rendered
  with `{@html}` in Svelte templates. Search: `grep -rn "@html" src/components/`.
- [ ] **Payload limits**: Verify `express.json({ limit: '2mb' })` is set.
- [ ] **Field length limits**: Verify bio (160), avatar image (200K), report details (500).
- [ ] **Type coercion**: Verify numeric inputs are parsed with `parseInt`/`Number` before
  database operations.

### 5.3 Transport Security

- [ ] **HTTPS enforcement**: Verify HSTS header is set in production.
- [ ] **Secure cookies**: Verify `secure: true` when `NODE_ENV === 'production'`.
- [ ] **CORS whitelist**: Verify `TRUSTED_ORIGINS` doesn't include wildcard or overly broad
  patterns. Audit the development fallback for `http://localhost:*`.

### 5.4 Rate Limiting

- [ ] **Auth endpoints**: Verify 25 req / 15 min limit on login, register, reset, OAuth.
- [ ] **Logic assess**: Verify 60 req / 1 min limit on `/api/logic/assess`.
- [ ] **Missing limiters**: Check if any new endpoints need rate limiting.
- [ ] **Bypass vectors**: Verify `x-forwarded-for` header can't be spoofed to bypass limits
  (check if running behind a trusted proxy).

### 5.5 Cryptography

- [ ] **Scrypt parameters**: Verify async scrypt is used (not `scryptSync`).
- [ ] **Timing-safe comparison**: Verify `crypto.timingSafeEqual` for password verification.
- [ ] **Salt uniqueness**: Verify each password hash has its own 16-byte random salt.
- [ ] **reCAPTCHA secret**: Verify `RECAPTCHA_SECRET_KEY` is not the Google public test key
  in production.

### 5.6 Content Security Policy

Audit the CSP header in `server/index.ts`:
- [ ] `script-src`: Only `'self'`, `'unsafe-inline'`, Google reCAPTCHA, Google Fonts.
- [ ] `style-src`: Only `'self'`, `'unsafe-inline'`, Google Fonts.
- [ ] `frame-src`: Only Google reCAPTCHA.
- [ ] `connect-src`: Only `'self'`, Google, GitHub API.
- [ ] `img-src`: `'self'`, `data:`, `blob:`, `https:` (needed for avatars).

### 5.7 Dependency Audit

```bash
npm audit                    # Check for known vulnerabilities
npm audit fix                # Auto-fix where possible
npm audit --audit-level=high # Focus on high/critical only
```

### 5.8 Data Privacy

- [ ] **Leaderboard opt-out**: Verify `opt_out_leaderboard` is respected in all queries
  returning user data to other users.
- [ ] **Account deletion**: Verify `DELETE FROM users` cascades to all related tables.
- [ ] **Profile reports**: Verify `reporter_user_id` is properly anonymized for anonymous
  reports.
- [ ] **Activity heatmap**: Verify only the authenticated user's own heatmap is detailed;
  public profiles show aggregate data only.

---

## 6. Scaling Strategies

### 6.1 Database: SQLite → Persistent Storage

**Current limitation**: SQLite on Vercel uses `/tmp` (ephemeral). Data is lost on cold starts.

**Migration path (priority order)**:

1. **Turso (libSQL)** — Drop-in SQLite-compatible, serverless, edge-replicated:
   ```bash
   npm install @libsql/client
   ```
   Modify `server/db.ts` to use `@libsql/client` with connection URL and auth token.

2. **PostgreSQL (Neon/Supabase)** — Full relational DB:
   - Replace all `db.prepare(...).get/all/run()` calls with async PostgreSQL queries.
   - Update schema from SQLite types to PostgreSQL types.
   - Add connection pooling.

3. **PlanetScale (MySQL-compatible)** — Serverless MySQL:
   - Similar migration to PostgreSQL but with MySQL dialect.

**Migration checklist**:
- [ ] Export current SQLite data before migration
- [ ] Map all SQLite-specific syntax (e.g., `DATETIME DEFAULT CURRENT_TIMESTAMP`)
- [ ] Update all prepared statements to use the new driver's parameterized query syntax
- [ ] Test all endpoints against the new database
- [ ] Update `server/db.ts` initialization logic
- [ ] Update environment variables documentation

### 6.2 Rate Limiting: In-Memory → Distributed

**Current limitation**: In-memory `Map` doesn't share state across serverless instances.

**Options**:
1. **Upstash Redis** (serverless, pay-per-request):
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```
2. **Vercel KV** (built-in Redis):
   ```bash
   npm install @vercel/kv
   ```
3. **Use `express-rate-limit`** with a Redis store (already in `package.json`).

### 6.3 Static Asset Optimization

- [ ] Enable Vite's built-in code splitting and tree shaking (already configured).
- [ ] Consider moving KaTeX CSS to a local bundle instead of CDN for reliability.
- [ ] Add `Cache-Control` headers for static assets in production.
- [ ] Consider pre-rendering the anti-FOUC script as part of the build.

### 6.4 API Performance

- [ ] Add response caching for `GET /api/wordle/today` (same problem all day per difficulty).
- [ ] Add response caching for `GET /api/frenzy/leaderboard` (cache for 30-60 seconds).
- [ ] Consider WebSocket for real-time leaderboard updates in frenzy mode.
- [ ] Profile the BFS solver — if `/api/logic/assess` is slow, reduce `MAX_ITERATIONS` or
  add memoization.

### 6.5 Observability

- [ ] Add structured logging (e.g., `pino`) to replace `console.log` statements.
- [ ] Add request timing middleware to log slow endpoints.
- [ ] Integrate error tracking (Sentry, LogRocket, or Vercel's built-in error reporting).
- [ ] Add health check endpoint (`GET /api/health`) returning `{ status: 'ok', uptime, dbOk }`.

---

## 7. Testing Procedures

### 7.1 Build Verification

```bash
# Must pass cleanly (exit code 0) before any commit
npx vite build
```

### 7.2 API Smoke Tests

```bash
# Auth flow
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Daily problem
curl http://localhost:3001/api/wordle/today?date=2026-09-04&difficulty=easy

# Frenzy generation
curl http://localhost:3001/api/frenzy/generate

# Leaderboard
curl http://localhost:3001/api/frenzy/leaderboard

# Logic validation
curl -X POST http://localhost:3001/api/logic/validate-step \
  -H "Content-Type: application/json" \
  -d '{"existingSteps":[],"formula":{"type":"atom","name":"P"},"ruleId":"MP","citations":[1,2]}'
```

### 7.3 Security Smoke Tests

```bash
# Rate limiting (should get 429 after 25 rapid requests)
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"x","password":"x"}';
done

# CORS rejection (should fail from unauthorized origin)
curl -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3001/api/auth/login -v

# Security headers
curl -I http://localhost:3001/api/wordle/today | grep -i "x-frame\|x-content\|x-xss\|referrer\|csp"

# Password reset without email (should return 403)
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"wrong@email.com","newPassword":"newpass"}'
```

### 7.4 Logic Engine Correctness Tests

Create a test script to verify all 19 rules:

```javascript
// test-logic.mjs
import { parseFormula } from './src/logic/parser.ts';
import { validateProofStep } from './src/logic/checker.ts';
import { solveProblem } from './src/logic/solver.ts';

// Test Modus Ponens
const steps = [
  { stepNumber: 1, formula: parseFormula('P > Q'), rule: 'premise', citations: [], isPremise: true },
  { stepNumber: 2, formula: parseFormula('P'), rule: 'premise', citations: [], isPremise: true },
];
const result = validateProofStep(steps, parseFormula('Q'), 'MP', [1, 2]);
console.assert(result.valid, 'MP should be valid');

// Test solver
const solution = solveProblem(
  [parseFormula('P > Q'), parseFormula('Q > R'), parseFormula('P')],
  parseFormula('R')
);
console.assert(solution.solvable, 'P>Q, Q>R, P ⊢ R should be solvable');
console.log('All logic tests passed');
```

### 7.5 Component Visual Testing

Manual verification checklist for UI changes:
- [ ] Light mode and dark mode render correctly
- [ ] All four notation styles display properly in formulas
- [ ] Mobile responsive layout (viewport < 768px)
- [ ] Modal open/close animations
- [ ] Proof table citation clicking works
- [ ] Symbol keyboard inserts correct notation symbols
- [ ] Share card canvas renders with correct branding
- [ ] Activity heatmap displays correct day colors

---

## 8. Deployment & Release

### 8.1 Pre-Deployment Checklist

- [ ] `npm run build` passes cleanly
- [ ] No `.env` files or secrets in git: `git diff --cached --name-only | grep -i env`
- [ ] No `data/*.db` files staged: `git diff --cached --name-only | grep -i "\.db"`
- [ ] All new endpoints documented in CLAUDE.md
- [ ] Environment variables configured in Vercel dashboard
- [ ] `JWT_SECRET` is NOT the default fallback
- [ ] `RECAPTCHA_SECRET_KEY` is NOT the Google test key
- [ ] OAuth credentials (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are set

### 8.2 Git Workflow

```bash
# Stage changes
git add .

# Verify no sensitive files staged
git diff --cached --name-only

# Commit with conventional format
git commit -m "feat: add new feature description"
# or: fix: / refactor: / docs: / chore: / security:

# Push
git push origin main
```

**Commit message prefixes**:
- `feat:` — new features or game modes
- `fix:` — bug fixes
- `refactor:` — code restructuring without behavior change
- `docs:` — documentation updates
- `chore:` — dependency updates, cleanup
- `security:` — security patches or hardening
- `perf:` — performance improvements
- `style:` — UI/CSS changes

### 8.3 Vercel Deployment

Vercel auto-deploys on push to `main`. Monitor:
1. **Build log**: Verify Vite build succeeds in Vercel's build step.
2. **Function log**: Check serverless function startup for database initialization errors.
3. **Runtime**: Verify API endpoints respond correctly on the deployed URL.

### 8.4 Rollback Procedure

```bash
# View recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback

# Or revert the git commit and push
git revert HEAD
git push origin main
```

---

## 9. Database Operations

### 9.1 Schema Changes

**Adding a column** (preferred for SQLite):
```typescript
// In server/db.ts, add to the migration section:
try { db.exec(`ALTER TABLE users ADD COLUMN new_col TEXT DEFAULT ''`); } catch (e) {}
```

**Adding a table**:
```typescript
// In server/db.ts, add to the schema section:
db.exec(`CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`);
```

### 9.2 Data Inspection (Development)

```bash
# Open SQLite CLI (if installed)
sqlite3 data/goodle.db

# Or use Node.js:
node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('data/goodle.db');
  console.table(db.prepare('SELECT id, username, streak_count FROM users').all());
"
```

### 9.3 Backup & Restore

```bash
# Backup (development only — production needs persistent DB)
cp data/goodle.db data/goodle.db.backup

# Restore
cp data/goodle.db.backup data/goodle.db
```

### 9.4 Data Migration Scripts

When migrating from SQLite to PostgreSQL/Turso:
1. Export all tables to JSON using Node.js scripts.
2. Create equivalent schema in the target database.
3. Bulk insert the exported data.
4. Update `server/db.ts` to use the new driver.
5. Test all endpoints.

---

## 10. Incident Response

### 10.1 Service Down

1. **Check Vercel dashboard** for deployment errors or function crashes.
2. **Check function logs** for database initialization failures.
3. **Verify environment variables** are set correctly in Vercel.
4. **Test locally**: `npm run dev` and verify endpoints work against local SQLite.
5. **Rollback** if a recent deployment broke things.

### 10.2 Security Incident

1. **Rotate `JWT_SECRET`** immediately — this invalidates all active sessions.
2. **Rotate OAuth credentials** if compromised (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).
3. **Rotate `RECAPTCHA_SECRET_KEY`** if bot traffic is detected.
4. **Audit `profile_reports` table** for abuse reports.
5. **Review rate limiter logs** for unusual IP patterns.
6. **Check for SQL injection attempts** in server logs.
7. **Notify affected users** if data was exposed.

### 10.3 Data Loss

1. **On Vercel**: SQLite at `/tmp` is ephemeral by design. This is expected behavior.
   Solution: migrate to persistent storage (see [Scaling Strategies](#6-scaling-strategies)).
2. **On local dev**: Restore from `data/goodle.db.backup` if available.
3. **Git-tracked code**: All source code is recoverable via `git reflog` or remote.

### 10.4 Performance Degradation

1. **Identify slow endpoints**: Check if `/api/logic/assess` (BFS solver) is consuming
   excessive time. The solver has `MAX_ITERATIONS = 400` and `maxSteps = 7` caps.
2. **Check rate limiter map size**: Large numbers of unique IPs can grow the in-memory map.
   The cleanup timer should handle this, but verify.
3. **Database performance**: Run `PRAGMA integrity_check;` and `PRAGMA optimize;` on SQLite.
4. **Client-side**: Check if KaTeX rendering or canvas operations in `ShareModal` are slow.

---

## 11. Performance Optimization

### 11.1 Backend Optimizations

| Area                    | Current State                  | Optimization                                |
|-------------------------|-------------------------------|---------------------------------------------|
| Password hashing        | Async scrypt (✅)             | Already non-blocking                        |
| SQL queries             | Prepared statements (✅)      | Add indexes on hot query columns            |
| BFS solver              | 400 iteration cap (✅)        | Add memoization or iterative deepening      |
| Rate limiter cleanup    | Background timer (✅)         | Monitor map size in production              |
| Daily problem           | Computed per request           | Cache result for the day per difficulty      |
| Leaderboard             | Computed per request           | Cache for 30-60 seconds                     |

**Recommended indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_wordle_user_date ON wordle_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_frenzy_score ON frenzy_records(won, score DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_shared_puzzles_code ON shared_puzzles(share_code);
```

### 11.2 Frontend Optimizations

| Area                    | Current State                  | Optimization                                |
|-------------------------|-------------------------------|---------------------------------------------|
| KaTeX rendering         | Per-keystroke in StepInput     | Debounce preview updates (150ms)            |
| Canvas proof card       | Rendered on modal open         | Lazy render on user action                  |
| Bundle size             | Single chunk                   | Vite code splitting (dynamic imports)       |
| Font loading            | Google Fonts CDN               | Self-host critical fonts                    |
| Anti-FOUC              | Synchronous head script (✅)   | Already optimized                           |

### 11.3 Database Query Optimization

```bash
# Profile slow queries (development)
node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('data/goodle.db');
  db.exec('PRAGMA compile_options');
  // Check query plans
  console.log(db.prepare('EXPLAIN QUERY PLAN SELECT * FROM users WHERE username = ?').all('test'));
"
```

---

## 12. Common Tasks Reference

### Task: Add a New Modal

```svelte
<!-- src/components/NewModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let isOpen: boolean = false;
  const dispatch = createEventDispatcher();
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" on:click={() => dispatch('close')} />
    <!-- Panel -->
    <div class="relative bg-[#FAFAFA] dark:bg-[#0A0A0A] rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
      <button on:click={() => dispatch('close')} class="absolute top-4 right-4">✕</button>
      <!-- Content -->
    </div>
  </div>
{/if}
```

Then in `App.svelte`:
```svelte
<script>
  import NewModal from './components/NewModal.svelte';
  let showNewModal = false;
</script>
<NewModal isOpen={showNewModal} on:close={() => showNewModal = false} />
```

### Task: Add a Protected API Endpoint

```typescript
// In server/index.ts
app.get('/api/protected/data', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const data = db.prepare('SELECT * FROM table WHERE user_id = ?').all(req.user.id);
    res.json({ data });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Task: Add a New Store

```typescript
// In src/stores/newStore.ts or add to auth.ts
import { writable } from 'svelte/store';

function createNewStore() {
  const initial = typeof window !== 'undefined'
    ? localStorage.getItem('goodle_newstore') || 'default'
    : 'default';
  const { subscribe, set, update } = writable(initial);

  if (typeof window !== 'undefined') {
    // Auto-persist
    subscribe(value => localStorage.setItem('goodle_newstore', value));
  }

  return { subscribe, set, update };
}

export const newStore = createNewStore();
```

### Task: Run a Security Audit

```bash
# 1. Dependency vulnerabilities
npm audit

# 2. Search for potential SQL injection
grep -rn "db\.\(exec\|prepare\)" server/ | grep -v "?"

# 3. Search for dangerous HTML rendering
grep -rn "@html" src/

# 4. Search for hardcoded secrets
grep -rn "secret\|password\|key" server/ --include="*.ts" | grep -v "node_modules"

# 5. Check for console.log in production code
grep -rn "console.log" server/index.ts | wc -l

# 6. Verify .gitignore coverage
git status --ignored

# 7. Check environment variable usage
grep -rn "process.env" server/

# 8. Test CORS headers
curl -s -D - -o /dev/null -H "Origin: https://evil.com" http://localhost:3001/api/wordle/today

# 9. Test rate limiting
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code} " \
  -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"x","password":"x"}'; done; echo
```

### Task: Profile the BFS Solver

```javascript
// test-solver-perf.mjs
import { parseFormula } from './src/logic/parser.ts';
import { solveProblem } from './src/logic/solver.ts';

const cases = [
  { premises: ['P > Q', 'P'], conclusion: 'Q', label: 'trivial MP' },
  { premises: ['P > Q', 'Q > R', 'R > S', 'P'], conclusion: 'S', label: 'triple chain' },
  { premises: ['~(P * Q)', '~P > R', '~Q > R', 'R > S'], conclusion: 'S', label: 'hard DEM' },
];

for (const c of cases) {
  const start = performance.now();
  const result = solveProblem(
    c.premises.map(parseFormula),
    parseFormula(c.conclusion)
  );
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`${c.label}: ${result.solvable ? 'SOLVED' : 'FAILED'} in ${elapsed}ms (${result.steps.length} steps)`);
}
```

### Task: Export Database for Migration

```javascript
// export-db.mjs
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const db = new DatabaseSync('data/goodle.db');
const tables = ['users', 'wordle_completions', 'frenzy_records', 'shared_puzzles',
                'user_saved_proofs', 'profile_reports'];

const dump = {};
for (const table of tables) {
  dump[table] = db.prepare(`SELECT * FROM ${table}`).all();
  console.log(`Exported ${dump[table].length} rows from ${table}`);
}

writeFileSync('data/export.json', JSON.stringify(dump, null, 2));
console.log('Export complete: data/export.json');
```

---

## Appendix: File Modification Impact Matrix

When modifying a file, check this matrix to understand the blast radius:

| Modified File              | Also Check / Update                                           |
|----------------------------|---------------------------------------------------------------|
| `server/index.ts`          | CLAUDE.md API tables, auth flow docs, security checklist      |
| `server/db.ts`             | CLAUDE.md schema tables, migration idempotency                |
| `src/types/logic.ts`       | All files in `src/logic/`, `StepInput`, `ProofTable`, solver  |
| `src/logic/rules.ts`       | `checker.ts`, `solver.ts`, `TutorialView.svelte`              |
| `src/logic/parser.ts`      | `StepInput.svelte` (live parse), `SymbolKeyboard.svelte`      |
| `src/logic/solver.ts`      | `SandboxMode.svelte` (assess), `WordleMode.svelte` (hints)    |
| `src/logic/presets.ts`     | Daily problem rotation, `SandboxMode.svelte` library          |
| `src/stores/auth.ts`       | All components reading `$authStore`, `AuthModal`, `Header`    |
| `src/stores/theme.ts`      | `SettingsModal`, `App.svelte`, `index.html` anti-FOUC script  |
| `src/App.svelte`           | All modal visibility, tab routing, component imports          |
| `tailwind.config.js`       | All component styling, dark mode behavior                     |
| `vite.config.ts`           | Dev proxy, build output, Svelte plugin config                 |
| `vercel.json`              | API routing, SPA fallback                                     |
| `package.json`             | Build scripts, dependency availability                        |
| `.gitignore`               | Sensitive file protection                                     |
