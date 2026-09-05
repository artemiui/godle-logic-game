import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import fs from 'node:fs';
import { db, initDb } from './db';
import { validateProofStep } from '../src/logic/checker';
import { solveProblem, getProofHint } from '../src/logic/solver';
import { generateProblem, encodeProblemToShareCode, decodeProblemFromShareCode } from '../src/logic/generator';
import { getDailyProblem, COPI_PRESET_PROBLEMS, COMMUNITY_DEFAULT_PROBLEMS } from '../src/logic/presets';
import { parseFormula } from '../src/logic/parser';
import { generateCaptcha, verifyCaptcha } from './captcha';

import { promisify } from 'node:util';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'goodle-super-secret-key-copi-19-rules';
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set. Using insecure default. Set JWT_SECRET env var in production!');
}

// Ensure database schema is ready before handling requests
app.use(async (_req, _res, next) => {
  try {
    await initDb();
  } catch {}
  next();
});

// Seed starter community theorems if table is empty
async function seedStarterCommunityTheorems() {
  try {
    await initDb();
    const commCount = (await db.prepare('SELECT COUNT(*) as count FROM community_theorems').get()) as any;
    if (commCount && Number(commCount.count) === 0) {
      for (const cp of COMMUNITY_DEFAULT_PROBLEMS) {
        const sol = solveProblem(cp.premises, cp.conclusion, 8);
        await db.prepare(`
          INSERT INTO community_theorems (id, user_id, title, difficulty, premises_json, conclusion_json, creator_username, proof_steps_count, is_valid)
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          cp.id,
          cp.title,
          cp.difficulty,
          JSON.stringify(cp.premises),
          JSON.stringify(cp.conclusion),
          cp.author || 'Anonymous Logician',
          sol.minSteps || 1
        );
      }
      console.log('🌱 Seeded default verified community theorems');
    }
  } catch (err) {
    console.warn('Community theorems seed note:', err);
  }
}
seedStarterCommunityTheorems().catch(() => {});

// Security Headers (Helmet equivalents)
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; frame-src 'self' https://www.google.com; img-src 'self' data: blob: https:; connect-src 'self' https://www.google.com https://api.github.com;"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Resilient CORS configuration
function isAllowedOrigin(origin: string | undefined, hostHeader: string | undefined): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    // Allow same-origin (Host matches Origin)
    if (hostHeader && (url.host === hostHeader || url.hostname === hostHeader.split(':')[0])) {
      return true;
    }
    // Allow local development
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true;
    }
    // Allow all Vercel deployments (*.vercel.app)
    if (url.hostname.endsWith('.vercel.app')) {
      return true;
    }
    // Allow configured custom domain
    if (process.env.APP_URL && origin === process.env.APP_URL) {
      return true;
    }
    if (process.env.VERCEL_URL && url.host === process.env.VERCEL_URL) {
      return true;
    }
  } catch {}
  return false;
}

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, req.headers.host)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })(req, res, next);
});

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// High-performance sliding-window rate limiter
function createRateLimiter(windowMs: number, maxRequests: number, message: string) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }
  }, Math.min(windowMs, 60000)).unref();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({ error: message, retryAfterSeconds: retryAfter });
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - entry.count);
    next();
  };
}

const authRateLimiter = createRateLimiter(
  15 * 60 * 1000,
  25,
  'Too many authentication attempts from this IP. Please try again in 15 minutes.'
);
const logicRateLimiter = createRateLimiter(
  60 * 1000,
  60,
  'Too many logic computation requests. Please slow down.'
);

app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/reset-password', authRateLimiter);
app.use('/api/auth/attach-password', authRateLimiter);
app.use('/api/auth/oauth', authRateLimiter);
app.use('/api/auth/change-password', authRateLimiter);
app.use('/api/auth/update-profile', authRateLimiter);
app.use('/api/user/report', authRateLimiter);
app.use('/api/user/reset-stats', authRateLimiter);
app.use('/api/user/delete-account', authRateLimiter);
app.use('/api/logic/assess', logicRateLimiter);
app.use('/api/logic/validate-step', logicRateLimiter);
app.use('/api/logic/hint', logicRateLimiter);
app.use('/api/community/theorems', logicRateLimiter);
app.use('/api/puzzles/share', logicRateLimiter);

// Cookie helper with secure flag in production
function setAuthCookie(res: express.Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

// Asynchronous scrypt password hashing (non-blocking for Node event loop)
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, combined: string): Promise<boolean> {
  const [salt, key] = combined.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Auth Middleware
interface AuthenticatedRequest extends express.Request {
  user?: { id: string; username: string };
}

function authMiddleware(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    req.user = decoded;
  } catch {
    // Invalid or expired token, proceed as guest
  }
  next();
}

// System Health & Database Diagnostics Endpoint
app.get('/api/health', async (_req, res) => {
  const isTursoConfigured = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
  let dbOk = false;
  let rowCount = 0;
  try {
    const r = (await db.prepare('SELECT COUNT(*) as count FROM users').get()) as any;
    dbOk = true;
    rowCount = Number(r?.count || 0);
  } catch {}

  res.json({
    status: 'ok',
    database: isTursoConfigured ? 'turso' : (process.env.VERCEL ? 'vercel-tmp-sqlite' : 'local-sqlite'),
    tursoConfigured: isTursoConfigured,
    tursoHost: process.env.TURSO_DATABASE_URL ? (process.env.TURSO_DATABASE_URL.split('@').pop()?.split('/')[0] || 'configured') : null,
    dbConnected: dbOk,
    registeredUsersCount: rowCount,
    uptime: Math.round(process.uptime()),
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

app.use(authMiddleware as any);

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

// Cryptographic Visual Captcha Generation Endpoint
app.get('/api/auth/captcha', (_req, res) => {
  try {
    const challenge = generateCaptcha(JWT_SECRET);
    res.json(challenge);
  } catch {
    res.status(500).json({ error: 'Failed to generate captcha challenge.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, email, captchaToken, captchaAnswer } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Security Captcha Verification - No developer skips
  const captchaResult = verifyCaptcha(captchaToken, captchaAnswer, JWT_SECRET);
  if (!captchaResult.valid) {
    return res.status(400).json({ error: captchaResult.error || 'Captcha verification failed.' });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (username.trim().length > 32) {
    return res.status(400).json({ error: 'Username must be at most 32 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    await db.prepare(`
      INSERT INTO users (id, username, email, password_hash, avatar_color, has_password)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, username.trim(), email || null, passwordHash, avatarColor);

    const token = jwt.sign({ id, username: username.trim() }, JWT_SECRET, { expiresIn: '30d' });
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        id,
        username: username.trim(),
        avatarColor,
        streakCount: 0,
        bestStreak: 0
      }
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already taken.' });
    }
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, captchaToken, captchaAnswer } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Security Captcha Verification - No developer skips
  const captchaResult = verifyCaptcha(captchaToken, captchaAnswer, JWT_SECRET);
  if (!captchaResult.valid) {
    return res.status(400).json({ error: captchaResult.error || 'Captcha verification failed.' });
  }

  try {
    const user = (await db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim())) as any;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatarColor: user.avatar_color,
        streakCount: user.streak_count,
        bestStreak: user.best_streak,
        lastPlayedDate: user.last_played_date
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login error.' });
  }
});

