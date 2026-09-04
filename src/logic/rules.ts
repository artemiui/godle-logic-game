import { Formula, RuleDefinition, RuleId, InferenceRuleId, ReplacementRuleId } from '../types/logic';
import { formulasEqual, cloneFormula } from './ast';

export const COPI_RULES: RuleDefinition[] = [
  // 9 Rules of Inference
  {
    id: 'MP',
    name: 'Modus Ponens',
    abbreviation: 'M.P.',
    category: 'inference',
    requiredPremiseCount: 2,
    copiSchema: 'p ⊃ q, p ⊢ q',
    description: 'If a conditional statement is true and its antecedent is true, its consequent is true.',
    example: {
      inputs: ['P ⊃ Q', 'P'],
      result: 'Q',
      explanation: 'From (P ⊃ Q) and P, we infer Q.'
    }
  },
  {
    id: 'MT',
    name: 'Modus Tollens',
    abbreviation: 'M.T.',
    category: 'inference',
    requiredPremiseCount: 2,
    copiSchema: 'p ⊃ q, ~q ⊢ ~p',
    description: 'If a conditional statement is true and its consequent is false, its antecedent is false.',
    example: {
      inputs: ['P ⊃ Q', '~Q'],
      result: '~P',
      explanation: 'From (P ⊃ Q) and ~Q, we infer ~P.'
    }
  },
  {
    id: 'HS',
    name: 'Hypothetical Syllogism',
    abbreviation: 'H.S.',
    category: 'inference',
    requiredPremiseCount: 2,
    copiSchema: 'p ⊃ q, q ⊃ r ⊢ p ⊃ r',
    description: 'If p implies q and q implies r, then p implies r (transitivity of implication).',
    example: {
      inputs: ['P ⊃ Q', 'Q ⊃ R'],
      result: 'P ⊃ R',
      explanation: 'Chaining the two implications yields P ⊃ R.'
    }
  },
  {
    id: 'DS',
    name: 'Disjunctive Syllogism',
    abbreviation: 'D.S.',
    category: 'inference',
    requiredPremiseCount: 2,
    copiSchema: 'p ∨ q, ~p ⊢ q  (or  p ∨ q, ~q ⊢ p)',
    description: 'Given a disjunction, if one disjunct is negated, the other disjunct must be true.',
    example: {
      inputs: ['P ∨ Q', '~P'],
      result: 'Q',
      explanation: 'From (P ∨ Q) and ~P, we conclude Q.'
    }
  },
  {
    id: 'CD',
    name: 'Constructive Dilemma',
    abbreviation: 'C.D.',
    category: 'inference',
    requiredPremiseCount: 2,
    copiSchema: '(p ⊃ q) • (r ⊃ s), p ∨ r ⊢ q ∨ s',
    description: 'Given two implications and a disjunction of their antecedents, we can deduce the disjunction of their consequents.',
    example: {
      inputs: ['(P ⊃ Q) • (R ⊃ S)', 'P ∨ R'],
      result: 'Q ∨ S',
      explanation: 'Since either P or R holds, either Q or S must hold.'
    }
  },
  {
    id: 'ABS',
    name: 'Absorption',
    abbreviation: 'Abs.',
    category: 'inference',
    requiredPremiseCount: 1,
    copiSchema: 'p ⊃ q ⊢ p ⊃ (p • q)',
    description: 'If p implies q, then p implies both p and q.',
    example: {
      inputs: ['P ⊃ Q'],
      result: 'P ⊃ (P • Q)',
      explanation: 'Absorbs the antecedent into the consequent conjunction.'
    }
  },
  {
    id: 'SIMP',
    name: 'Simplification',
    abbreviation: 'Simp.',
    category: 'inference',
    requiredPremiseCount: 1,
    copiSchema: 'p • q ⊢ p  (also  p • q ⊢ q)',
    description: 'From a conjunction, either of the conjuncts may be deduced.',
    example: {
      inputs: ['P • Q'],
      result: 'P',
      explanation: 'Simplifying the left or right conjunct from a conjunction.'
    }
  },
  {
    id: 'CONJ',
    name: 'Conjunction',
    abbreviation: 'Conj.',
    category: 'inference',
    requiredPremiseCount: 2,
    copiSchema: 'p, q ⊢ p • q',
    description: 'Any two previously established statements may be conjoined.',
    example: {
      inputs: ['P', 'Q'],
      result: 'P • Q',
      explanation: 'Conjoining statement P and statement Q.'
    }
  },
  {
    id: 'ADD',
    name: 'Addition',
    abbreviation: 'Add.',
    category: 'inference',
    requiredPremiseCount: 1,
    copiSchema: 'p ⊢ p ∨ q  (or  p ⊢ q ∨ p)',
    description: 'To any true statement, any other proposition may be added as a disjunct.',
    example: {
      inputs: ['P'],
      result: 'P ∨ Q',
      explanation: 'Adding proposition Q as a disjunct to P.'
    }
  },

  // 10 Rules of Replacement
  {
    id: 'DEM',
    name: "De Morgan's Theorems",
    abbreviation: 'De M.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '~(p • q) ≡ (~p ∨ ~q)  |  ~(p ∨ q) ≡ (~p • ~q)',
    description: 'The negation of a conjunction is equivalent to the disjunction of the negations, and vice-versa.',
    example: {
      inputs: ['~(P • Q)'],
      result: '~P ∨ ~Q',
      explanation: 'Distributing negation flips conjunction into disjunction.'
    }
  },
  {
    id: 'COM',
    name: 'Commutation',
    abbreviation: 'Com.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '(p ∨ q) ≡ (q ∨ p)  |  (p • q) ≡ (q • p)',
    description: 'The order of disjuncts or conjuncts may be swapped.',
    example: {
      inputs: ['P ∨ Q'],
      result: 'Q ∨ P',
      explanation: 'Swapping the operands of a disjunction or conjunction.'
    }
  },
  {
    id: 'ASSOC',
    name: 'Association',
    abbreviation: 'Assoc.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '[p ∨ (q ∨ r)] ≡ [(p ∨ q) ∨ r]  |  [p • (q • r)] ≡ [(p • q) • r]',
    description: 'Grouping of adjacent disjunctions or adjacent conjunctions may be shifted.',
    example: {
      inputs: ['P ∨ (Q ∨ R)'],
      result: '(P ∨ Q) ∨ R',
      explanation: 'Regrouping the parentheses across identical connectives.'
    }
  },
  {
    id: 'DIST',
    name: 'Distribution',
    abbreviation: 'Dist.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '[p • (q ∨ r)] ≡ [(p • q) ∨ (p • r)]  |  [p ∨ (q • r)] ≡ [(p ∨ q) • (p ∨ r)]',
    description: 'Conjunction distributes over disjunction, and disjunction distributes over conjunction.',
    example: {
      inputs: ['P • (Q ∨ R)'],
      result: '(P • Q) ∨ (P • R)',
      explanation: 'Distributing P • across Q and R.'
    }
  },
  {
    id: 'DN',
    name: 'Double Negation',
    abbreviation: 'D.N.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: 'p ≡ ~~p',
    description: 'Any statement is equivalent to its double negation.',
    example: {
      inputs: ['P'],
      result: '~~P',
      explanation: 'Adding or eliminating a pair of negations.'
    }
  },
  {
    id: 'TRANS',
    name: 'Transposition',
    abbreviation: 'Trans.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '(p ⊃ q) ≡ (~q ⊃ ~p)',
    description: 'Contraposition: a conditional is equivalent to the conditional of its negated parts reversed.',
    example: {
      inputs: ['P ⊃ Q'],
      result: '~Q ⊃ ~P',
      explanation: 'Reversing and negating antecedent and consequent.'
    }
  },
  {
    id: 'IMPL',
    name: 'Material Implication',
    abbreviation: 'Impl.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '(p ⊃ q) ≡ (~p ∨ q)',
    description: 'A conditional is equivalent to the disjunction of the negated antecedent and the consequent.',
    example: {
      inputs: ['P ⊃ Q'],
      result: '~P ∨ Q',
      explanation: 'Expressing conditional as disjunction.'
    }
  },
  {
    id: 'EQUIV',
    name: 'Material Equivalence',
    abbreviation: 'Equiv.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '(p ≡ q) ≡ [(p ⊃ q) • (q ⊃ p)]  |  (p ≡ q) ≡ [(p • q) ∨ (~p • ~q)]',
    description: 'Biconditional equivalence can be written as mutual implications or dual conjunctions.',
    example: {
      inputs: ['P ≡ Q'],
      result: '(P ⊃ Q) • (Q ⊃ P)',
      explanation: 'Decomposing equivalence into mutual implication.'
    }
  },
  {
    id: 'EXP',
    name: 'Exportation',
    abbreviation: 'Exp.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: '[(p • q) ⊃ r] ≡ [p ⊃ (q ⊃ r)]',
    description: 'Currying / exporting: a conjunction in the antecedent can be shifted into nested implications.',
    example: {
      inputs: ['(P • Q) ⊃ R'],
      result: 'P ⊃ (Q ⊃ R)',
      explanation: 'Shifting the second conjunct Q into the consequent.'
    }
  },
  {
    id: 'TAUT',
    name: 'Tautology',
    abbreviation: 'Taut.',
    category: 'replacement',
    requiredPremiseCount: 1,
    copiSchema: 'p ≡ (p ∨ p)  |  p ≡ (p • p)',
    description: 'Redundant conjunctions or disjunctions of identical propositions can be collapsed or introduced.',
    example: {
      inputs: ['P'],
      result: 'P ∨ P',
      explanation: 'Duplicating proposition P as a disjunction.'
    }
  }
];

