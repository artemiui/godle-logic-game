import type { Formula, RuleDefinition } from '../types/logic';
import { parseFormula } from './parser';
import { formulaToString } from './latex';
import { getAtomicVariables } from './ast';

/* ------------------------------------------------------------------ */
/*  Truth tables                                                       */
/* ------------------------------------------------------------------ */

function evaluate(f: Formula, v: Record<string, boolean>): boolean {
  switch (f.type) {
    case 'atom': return v[f.name];
    case 'not': return !evaluate(f.operand, v);
    case 'and': return evaluate(f.left, v) && evaluate(f.right, v);
    case 'or': return evaluate(f.left, v) || evaluate(f.right, v);
    case 'implies': return !evaluate(f.left, v) || evaluate(f.right, v);
    case 'iff': return evaluate(f.left, v) === evaluate(f.right, v);
  }
}

/** True when every row that makes all premises true also makes `f` true. */
export function entails(premises: Formula[], f: Formula): boolean {
  const atoms = new Set<string>();
  for (const p of [...premises, f]) getAtomicVariables(p).forEach(a => atoms.add(a));
  const names = [...atoms];
  for (let mask = 0; mask < 1 << names.length; mask++) {
    const v: Record<string, boolean> = {};
    names.forEach((n, i) => (v[n] = Boolean(mask & (1 << i))));
    if (premises.every(p => evaluate(p, v)) && !evaluate(f, v)) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/*  Building formulas                                                  */
/* ------------------------------------------------------------------ */

const atom = (name: string): Formula => ({ type: 'atom', name });
const not = (operand: Formula): Formula => ({ type: 'not', operand });
const bin = (type: 'and' | 'or' | 'implies' | 'iff', left: Formula, right: Formula): Formula =>
  ({ type, left, right } as Formula);

/** Replace atoms by formulas, e.g. P → (A ∨ B). */
export function substitute(f: Formula, map: Record<string, Formula>): Formula {
  switch (f.type) {
    case 'atom': return map[f.name] ?? f;
    case 'not': return not(substitute(f.operand, map));
    default: return bin(f.type, substitute(f.left, map), substitute(f.right, map));
  }
}

/* ------------------------------------------------------------------ */
/*  Lessons                                                            */
/* ------------------------------------------------------------------ */

export interface Lesson {
  rule: RuleDefinition;
  premises: Formula[];
  result: Formula;
  /** Four choices, exactly one entailed by the premises */
  choices: { formula: Formula; correct: boolean }[];
  /** The same pattern with compound parts swapped in */
  practice: { premises: Formula[]; answer: Formula };
}

function key(f: Formula) {
  return formulaToString(f, 'standard');
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function candidates(result: Formula, premises: Formula[]): Formula[] {
  const out: Formula[] = [];
  const ops = ['and', 'or', 'implies', 'iff'] as const;

  // Near misses of the right answer come first, they are the tempting ones
  out.push(result.type === 'not' ? result.operand : not(result));
  if (result.type !== 'atom' && result.type !== 'not') {
    out.push(bin(result.type, result.right, result.left));
    for (const o of ops) if (o !== result.type) out.push(bin(o, result.left, result.right));
    out.push(bin(result.type, not(result.left), result.right));
    out.push(bin(result.type, result.left, not(result.right)));
  }
  // Then pieces of the premises, rearranged
  for (const p of premises) {
    if (p.type !== 'atom' && p.type !== 'not') {
      out.push(bin(p.type, p.right, p.left), not(p.left), not(p.right), p.left, p.right);
    }
    if (p.type === 'not') out.push(p.operand);
  }
  // Finally plain combinations of the letters involved
  const names = [...new Set(premises.flatMap(p => [...getAtomicVariables(p)]))];
  // One-letter rules (DN, Taut) need a second letter to build believable wrong answers
  if (names.length < 2) names.push(['Q', 'R', 'S'].find(n => !names.includes(n))!);
  for (const a of names) {
    out.push(atom(a), not(atom(a)));
    for (const b of names) if (a !== b) {
      out.push(bin('and', atom(a), not(atom(b))), bin('or', not(atom(a)), not(atom(b))), bin('implies', atom(a), not(atom(b))));
    }
  }
  return out;
}

const PRACTICE_MAP: Record<string, string> = { P: 'A ∨ B', Q: 'C', R: '~D', S: 'E' };

export function buildLesson(rule: RuleDefinition): Lesson {
  const premises = rule.example.inputs.map(s => parseFormula(s));
  const result = parseFormula(rule.example.result);

  const seen = new Set([key(result)]);
  const wrong: Formula[] = [];
  for (const c of candidates(result, premises)) {
    const k = key(c);
    if (seen.has(k)) continue;
    seen.add(k);
    if (!entails(premises, c)) wrong.push(c);
    if (wrong.length === 3) break;
  }

  const choices = [{ formula: result, correct: true }, ...wrong.map(formula => ({ formula, correct: false }))];
  // Stable shuffle per rule so the answer is not always in the same place
  const seed = hash(rule.id);
  choices.sort((a, b) => (hash(key(a.formula) + seed) % 997) - (hash(key(b.formula) + seed) % 997));

  const map = Object.fromEntries(Object.entries(PRACTICE_MAP).map(([k, v]) => [k, parseFormula(v)]));
  return {
    rule,
    premises,
    result,
    choices,
    practice: {
      premises: premises.map(p => substitute(p, map)),
      answer: substitute(result, map),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Progress, per device                                               */
/* ------------------------------------------------------------------ */

const STORE = 'goodle_rules_progress';

export function loadProgress(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function saveProgress(ids: string[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(ids));
  } catch {}
}