function calculateRank(streak: number, wordleCount: number, frenzyCount: number): string {
  const total = wordleCount + frenzyCount * 2;
  if (total >= 50 || streak >= 30) return 'Grand Axiomatician';
  if (total >= 25 || streak >= 14) return 'Master of Deduction';
  if (total >= 10 || streak >= 7) return 'Senior Logician';
  if (total >= 3 || streak >= 3) return 'Deductive Practitioner';
  return 'Axiomatic Apprentice';
}

app.get('/api/auth/me', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  try {
    const user = (await db.prepare('SELECT id, username, email, bio, avatar_color, avatar_icon, avatar_image, opt_out_leaderboard, github_id, has_password, streak_count, best_streak, last_played_date, created_at FROM users WHERE id = ?').get(req.user.id)) as any;
    if (!user) {
      return res.json({ user: null });
    }

    const wordleCount = ((await db.prepare('SELECT COUNT(*) as cnt FROM wordle_completions WHERE user_id = ?').get(user.id)) as any)?.cnt || 0;

    const frenzyCountStmt = await db.prepare('SELECT COUNT(*) as cnt FROM frenzy_records WHERE user_id = ? AND won = 1');
    const frenzyCount = (frenzyCountStmt.get(user.id) as any)?.cnt || 0;

    const rankTitle = calculateRank(user.streak_count || 0, wordleCount, frenzyCount);

    // Calculate leaderboard standing (frenzy best score)
    const userBestScoreRow = await db.prepare('SELECT MAX(score) as best FROM frenzy_records WHERE user_id = ?').get(user.id) as any;
    const userBestScore = userBestScoreRow?.best;
    let leaderboardStanding = 'Unranked';
    if (user.opt_out_leaderboard) {
      leaderboardStanding = 'Opted Out';
    } else if (userBestScore !== null && userBestScore !== undefined) {
      const aheadRow = await db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM frenzy_records WHERE user_id IS NOT NULL AND user_id != ? AND score > ?').get(user.id, userBestScore) as any;
      const ahead = aheadRow?.count || 0;
      leaderboardStanding = `#${ahead + 1}`;
    }

    // Activity Heatmap (last 90 days count by day)
    const activityRows = await db.prepare(`
      SELECT day, COUNT(*) as count FROM (
        SELECT substr(created_at, 1, 10) as day FROM wordle_completions WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM frenzy_records WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM user_saved_proofs WHERE user_id = ?
      )
      GROUP BY day
    `).all(user.id, user.id, user.id) as any[];

    const activityMap: Record<string, number> = {};
    for (const r of activityRows) {
      if (r.day) activityMap[r.day] = r.count;
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatarColor: user.avatar_color || '#2563EB',
        avatarIcon: user.avatar_icon || '⊢',
        avatarImage: user.avatar_image || '',
        optOutLeaderboard: Boolean(user.opt_out_leaderboard),
        githubConnected: Boolean(user.github_id),
        hasPassword: Boolean(user.has_password ?? 1),
        streakCount: user.streak_count || 0,
        bestStreak: user.best_streak || 0,
        lastPlayedDate: user.last_played_date,
        createdAt: user.created_at,
        rankTitle,
        totalWordleSolved: wordleCount,
        totalFrenzySolved: frenzyCount,
        totalSolved: wordleCount + frenzyCount,
        leaderboardStanding,
        activityMap
      }
    });
  } catch {
    res.status(500).json({ error: 'Error fetching user profile.' });
  }
});