export const RULE_MAP = new Map<RuleId, RuleDefinition>(
  COPI_RULES.map(r => [r.id, r])
);

// -------------------------------------------------------------
// Direct Replacement Pattern Matching (Both directions <->)
// -------------------------------------------------------------

function isDeMorganDirect(a: Formula, b: Formula): boolean {
  // ~(P • Q) <=> (~P ∨ ~Q)
  if (a.type === 'not' && a.operand.type === 'and' && b.type === 'or') {
    const p = a.operand.left;
    const q = a.operand.right;
    if (b.left.type === 'not' && b.right.type === 'not') {
      if (formulasEqual(b.left.operand, p) && formulasEqual(b.right.operand, q)) return true;
    }
  }
  // Reverse: (~P ∨ ~Q) <=> ~(P • Q)
  if (b.type === 'not' && b.operand.type === 'and' && a.type === 'or') {
    return isDeMorganDirect(b, a);
  }

  // ~(P ∨ Q) <=> (~P • ~Q)
  if (a.type === 'not' && a.operand.type === 'or' && b.type === 'and') {
    const p = a.operand.left;
    const q = a.operand.right;
    if (b.left.type === 'not' && b.right.type === 'not') {
      if (formulasEqual(b.left.operand, p) && formulasEqual(b.right.operand, q)) return true;
    }
  }
  // Reverse: (~P • ~Q) <=> ~(P ∨ Q)
  if (b.type === 'not' && b.operand.type === 'or' && a.type === 'and') {
    return isDeMorganDirect(b, a);
  }

  return false;
}

