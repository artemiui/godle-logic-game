import { Problem } from '../types/logic';
import { parseFormula } from './parser';

export const COPI_PRESET_PROBLEMS: Problem[] = [
  // EASY / NOVICE
  {
    id: 'copi-ex-1',
    title: 'Basic Ponens Chaining',
    description: 'Derive B from the chained premises.',
    difficulty: 'easy',
    premises: [
      parseFormula('A ⊃ B'),
      parseFormula('A'),
    ],
    conclusion: parseFormula('B'),
  },
  {
    id: 'copi-ex-2',
    title: 'Syllogistic Chain',
    description: 'Chain two conditionals to reach the target.',
    difficulty: 'easy',
    premises: [
      parseFormula('A ⊃ B'),
      parseFormula('B ⊃ C'),
      parseFormula('A'),
    ],
    conclusion: parseFormula('C'),
  },
  {
    id: 'copi-ex-3',
    title: 'Modus Tollens Extraction',
    description: 'Employ Tollens to deduce the negation of the antecedent.',
    difficulty: 'easy',
    premises: [
      parseFormula('P ⊃ Q'),
      parseFormula('~Q'),
      parseFormula('P ∨ R'),
    ],
    conclusion: parseFormula('R'),
  },
  {
    id: 'copi-ex-4',
    title: 'Disjunctive Elimination',
    description: 'Use Simplification and Disjunctive Syllogism.',
    difficulty: 'easy',
    premises: [
      parseFormula('P • Q'),
      parseFormula('~P ∨ R'),
    ],
    conclusion: parseFormula('R'),
  },
  {
    id: 'copi-ex-5',
    title: 'Conjunction and Addition',
    description: 'Derive a disjunctive outcome from premises.',
    difficulty: 'easy',
    premises: [
      parseFormula('A'),
      parseFormula('B'),
    ],
    conclusion: parseFormula('(A • B) ∨ C'),
  },

  // MEDIUM / ADEPT
  {
    id: 'copi-med-1',
    title: 'Constructive Dilemma in Action',
    description: 'Deduce the disjunctive consequence from a conjunction of conditionals.',
    difficulty: 'medium',
    premises: [
      parseFormula('(A ⊃ B) • (C ⊃ D)'),
      parseFormula('A ∨ C'),
      parseFormula('B ⊃ E'),
      parseFormula('D ⊃ E'),
    ],
    conclusion: parseFormula('E ∨ E'),
  },
  {
    id: 'copi-med-2',
    title: 'Absorption & Ponens',
    description: 'Use Absorption to compound the consequent before deducing.',
    difficulty: 'medium',
    premises: [
      parseFormula('P ⊃ Q'),
      parseFormula('P'),
      parseFormula('(P • Q) ⊃ R'),
    ],
    conclusion: parseFormula('R'),
  },
  {
    id: 'copi-med-3',
    title: 'Material Implication Bridge',
    description: 'Convert a conditional into a disjunction via Implication to unlock DS.',
    difficulty: 'medium',
    premises: [
      parseFormula('P ⊃ Q'),
      parseFormula('~P ⊃ R'),
      parseFormula('~Q'),
    ],
    conclusion: parseFormula('R'),
  },
  {
    id: 'copi-med-4',
    title: 'Double Negation & Transposition',
    description: 'Transposition of negated consequents.',
    difficulty: 'medium',
    premises: [
      parseFormula('~A ⊃ B'),
      parseFormula('~B'),
      parseFormula('~A ∨ C'),
    ],
    conclusion: parseFormula('C'),
  },

  // HARD / MASTER
  {
    id: 'copi-hard-1',
    title: 'De Morgan Theorem & Distributive Expansion',
    description: 'Break down compound negations with De Morgan and distribute.',
    difficulty: 'hard',
    premises: [
      parseFormula('~(P • Q)'),
      parseFormula('~P ⊃ R'),
      parseFormula('~Q ⊃ R'),
      parseFormula('R ⊃ S'),
    ],
    conclusion: parseFormula('S'),
  },
  {
    id: 'copi-hard-2',
    title: 'Exportation and Multi-Variable Deduction',
    description: 'Export conjunctions into nested implications.',
    difficulty: 'hard',
    premises: [
      parseFormula('(A • B) ⊃ C'),
      parseFormula('A'),
      parseFormula('~C'),
      parseFormula('~B ⊃ D'),
    ],
    conclusion: parseFormula('D'),
  },
  {
    id: 'copi-hard-3',
    title: 'Material Equivalence Resolution',
    description: 'Deconstruct material equivalence into conjunction of conditionals.',
    difficulty: 'hard',
    premises: [
      parseFormula('P ≡ Q'),
      parseFormula('P'),
      parseFormula('Q ⊃ (R ∨ S)'),
      parseFormula('~R'),
    ],
    conclusion: parseFormula('S'),
  },
  {
    id: 'copi-hard-4',
    title: 'Distribution & Association Tour de Force',
    description: 'Rearrange deeply nested expressions to extract the target theorem.',
    difficulty: 'hard',
    premises: [
      parseFormula('A • (B ∨ C)'),
      parseFormula('~(A • B)'),
      parseFormula('(A • C) ⊃ (D • E)'),
    ],
    conclusion: parseFormula('D'),
  }
];

export const COMMUNITY_DEFAULT_PROBLEMS: Problem[] = [
  {
    id: 'comm-starter-1',
    title: 'Hypothetical Contraposition',
    description: 'Chain implications to deduce the contrapositive.',
    difficulty: 'easy',
    premises: [
      parseFormula('P ⊃ Q'),
      parseFormula('Q ⊃ R'),
      parseFormula('~R'),
    ],
    conclusion: parseFormula('~P'),
    author: 'aletheia',
    creator_username: 'aletheia',
    isCommunity: true,
  },
  {
    id: 'comm-starter-2',
    title: 'Disjunctive Constructive Dilemma',
    description: 'Employ constructive dilemma over compound disjuncts.',
    difficulty: 'medium',
    premises: [
      parseFormula('(P ⊃ Q) • (R ⊃ S)'),
      parseFormula('P ∨ R'),
    ],
    conclusion: parseFormula('Q ∨ S'),
    author: 'chrysippus',
    creator_username: 'chrysippus',
    isCommunity: true,
  },
  {
    id: 'comm-starter-3',
    title: 'Double De Morgan Reduction',
    description: 'Deconstruct compound negated conjunction to extract conclusion.',
    difficulty: 'hard',
    premises: [
      parseFormula('~(P • Q)'),
      parseFormula('P'),
      parseFormula('~Q ⊃ R'),
    ],
    conclusion: parseFormula('R'),
    author: 'russell',
    creator_username: 'russell',
    isCommunity: true,
  },
];

export function getDailyProblem(dateStr: string, difficulty: 'easy' | 'medium' | 'hard'): Problem {
  const copiFiltered = COPI_PRESET_PROBLEMS.filter(p => p.difficulty === difficulty);
  const commFiltered = COMMUNITY_DEFAULT_PROBLEMS.filter(p => p.difficulty === difficulty);
  const candidates: Problem[] = [
    ...copiFiltered.map(p => ({ ...p, isCommunity: false })),
    ...commFiltered,
  ];

  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const index = hash % candidates.length;
  const base = candidates[index];
  return {
    ...base,
    id: 'daily-' + dateStr + '-' + difficulty,
    title: base.isCommunity ? base.title : 'Daily gödle: ' + base.title,
  };
}