// Captcha Verification Endpoint (Strict - No developer skips)
app.post('/api/auth/verify-captcha', async (req, res) => {
  const { token, answer } = req.body;
  const result = verifyCaptcha(token, answer, JWT_SECRET);
  if (!result.valid) {
    return res.status(400).json({ success: false, error: result.error || 'Captcha validation failed.' });
  }
  return res.json({ success: true });
});

app.post('/api/auth/change-password', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current and new passwords are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
      return res.status(400).json({ error: 'Current password incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// Attach a password to an account created without one (e.g. OAuth accounts)
app.post('/api/auth/attach-password', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const user = await db.prepare('SELECT has_password FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    if (user.has_password) {
      return res.status(403).json({ error: 'This account already has a password. Use the change-password endpoint instead.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.prepare('UPDATE users SET password_hash = ?, has_password = 1 WHERE id = ?').run(newHash, req.user.id);
    res.json({ success: true, message: 'Password attached successfully. You can now sign in using your username and password.' });
  } catch {
    res.status(500).json({ error: 'Failed to attach password.' });
  }
});

// Password Reset System for login menu (Patched: Requires registered recovery email & captcha)
app.post('/api/auth/reset-password', async (req, res) => {
  const { username, email, newPassword, captchaToken, captchaAnswer } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and new password are required.' });
  }

  // Security Captcha Verification - No developer skips
  const captchaResult = verifyCaptcha(captchaToken, captchaAnswer, JWT_SECRET);
  if (!captchaResult.valid) {
    return res.status(400).json({ error: captchaResult.error || 'Captcha verification failed.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const user = await db.prepare('SELECT id, username, email FROM users WHERE username = ? COLLATE NOCASE').get(username.trim()) as any;
    if (!user) {
      return res.status(404).json({ error: 'No logician account found with that username.' });
    }

    // Security Check: Must have a registered recovery email on file to reset password unauthenticated
    if (!user.email) {
      return res.status(403).json({
        error: 'This account does not have a registered recovery email on file. Unauthenticated password reset is disabled for this account.'
      });
    }

    if (!email || email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ error: 'The email provided does not match the registered account email.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.prepare('UPDATE users SET password_hash = ?, has_password = 1 WHERE id = ?').run(newHash, user.id);
    res.json({ success: true, message: 'Password reset successfully. You may now sign in with your new password.' });
  } catch {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

app.post('/api/auth/update-profile', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  const { username, bio, avatarIcon, avatarImage, avatarColor, email, optOutLeaderboard } = req.body;
  try {
    if (username !== undefined && username.trim()) {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters.' });
      }
      if (trimmed.length > 32) {
        return res.status(400).json({ error: 'Username must be at most 32 characters.' });
      }
      const existing = await db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(trimmed, req.user.id);
      if (existing) {
        return res.status(409).json({ error: 'Username already in use.' });
      }
      await db.prepare('UPDATE users SET username = ? WHERE id = ?').run(trimmed, req.user.id);
      await db.prepare('UPDATE frenzy_records SET player_name = ? WHERE user_id = ?').run(trimmed, req.user.id);
    }
    if (bio !== undefined) {
      await db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio.slice(0, 160), req.user.id);
    }
    if (avatarIcon !== undefined) {
      await db.prepare('UPDATE users SET avatar_icon = ? WHERE id = ?').run(avatarIcon, req.user.id);
    }
    if (avatarImage !== undefined) {
      // Limit avatar image payload size to avoid database bloat (~150KB)
      if (avatarImage && avatarImage.length > 200000) {
        return res.status(400).json({ error: 'Avatar image too large. Limit is ~100KB.' });
      }
      await db.prepare('UPDATE users SET avatar_image = ? WHERE id = ?').run(avatarImage, req.user.id);
    }
    if (avatarColor) {
      await db.prepare('UPDATE users SET avatar_color = ? WHERE id = ?').run(avatarColor, req.user.id);
    }
    if (optOutLeaderboard !== undefined) {
      await db.prepare('UPDATE users SET opt_out_leaderboard = ? WHERE id = ?').run(optOutLeaderboard ? 1 : 0, req.user.id);
    }
    if (email !== undefined) {
      await db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email || null, req.user.id);
    }

    const updated = await db.prepare('SELECT id, username, email, bio, avatar_color, avatar_icon, avatar_image, opt_out_leaderboard, github_id, streak_count, best_streak, last_played_date, created_at FROM users WHERE id = ?').get(req.user.id) as any;
    const token = jwt.sign({ id: updated.id, username: updated.username }, JWT_SECRET, { expiresIn: '30d' });
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      token,
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        bio: updated.bio || '',
        avatarColor: updated.avatar_color,
        avatarIcon: updated.avatar_icon,
        avatarImage: updated.avatar_image || '',
        optOutLeaderboard: Boolean(updated.opt_out_leaderboard),
        githubConnected: Boolean(updated.github_id),
        streakCount: updated.streak_count,
        bestStreak: updated.best_streak,
        lastPlayedDate: updated.last_played_date,
        createdAt: updated.created_at
      }
    });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already in use.' });
    }
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// View public profile of another logician
app.get('/api/user/profile/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const user = await db.prepare('SELECT id, username, bio, avatar_color, avatar_icon, avatar_image, streak_count, best_streak, created_at, opt_out_leaderboard FROM users WHERE username = ? COLLATE NOCASE').get(username) as any;
    if (!user) {
      return res.status(404).json({ error: 'Logician profile not found.' });
    }

    const wordleCount = (await db.prepare('SELECT COUNT(*) as cnt FROM wordle_completions WHERE user_id = ?').get(user.id) as any)?.cnt || 0;
    const frenzyCount = (await db.prepare('SELECT COUNT(*) as cnt FROM frenzy_records WHERE user_id = ? AND won = 1').get(user.id) as any)?.cnt || 0;
    const rankTitle = calculateRank(user.streak_count || 0, wordleCount, frenzyCount);

    const userBestScoreRow = await db.prepare('SELECT MAX(score) as best FROM frenzy_records WHERE user_id = ?').get(user.id) as any;
    const userBestScore = userBestScoreRow?.best;
    let leaderboardStanding = 'Unranked';
    if (user.opt_out_leaderboard) {
      leaderboardStanding = 'Hidden';
    } else if (userBestScore !== null && userBestScore !== undefined) {
      const aheadRow = await db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM frenzy_records WHERE user_id IS NOT NULL AND user_id != ? AND score > ?').get(user.id, userBestScore) as any;
      const ahead = aheadRow?.count || 0;
      leaderboardStanding = `#${ahead + 1}`;
    }

    const activityRows = await db.prepare(`
      SELECT day, COUNT(*) as count FROM (
        SELECT substr(created_at, 1, 10) as day FROM wordle_completions WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM frenzy_records WHERE user_id = ?
        UNION ALL
        SELECT substr(created_at, 1, 10) as day FROM user_saved_proofs WHERE user_id = ?
      )
      GROUP BY day
    `).all(user.id, user.id, user.id) as any[];

    const activityMap: Record<string, number> = {};
    for (const r of activityRows) {
      if (r.day) activityMap[r.day] = r.count;
    }

    res.json({
      user: {
        username: user.username,
        bio: user.bio || '',
        avatarColor: user.avatar_color,
        avatarIcon: user.avatar_icon || '⊢',
        avatarImage: user.avatar_image || '',
        rankTitle,
        totalSolved: wordleCount + frenzyCount,
        leaderboardStanding,
        streakCount: user.streak_count,
        bestStreak: user.best_streak,
        createdAt: user.created_at,
        activityMap
      }
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch public profile.' });
  }
});

// Profile reporting / moderation flagging
app.post('/api/user/report', async (req: AuthenticatedRequest, res) => {
  const { reportedUsername, reason, details } = req.body;
  if (!reportedUsername || !reason) {
    return res.status(400).json({ error: 'Reported username and reason are required.' });
  }

  try {
    const reportId = crypto.randomUUID();
    const reporterId = req.user?.id || 'anonymous';
    await db.prepare(`
      INSERT INTO profile_reports (id, reporter_user_id, reported_username, reason, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(reportId, reporterId, reportedUsername.trim(), reason, details ? details.slice(0, 500) : null);

    res.json({ success: true, message: 'Profile report submitted. Thank you for keeping the gödle space safe.' });
  } catch {
    res.status(500).json({ error: 'Failed to submit profile report.' });
  }
});

// Public OAuth configuration endpoint
app.get('/api/auth/oauth/config', async (_req, res) => {
  res.json({
    githubClientId: process.env.GITHUB_CLIENT_ID || null,
    devMode: Boolean(process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_OAUTH),
  });
});

// OAuth Handler (GitHub) with Real Server-side Verification
app.post('/api/auth/oauth/github', async (req: AuthenticatedRequest, res) => {
  const { code, githubUsername: clientUsername } = req.body;
  let verifiedUsername = clientUsername;
  let verifiedGithubId: string | null = null;

  // Real GitHub OAuth Server-side Verification (Authorization Code Exchange)
  if (code) {
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.access_token) {
        return res.status(401).json({ error: 'GitHub OAuth authorization code exchange failed.' });
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'goodle-auth',
        },
      });
      const userData = await userRes.json() as any;
      verifiedUsername = userData.login;
      verifiedGithubId = String(userData.id);
    } catch {
      return res.status(502).json({ error: 'Failed to communicate with GitHub OAuth service.' });
    }
  } else {
    // In production without ALLOW_DEV_OAUTH, reject unverified OAuth calls without authorization code
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_OAUTH) {
      return res.status(400).json({ error: 'GitHub authorization code is required in production.' });
    }
    const safeSeed = verifiedUsername ? verifiedUsername.toLowerCase().replace(/[^a-z0-9]/g, '_') : crypto.randomBytes(4).toString('hex');
    verifiedGithubId = req.body.githubId || `gh_${safeSeed}`;
  }

  try {
    if (req.user) {
      // Link GitHub to current user
      await db.prepare('UPDATE users SET github_id = ? WHERE id = ?').run(verifiedGithubId, req.user.id);
      return res.json({ success: true, message: 'GitHub account linked successfully.' });
    }

    let existing = await db.prepare('SELECT * FROM users WHERE github_id = ?').get(verifiedGithubId) as any;
    if (existing) {
      const token = jwt.sign({ id: existing.id, username: existing.username }, JWT_SECRET, { expiresIn: '30d' });
      setAuthCookie(res, token);
      return res.json({
        success: true,
        token,
        user: {
          id: existing.id,
          username: existing.username,
          avatarColor: existing.avatar_color || '#2563EB',
          avatarIcon: existing.avatar_icon || '⊢',
          streakCount: existing.streak_count || 0,
          bestStreak: existing.best_streak || 0,
          hasPassword: Boolean(existing.has_password ?? 1),
        }
      });
    }

    // Auto-create from GitHub (requires password to be attached later)
    const baseUsername = (verifiedUsername || 'gh_logician').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
    let finalUsername = baseUsername;
    let counter = 1;
    while (await db.prepare('SELECT id FROM users WHERE username = ?').get(finalUsername)) {
      finalUsername = `${baseUsername}_${counter++}`;
    }

    const id = crypto.randomUUID();
    const tempHash = await hashPassword(crypto.randomBytes(16).toString('hex'));
    const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    await db.prepare('INSERT INTO users (id, username, password_hash, avatar_color, github_id, has_password) VALUES (?, ?, ?, ?, ?, 0)')
      .run(id, finalUsername, tempHash, avatarColor, verifiedGithubId);

    const token = jwt.sign({ id, username: finalUsername }, JWT_SECRET, { expiresIn: '30d' });
    setAuthCookie(res, token);
    res.json({
      success: true,
      token,
      user: {
        id,
        username: finalUsername,
        avatarColor,
        avatarIcon: '⊢',
        streakCount: 0,
        bestStreak: 0,
        hasPassword: false
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'GitHub authentication error.' });
  }
});

app.post('/api/auth/oauth/disconnect', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  const { provider } = req.body;

  if (provider !== 'github') {
    return res.status(400).json({ error: 'Invalid provider. Must be "github".' });
  }

  try {
    // Safety check: ensure user retains at least one auth method after disconnecting
    const user = await db.prepare('SELECT has_password, github_id FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const hasPassword = Boolean(user.has_password);
    const hasGithub = Boolean(user.github_id);

    if (!hasGithub) {
      return res.status(400).json({ error: 'GitHub account is not linked.' });
    }

    if (!hasPassword) {
      return res.status(400).json({
        error: 'Cannot disconnect your only sign-in method. Attach a password first.'
      });
    }

    await db.prepare('UPDATE users SET github_id = NULL WHERE id = ?').run(req.user.id);
    res.json({ success: true, message: 'Disconnected GitHub account.' });
  } catch {
    res.status(500).json({ error: 'Failed to disconnect account.' });
  }
});

// DANGER ZONE: Reset Account Statistics
app.post('/api/user/reset-stats', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  const { confirmText } = req.body;

  if (confirmText !== 'RESET STATS') {
    return res.status(400).json({ error: 'Confirmation phrase must exactly match "RESET STATS".' });
  }

  try {
    await db.prepare('DELETE FROM wordle_completions WHERE user_id = ?').run(req.user.id);
    await db.prepare('DELETE FROM frenzy_records WHERE user_id = ?').run(req.user.id);
    await db.prepare('UPDATE users SET streak_count = 0, best_streak = 0, last_played_date = NULL WHERE id = ?').run(req.user.id);

    res.json({ success: true, message: 'All statistics, records, and streak history have been reset.' });
  } catch {
    res.status(500).json({ error: 'Failed to reset statistics.' });
  }
});

// DANGER ZONE: Delete Account Permanently
app.post('/api/user/delete-account', async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
  const { confirmUsername } = req.body;

  try {
    const user = await db.prepare('SELECT username FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user || confirmUsername !== user.username) {
      return res.status(400).json({ error: `Confirmation username must exactly match "${user?.username}".` });
    }

    await db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    res.clearCookie('token');
    res.json({ success: true, message: 'Account and associated records have been permanently deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

app.get('/api/user/history', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
    const wordles = await db.prepare(`
      SELECT date, difficulty, step_count, duration_seconds, created_at
      FROM wordle_completions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 25
    `).all(req.user.id);

    const frenzies = await db.prepare(`
      SELECT seed, hearts_left, score, time_seconds, won, created_at
      FROM frenzy_records
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 25
    `).all(req.user.id);

    res.json({ wordles, frenzies });
  } catch {
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

app.get('/api/user/saved-proofs', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
    const rows = await db.prepare(`
      SELECT id, title, difficulty, premises_json, conclusion_json, notes, created_at
      FROM user_saved_proofs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    const proofs = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      premises: JSON.parse(r.premises_json),
      conclusion: JSON.parse(r.conclusion_json),
      notes: r.notes,
      createdAt: r.created_at
    }));

    res.json({ proofs });
  } catch {
    res.status(500).json({ error: 'Failed to fetch saved proofs.' });
  }
});

app.post('/api/user/saved-proofs', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in to save proofs to your account.' });
  }
  const { title, difficulty, premises, conclusion, notes } = req.body;
  if (!title || !premises || !conclusion) {
    return res.status(400).json({ error: 'Title, premises, and conclusion are required.' });
  }

  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO user_saved_proofs (id, user_id, title, difficulty, premises_json, conclusion_json, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title.trim(), difficulty || 'custom', JSON.stringify(premises), JSON.stringify(conclusion), notes || null);

    res.json({ success: true, id, message: 'Proof saved to your account ledger.' });
  } catch {
    res.status(500).json({ error: 'Failed to save proof.' });
  }
});