function isCommutationDirect(a: Formula, b: Formula): boolean {
  if (a.type === 'or' && b.type === 'or') {
    return formulasEqual(a.left, b.right) && formulasEqual(a.right, b.left);
  }
  if (a.type === 'and' && b.type === 'and') {
    return formulasEqual(a.left, b.right) && formulasEqual(a.right, b.left);
  }
  return false;
}

function isAssociationDirect(a: Formula, b: Formula): boolean {
  // [P ∨ (Q ∨ R)] <=> [(P ∨ Q) ∨ R]
  if (a.type === 'or' && b.type === 'or') {
    if (a.right.type === 'or' && b.left.type === 'or') {
      const p = a.left;
      const q = a.right.left;
      const r = a.right.right;
      return (
        formulasEqual(b.left.left, p) &&
        formulasEqual(b.left.right, q) &&
        formulasEqual(b.right, r)
      );
    }
    if (a.left.type === 'or' && b.right.type === 'or') {
      const p = a.left.left;
      const q = a.left.right;
      const r = a.right;
      return (
        formulasEqual(b.left, p) &&
        formulasEqual(b.right.left, q) &&
        formulasEqual(b.right.right, r)
      );
    }
  }

  // [P • (Q • R)] <=> [(P • Q) • R]
  if (a.type === 'and' && b.type === 'and') {
    if (a.right.type === 'and' && b.left.type === 'and') {
      const p = a.left;
      const q = a.right.left;
      const r = a.right.right;
      return (
        formulasEqual(b.left.left, p) &&
        formulasEqual(b.left.right, q) &&
        formulasEqual(b.right, r)
      );
    }
    if (a.left.type === 'and' && b.right.type === 'and') {
      const p = a.left.left;
      const q = a.left.right;
      const r = a.right;
      return (
        formulasEqual(b.left, p) &&
        formulasEqual(b.right.left, q) &&
        formulasEqual(b.right.right, r)
      );
    }
  }

  return false;
}

