import { Formula, Problem } from '../types/logic';
import { formulaToString } from './latex';
import { parseFormula } from './parser';

// Seeded PRNG (Mulberry32)
export function createPRNG(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  return function () {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateProblem(
  seed: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Problem {
  const rand = createPRNG(`${seed}-${difficulty}`);

  const vars = ['P', 'Q', 'R', 'S', 'T', 'W', 'A', 'B', 'C', 'D'];
  const shuffled = [...vars].sort(() => rand() - 0.5);
  const [p, q, r, s, t] = shuffled;

  let premises: Formula[] = [];
  let conclusion: Formula;

  if (difficulty === 'easy') {
    const templates = [
      {
        premises: [
          `(${p} ⊃ ${q})`,
          `(${q} ⊃ ${r})`,
          p
        ],
        conclusion: r,
        title: 'Chained Deduction'
      },
      {
        premises: [
          `(${p} ∨ ${q})`,
          `~${p}`,
          `(${q} ⊃ ${r})`
        ],
        conclusion: r,
        title: 'Disjunctive Transition'
      },
      {
        premises: [
          `(${p} ⊃ ${q})`,
          `~${q}`,
          `(${r} • ${p})`
        ],
        conclusion: `~${p}`,
        title: 'Tollens Extraction'
      },
      {
        premises: [
          `(${p} ⊃ ${q})`,
          p,
          `(${r} ⊃ ${s})`,
          r
        ],
        conclusion: `(${q} • ${s})`,
        title: 'Dual Ponens Synthesis'
      },
      {
        premises: [
          `(${p} • ${q})`,
          `(~${p} ∨ ${r})`
        ],
        conclusion: r,
        title: 'Disjunctive Resolution'
      }
    ];

    const pick = templates[Math.floor(rand() * templates.length)];
    premises = pick.premises.map(str => parseFormula(str));
    conclusion = parseFormula(pick.conclusion);

    return {
      id: `gen-${seed}-easy`,
      title: pick.title,
      difficulty: 'easy',
      premises,
      conclusion,
      seed,
    };
  } else if (difficulty === 'medium') {
    const templates = [
      {
        premises: [
          `((${p} ⊃ ${q}) • (${r} ⊃ ${s}))`,
          `(${p} ∨ ${r})`,
          `(${q} ⊃ ${t})`,
          `(${s} ⊃ ${t})`
        ],
        conclusion: `(${t} ∨ ${t})`,
        title: 'Dilemmic Convergence'
      },
      {
        premises: [
          `(${p} ⊃ ${q})`,
          `~${q}`,
          `(~${p} ⊃ ${r})`
        ],
        conclusion: r,
        title: 'Hypothetical Cascade'
      },
      {
        premises: [
          `~(${p} • ${q})`,
          `(${r} ⊃ ${p})`,
          `(${r} ⊃ ${q})`,
          r
        ],
        conclusion: `(~${p} ∨ ~${q})`,
        title: "De Morgan's Resolution"
      },
      {
        premises: [
          `(${p} • ${q} ⊃ ${r})`,
          p,
          q
        ],
        conclusion: r,
        title: 'Curried Implication'
      },
      {
        premises: [
          `(${p} ⊃ ${q})`,
          `(~${p} ⊃ ${r})`,
          `~${q}`
        ],
        conclusion: r,
        title: 'Transposed Redirection'
      }
    ];

    const pick = templates[Math.floor(rand() * templates.length)];
    premises = pick.premises.map(str => parseFormula(str));
    conclusion = parseFormula(pick.conclusion);

    return {
      id: `gen-${seed}-med`,
      title: pick.title,
      difficulty: 'medium',
      premises,
      conclusion,
      seed,
    };
  } else {
    const templates = [
      {
        premises: [
          `(${p} • (${q} ∨ ${r}))`,
          `~(${p} • ${q})`,
          `(${p} • ${r} ⊃ ${s})`
        ],
        conclusion: s,
        title: "Distributive Syllogism"
      },
      {
        premises: [
          `(${p} ≡ ${q})`,
          `(${p} ∨ ${r})`,
          `(${r} ⊃ ${q})`
        ],
        conclusion: q,
        title: "Equivalence Derivation"
      },
      {
        premises: [
          `(${p} • ${q} ⊃ ${r})`,
          `~${r}`,
          p,
          `(~${q} ⊃ ${s})`
        ],
        conclusion: s,
        title: "Exported Contrapositive"
      },
      {
        premises: [
          `(${p} ⊃ (${q} ⊃ ${r}))`,
          `(${p} • ${q})`,
          `(${r} ⊃ ~${s})`,
          s
        ],
        conclusion: `~${r}`,
        title: "Cascading Contradiction"
      },
      {
        premises: [
          `~(~${p} • ~${r})`,
          `(${p} ⊃ ${q}) • (${r} ⊃ ${s})`,
          `(${q} ∨ ${s} ⊃ ${t})`
        ],
        conclusion: t,
        title: "Dual Dilemma Theorem"
      }
    ];

    const pick = templates[Math.floor(rand() * templates.length)];
    premises = pick.premises.map(str => parseFormula(str));
    conclusion = parseFormula(pick.conclusion);

    return {
      id: `gen-${seed}-hard`,
      title: pick.title,
      difficulty: 'hard',
      premises,
      conclusion,
      seed,
    };
  }
}

export function formatProblemShareString(problem: Problem): string {
  const premisesStr = problem.premises
    .map((p, idx) => `${idx + 1}. ${formulaToString(p, 'standard')}`)
    .join('\n');
  const conclusionStr = ` /∴ ${formulaToString(problem.conclusion, 'standard')}`;
  return `${problem.title} [${problem.difficulty.toUpperCase()}]\n${premisesStr}\n${conclusionStr}`;
}

export function encodeProblemToShareCode(problem: Problem): string {
  const payload = {
    title: problem.title,
    premises: problem.premises.map(p => formulaToString(p, 'standard')),
    conclusion: formulaToString(problem.conclusion, 'standard'),
    difficulty: problem.difficulty,
  };
  try {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch {
    return problem.seed || 'frenzy';
  }
}

export function decodeProblemFromShareCode(code: string): Problem | null {
  try {
    const jsonStr = Buffer.from(code, 'base64').toString('utf8');
    const data = JSON.parse(jsonStr);
    return {
      id: `shared-${Date.now()}`,
      title: data.title || 'Shared Logic Puzzle',
      premises: data.premises.map((s: string) => parseFormula(s)),
      conclusion: parseFormula(data.conclusion),
      difficulty: data.difficulty || 'medium',
      seed: code,
    };
  } catch {
    return null;
  }
}