app.delete('/api/user/saved-proofs/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  try {
    await db.prepare('DELETE FROM user_saved_proofs WHERE (id = ? OR title = ?) AND user_id = ?').run(req.params.id, req.params.id, req.user.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete saved proof.' });
  }
});

app.post('/api/auth/logout', async (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// -------------------------------------------------------------
// LOGIC API (VALIDATOR, HINTS, ASSESSOR)
// -------------------------------------------------------------

app.post('/api/logic/validate-step', async (req, res) => {
  const { existingSteps, newFormula, ruleId, citations } = req.body;
  try {
    const parsedFormula = typeof newFormula === 'string' ? parseFormula(newFormula) : newFormula;
    const result = validateProofStep(existingSteps, parsedFormula, ruleId, citations);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ valid: false, error: err.message || 'Invalid step input' });
  }
});

app.post('/api/logic/hint', async (req, res) => {
  const { steps, conclusion } = req.body;
  try {
    const parsedConclusion = typeof conclusion === 'string' ? parseFormula(conclusion) : conclusion;
    const hint = getProofHint(steps, parsedConclusion);
    res.json({ hint });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error generating hint' });
  }
});

app.post('/api/logic/assess', async (req, res) => {
  const { premises, conclusion } = req.body;
  try {
    const parsedPremises = premises.map((p: any) => typeof p === 'string' ? parseFormula(p) : p);
    const parsedConclusion = typeof conclusion === 'string' ? parseFormula(conclusion) : conclusion;
    const solution = solveProblem(parsedPremises, parsedConclusion);
    res.json(solution);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Assessment failed' });
  }
});

