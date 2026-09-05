import crypto from 'node:crypto';

// Characters chosen to avoid optical ambiguity (no 0/O, 1/I, 8/B)
const CAPTCHA_CHARS = '2345679ACDEFGHJKLMNPQRSTUVWXYZ';
const CAPTCHA_LENGTH = 5;
const CAPTCHA_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// In-memory set of used captcha IDs to prevent replay attacks
const usedNonces = new Map<string, number>();

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, exp] of usedNonces.entries()) {
    if (now > exp) {
      usedNonces.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

export interface CaptchaChallenge {
  token: string;
  svg: string;
}

export function generateCaptcha(jwtSecret: string): CaptchaChallenge {
  // 1. Generate random code
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    const idx = crypto.randomInt(0, CAPTCHA_CHARS.length);
    code += CAPTCHA_CHARS[idx];
  }

  // 2. Build HMAC-secured token containing the answer hash and expiration
  const id = crypto.randomUUID();
  const exp = Date.now() + CAPTCHA_EXPIRY_MS;
  const answerHash = crypto
    .createHmac('sha256', jwtSecret)
    .update(code.toUpperCase())
    .digest('hex');

  const payload = JSON.stringify({ id, answerHash, exp });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(payloadB64)
    .digest('base64url');

  const token = `${payloadB64}.${signature}`;

  // 3. Generate visual SVG with distortion, curves, and noise
  const width = 160;
  const height = 40;

  // Visual text characters with randomized position, rotation, and colors
  const textElements: string[] = [];
  const charColors = ['#0f172a', '#1e293b', '#334155', '#1e1b4b', '#022c22', '#3b0764'];

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = 16 + i * 27 + crypto.randomInt(-2, 3);
    const y = 27 + crypto.randomInt(-2, 3);
    const angle = crypto.randomInt(-16, 17);
    const fontSize = crypto.randomInt(20, 24);
    const color = charColors[crypto.randomInt(0, charColors.length)];
    const fontFamily = i % 2 === 0 ? 'Courier New, monospace' : 'Georgia, serif';

    textElements.push(
      `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold" fill="${color}" transform="rotate(${angle} ${x} ${y})">${char}</text>`
    );
  }

  // Generate 3 randomized wavy interference lines
  const lines: string[] = [];
  const lineColors = ['#94a3b8', '#64748b', '#cbd5e1', '#a855f7', '#3b82f6'];
  for (let i = 0; i < 3; i++) {
    const yStart = crypto.randomInt(8, height - 8);
    const cp1x = crypto.randomInt(30, 70);
    const cp1y = crypto.randomInt(4, height - 4);
    const cp2x = crypto.randomInt(90, 130);
    const cp2y = crypto.randomInt(4, height - 4);
    const yEnd = crypto.randomInt(8, height - 8);
    const stroke = lineColors[crypto.randomInt(0, lineColors.length)];
    const strokeWidth = (crypto.randomInt(12, 22) / 10).toFixed(1);

    lines.push(
      `<path d="M 0 ${yStart} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${width} ${yEnd}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" opacity="0.65" />`
    );
  }

  // Generate 20 randomized noise dots
  const dots: string[] = [];
  for (let i = 0; i < 20; i++) {
    const cx = crypto.randomInt(2, width - 2);
    const cy = crypto.randomInt(2, height - 2);
    const r = (crypto.randomInt(8, 20) / 10).toFixed(1);
    const dotColor = lineColors[crypto.randomInt(0, lineColors.length)];
    dots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${dotColor}" opacity="0.4" />`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="width:100%;height:100%;display:block;" class="select-none pointer-events-none">
    <rect width="100%" height="100%" fill="#F8FAFC" rx="4" />
    <rect width="100%" height="100%" fill="none" stroke="#E2E8F0" stroke-width="1" rx="4" />
    ${dots.join('\n    ')}
    ${lines.join('\n    ')}
    ${textElements.join('\n    ')}
  </svg>`.trim();

  return { token, svg };
}

export interface CaptchaVerificationResult {
  valid: boolean;
  error?: string;
}

export function verifyCaptcha(
  token: string | undefined,
  userAnswer: string | undefined,
  jwtSecret: string
): CaptchaVerificationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Captcha token is missing. Please refresh and try again.' };
  }

  if (!userAnswer || typeof userAnswer !== 'string' || !userAnswer.trim()) {
    return { valid: false, error: 'Please enter the security captcha code.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid captcha format.' };
  }

  const [payloadB64, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', jwtSecret)
    .update(payloadB64)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedSigBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expectedSigBuf.length || !crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return { valid: false, error: 'Captcha signature verification failed.' };
    }
  } catch {
    return { valid: false, error: 'Captcha signature verification failed.' };
  }

  // Parse payload
  let payload: { id: string; answerHash: string; exp: number };
  try {
    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: 'Malformed captcha payload.' };
  }

  // Check expiration
  if (Date.now() > payload.exp) {
    return { valid: false, error: 'Captcha has expired. Please refresh the captcha code.' };
  }

  // Replay prevention: check if nonce already consumed
  if (usedNonces.has(payload.id)) {
    return { valid: false, error: 'Captcha has already been used. Please solve a new challenge.' };
  }

  // Mark nonce as consumed
  usedNonces.set(payload.id, payload.exp);

  // Compare answer hash
  const normalizedUserAnswer = userAnswer.trim().toUpperCase();
  const userAnswerHash = crypto
    .createHmac('sha256', jwtSecret)
    .update(normalizedUserAnswer)
    .digest('hex');

  const answerBuf = Buffer.from(userAnswerHash, 'utf8');
  const expectedAnswerBuf = Buffer.from(payload.answerHash, 'utf8');

  if (answerBuf.length !== expectedAnswerBuf.length || !crypto.timingSafeEqual(answerBuf, expectedAnswerBuf)) {
    return { valid: false, error: 'Incorrect captcha code. Please try again.' };
  }

  return { valid: true };
}