function isDistributionDirect(a: Formula, b: Formula): boolean {
  // [P • (Q ∨ R)] <=> [(P • Q) ∨ (P • R)]
  if (a.type === 'and' && a.right.type === 'or' && b.type === 'or') {
    const p = a.left;
    const q = a.right.left;
    const r = a.right.right;
    if (b.left.type === 'and' && b.right.type === 'and') {
      if (
        formulasEqual(b.left.left, p) &&
        formulasEqual(b.left.right, q) &&
        formulasEqual(b.right.left, p) &&
        formulasEqual(b.right.right, r)
      ) {
        return true;
      }
    }
  }
  // Reverse: [(P • Q) ∨ (P • R)] <=> [P • (Q ∨ R)]
  if (b.type === 'and' && b.right.type === 'or' && a.type === 'or') {
    return isDistributionDirect(b, a);
  }

  // [P ∨ (Q • R)] <=> [(P ∨ Q) • (P ∨ R)]
  if (a.type === 'or' && a.right.type === 'and' && b.type === 'and') {
    const p = a.left;
    const q = a.right.left;
    const r = a.right.right;
    if (b.left.type === 'or' && b.right.type === 'or') {
      if (
        formulasEqual(b.left.left, p) &&
        formulasEqual(b.left.right, q) &&
        formulasEqual(b.right.left, p) &&
        formulasEqual(b.right.right, r)
      ) {
        return true;
      }
    }
  }
  // Reverse: [(P ∨ Q) • (P ∨ R)] <=> [P ∨ (Q • R)]
  if (b.type === 'or' && b.right.type === 'and' && a.type === 'and') {
    return isDistributionDirect(b, a);
  }

  return false;
}

function isDoubleNegationDirect(a: Formula, b: Formula): boolean {
  // P <=> ~~P
  if (b.type === 'not' && b.operand.type === 'not') {
    if (formulasEqual(a, b.operand.operand)) return true;
  }
  // ~~P <=> P
  if (a.type === 'not' && a.operand.type === 'not') {
    if (formulasEqual(b, a.operand.operand)) return true;
  }
  return false;
}

function isTranspositionDirect(a: Formula, b: Formula): boolean {
  // (P ⊃ Q) <=> (~Q ⊃ ~P)
  if (a.type === 'implies' && b.type === 'implies') {
    if (b.left.type === 'not' && b.right.type === 'not') {
      if (formulasEqual(a.left, b.right.operand) && formulasEqual(a.right, b.left.operand)) {
        return true;
      }
    }
    // (~Q ⊃ ~P) <=> (P ⊃ Q)
    if (a.left.type === 'not' && a.right.type === 'not') {
      if (formulasEqual(b.left, a.right.operand) && formulasEqual(b.right, a.left.operand)) {
        return true;
      }
    }
  }
  return false;
}

function isMaterialImplicationDirect(a: Formula, b: Formula): boolean {
  // (P ⊃ Q) <=> (~P ∨ Q)
  if (a.type === 'implies' && b.type === 'or') {
    if (b.left.type === 'not') {
      if (formulasEqual(a.left, b.left.operand) && formulasEqual(a.right, b.right)) {
        return true;
      }
    }
  }
  // (~P ∨ Q) <=> (P ⊃ Q)
  if (a.type === 'or' && b.type === 'implies') {
    if (a.left.type === 'not') {
      if (formulasEqual(b.left, a.left.operand) && formulasEqual(b.right, a.right)) {
        return true;
      }
    }
  }
  return false;
}