// -------------------------------------------------------------
// DAILY WORDLE API
// -------------------------------------------------------------

app.get('/api/wordle/today', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const difficulty = ((req.query.difficulty as string) || 'easy') as 'easy' | 'medium' | 'hard';

  try {
    const commRows = await db.prepare(`
      SELECT id, title, difficulty, premises_json, conclusion_json, creator_username
      FROM community_theorems
      WHERE is_valid = 1 AND difficulty = ?
    `).all(difficulty) as any[];

    const copiProblems = COPI_PRESET_PROBLEMS.filter(p => p.difficulty === difficulty);
    const candidates: any[] = [
      ...copiProblems.map(p => ({
        ...p,
        isCommunity: false,
        author: undefined,
        creator_username: undefined,
      })),
      ...commRows.map(r => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        premises: JSON.parse(r.premises_json),
        conclusion: JSON.parse(r.conclusion_json),
        author: r.creator_username,
        creator_username: r.creator_username,
        isCommunity: true,
      }))
    ];

    let hash = 0;
    for (let i = 0; i < date.length; i++) {
      hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
    }

    const chosen = candidates[hash % candidates.length];
    const problem = {
      ...chosen,
      id: 'daily-' + date + '-' + difficulty,
      title: chosen.isCommunity ? chosen.title : 'Daily gödle: ' + chosen.title,
    };

    res.json({ problem, date, difficulty });
  } catch {
    const problem = getDailyProblem(date, difficulty);
    res.json({ problem, date, difficulty });
  }
});

app.post('/api/wordle/submit', async (req: AuthenticatedRequest, res) => {
  const { date, difficulty, stepCount, durationSeconds } = req.body;
  const userId = req.user?.id;

  try {
    if (userId) {
      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO wordle_completions (id, user_id, date, difficulty, step_count, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, userId, date, difficulty, stepCount, durationSeconds);

      // Update user streak if not already recorded today
      const user = (await db.prepare('SELECT streak_count, best_streak, last_played_date FROM users WHERE id = ?').get(userId)) as any;

      if (user) {
        let newStreak = user.streak_count;
        const lastDate = user.last_played_date;
        const today = new Date(date);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else if (lastDate !== date) {
          newStreak = 1;
        }

        const bestStreak = Math.max(newStreak, user.best_streak || 0);
        await db.prepare('UPDATE users SET streak_count = ?, best_streak = ?, last_played_date = ? WHERE id = ?')
          .run(newStreak, bestStreak, date, userId);
      }
    }

    res.json({ success: true, message: 'Proof submitted successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record completion.' });
  }
});

// -------------------------------------------------------------
// FRENZY API
// -------------------------------------------------------------

app.get('/api/frenzy/generate', async (req, res) => {
  const seed = (req.query.seed as string) || `frenzy-${Date.now()}`;
  const difficulty = ((req.query.difficulty as string) || 'medium') as 'easy' | 'medium' | 'hard';
  const problem = generateProblem(seed, difficulty);
  const shareCode = encodeProblemToShareCode(problem);
  res.json({ problem, seed, shareCode });
});