function isMaterialEquivalenceDirect(a: Formula, b: Formula): boolean {
  // Form 1: (P ≡ Q) <=> [(P ⊃ Q) • (Q ⊃ P)]
  if (a.type === 'iff' && b.type === 'and') {
    if (b.left.type === 'implies' && b.right.type === 'implies') {
      const p = a.left;
      const q = a.right;
      if (
        formulasEqual(b.left.left, p) &&
        formulasEqual(b.left.right, q) &&
        formulasEqual(b.right.left, q) &&
        formulasEqual(b.right.right, p)
      ) {
        return true;
      }
    }
  }
  if (b.type === 'iff' && a.type === 'and') {
    return isMaterialEquivalenceDirect(b, a);
  }

  // Form 2: (P ≡ Q) <=> [(P • Q) ∨ (~P • ~Q)]
  if (a.type === 'iff' && b.type === 'or') {
    if (b.left.type === 'and' && b.right.type === 'and') {
      const p = a.left;
      const q = a.right;
      if (
        formulasEqual(b.left.left, p) &&
        formulasEqual(b.left.right, q) &&
        b.right.left.type === 'not' &&
        b.right.right.type === 'not' &&
        formulasEqual(b.right.left.operand, p) &&
        formulasEqual(b.right.right.operand, q)
      ) {
        return true;
      }
    }
  }
  if (b.type === 'iff' && a.type === 'or') {
    return isMaterialEquivalenceDirect(b, a);
  }

  return false;
}

function isExportationDirect(a: Formula, b: Formula): boolean {
  // [(P • Q) ⊃ R] <=> [P ⊃ (Q ⊃ R)]
  if (a.type === 'implies' && a.left.type === 'and' && b.type === 'implies' && b.right.type === 'implies') {
    const p = a.left.left;
    const q = a.left.right;
    const r = a.right;
    return (
      formulasEqual(b.left, p) &&
      formulasEqual(b.right.left, q) &&
      formulasEqual(b.right.right, r)
    );
  }
  if (b.type === 'implies' && b.left.type === 'and' && a.type === 'implies' && a.right.type === 'implies') {
    return isExportationDirect(b, a);
  }
  return false;
}

function isTautologyDirect(a: Formula, b: Formula): boolean {
  // P <=> (P ∨ P)
  if (b.type === 'or' && formulasEqual(b.left, b.right) && formulasEqual(a, b.left)) {
    return true;
  }
  if (a.type === 'or' && formulasEqual(a.left, a.right) && formulasEqual(b, a.left)) {
    return true;
  }
  // P <=> (P • P)
  if (b.type === 'and' && formulasEqual(b.left, b.right) && formulasEqual(a, b.left)) {
    return true;
  }
  if (a.type === 'and' && formulasEqual(a.left, a.right) && formulasEqual(b, a.left)) {
    return true;
  }
  return false;
}

export function isDirectReplacementMatch(a: Formula, b: Formula, ruleId: ReplacementRuleId): boolean {
  switch (ruleId) {
    case 'DEM':
      return isDeMorganDirect(a, b);
    case 'COM':
      return isCommutationDirect(a, b);
    case 'ASSOC':
      return isAssociationDirect(a, b);
    case 'DIST':
      return isDistributionDirect(a, b);
    case 'DN':
      return isDoubleNegationDirect(a, b);
    case 'TRANS':
      return isTranspositionDirect(a, b);
    case 'IMPL':
      return isMaterialImplicationDirect(a, b);
    case 'EQUIV':
      return isMaterialEquivalenceDirect(a, b);
    case 'EXP':
      return isExportationDirect(a, b);
    case 'TAUT':
      return isTautologyDirect(a, b);
    default:
      return false;
  }
}

/**
 * Checks if target can be obtained by applying the replacement rule either at the top-level
 * or recursively inside any subformula of source.
 */
export function canApplyReplacement(source: Formula, target: Formula, ruleId: ReplacementRuleId): boolean {
  // 1. Direct match at this node
  if (isDirectReplacementMatch(source, target, ruleId)) {
    return true;
  }

  // 2. Both are same node type, check if replacement occurred in sub-branch
  if (source.type !== target.type) {
    return false;
  }

  if (source.type === 'not' && target.type === 'not') {
    return canApplyReplacement(source.operand, target.operand, ruleId);
  }

  if (
    (source.type === 'and' && target.type === 'and') ||
    (source.type === 'or' && target.type === 'or') ||
    (source.type === 'implies' && target.type === 'implies') ||
    (source.type === 'iff' && target.type === 'iff')
  ) {
    // Left branch changed, right branch unchanged
    if (formulasEqual(source.right, target.right) && canApplyReplacement(source.left, target.left, ruleId)) {
      return true;
    }
    // Right branch changed, left branch unchanged
    if (formulasEqual(source.left, target.left) && canApplyReplacement(source.right, target.right, ruleId)) {
      return true;
    }
  }

  return false;
}