app.post('/api/frenzy/submit', async (req: AuthenticatedRequest, res) => {
  const { seed, heartsLeft, score, timeSeconds, won, playerName } = req.body;
  const userId = req.user?.id || null;
  // Authenticated users always use their real username; guests get a sanitized name
  const name = req.user?.username
    || (typeof playerName === 'string' ? playerName.trim().slice(0, 32) : '')
    || 'Anonymous Logician';

  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO frenzy_records (id, user_id, player_name, seed, hearts_left, score, time_seconds, won)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, seed, heartsLeft, score, timeSeconds, won ? 1 : 0);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit frenzy record.' });
  }
});

app.get('/api/frenzy/leaderboard', async (_req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT COALESCE(u.username, f.player_name) as username, f.player_name, f.score, f.hearts_left, f.time_seconds, f.seed, f.created_at
      FROM frenzy_records f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.won = 1 AND (u.opt_out_leaderboard IS NULL OR u.opt_out_leaderboard = 0)
      ORDER BY f.score DESC, f.hearts_left DESC, f.time_seconds ASC
      LIMIT 20
    `).all();
    res.json({ leaderboard: rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

// -------------------------------------------------------------
// COMMUNITY THEOREMS API
// -------------------------------------------------------------

app.get('/api/community/theorems', async (_req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT id, title, difficulty, premises_json, conclusion_json, creator_username, proof_steps_count, created_at
      FROM community_theorems
      WHERE is_valid = 1
      ORDER BY created_at DESC
    `).all() as any[];

    const theorems = rows.map(r => ({
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      premises: JSON.parse(r.premises_json),
      conclusion: JSON.parse(r.conclusion_json),
      creator_username: r.creator_username,
      author: r.creator_username,
      proof_steps_count: r.proof_steps_count,
      created_at: r.created_at,
      isCommunity: true,
    }));

    res.json({ theorems });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch community theorems.' });
  }
});

app.post('/api/community/theorems', async (req: AuthenticatedRequest, res) => {
  try {
    const { title, difficulty, premises, conclusion } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Theorem title is required.' });
    }
    if (!Array.isArray(premises) || premises.length === 0) {
      return res.status(400).json({ error: 'At least one premise is required.' });
    }
    if (!conclusion) {
      return res.status(400).json({ error: 'Conclusion formula is required.' });
    }

    // Verify logical validity with Copi theorem prover
    const solution = solveProblem(premises, conclusion, 8);
    if (!solution.solvable) {
      return res.status(400).json({
        error: 'Theorem cannot be proven valid under Copi\'s 19 rules. Only logically valid, provable theorems can be accepted into the Community Library.'
      });
    }

    const id = crypto.randomUUID();
    const creator = req.user?.username || 'Anonymous Logician';
    const diff = difficulty || 'medium';

    await db.prepare(`
      INSERT INTO community_theorems (id, user_id, title, difficulty, premises_json, conclusion_json, creator_username, proof_steps_count, is_valid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, req.user?.id || null, title.trim(), diff, JSON.stringify(premises), JSON.stringify(conclusion), creator, solution.minSteps);

    res.json({
      success: true,
      id,
      message: `Theorem "${title.trim()}" proven valid (${solution.minSteps} step${solution.minSteps === 1 ? '' : 's'}) and published to the Community Library!`,
      theorem: {
        id,
        title: title.trim(),
        difficulty: diff,
        premises,
        conclusion,
        creator_username: creator,
        author: creator,
        proof_steps_count: solution.minSteps,
        isCommunity: true,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit community theorem.' });
  }
});

// -------------------------------------------------------------
// SHARED PUZZLE API
// -------------------------------------------------------------

app.post('/api/puzzles/share', async (req: AuthenticatedRequest, res) => {
  const { title, difficulty, premises, conclusion } = req.body;
  const creator = req.user?.username || 'Logician';
  const shareCode = `goodle-${crypto.randomBytes(4).toString('hex')}`;

  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO shared_puzzles (id, share_code, title, difficulty, premises_json, conclusion_json, creator_username)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, shareCode, title, difficulty, JSON.stringify(premises), JSON.stringify(conclusion), creator);

    res.json({ shareCode });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to share puzzle.' });
  }
});

app.get('/api/puzzles/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const row = await db.prepare('SELECT * FROM shared_puzzles WHERE share_code = ?').get(code) as any;
    if (!row) {
      const decoded = decodeProblemFromShareCode(code);
      if (decoded) {
        return res.json({ problem: decoded });
      }
      return res.status(404).json({ error: 'Puzzle not found.' });
    }

    await db.prepare('UPDATE shared_puzzles SET plays_count = plays_count + 1 WHERE id = ?').run(row.id);

    const problem = {
      id: row.id,
      title: row.title,
      difficulty: row.difficulty,
      premises: JSON.parse(row.premises_json),
      conclusion: JSON.parse(row.conclusion_json),
      seed: row.share_code,
      creator: row.creator_username,
    };
    res.json({ problem });
  } catch {
    res.status(500).json({ error: 'Error loading puzzle.' });
  }
});

// Production: serve built client
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', async (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 gödle Server running on http://localhost:${PORT}`);
  });
}

export { app };
export default app;
