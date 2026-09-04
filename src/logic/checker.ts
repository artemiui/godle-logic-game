import { Formula, ProofStep, StepValidationResult, RuleId } from '../types/logic';
import { formulasEqual } from './ast';
import { RULE_MAP, canApplyReplacement } from './rules';

export function validateProofStep(
  existingSteps: ProofStep[],
  newFormula: Formula,
  ruleId: RuleId,
  citations: number[]
): StepValidationResult {
  const rule = RULE_MAP.get(ruleId);
  if (!rule) {
    return { valid: false, error: `Unknown rule '${ruleId}'.` };
  }

  // 1. Validate citation count
  if (citations.length !== rule.requiredPremiseCount) {
    return {
      valid: false,
      error: `${rule.name} (${rule.abbreviation}) requires exactly ${rule.requiredPremiseCount} cited line(s), but ${citations.length} were provided.`
    };
  }

  // 2. Validate citations exist
  const citedSteps: ProofStep[] = [];
  for (const c of citations) {
    const step = existingSteps.find(s => s.stepNumber === c);
    if (!step) {
      return { valid: false, error: `Cited line #${c} does not exist in the current proof.` };
    }
    citedSteps.push(step);
  }

  // 3. Handle Replacement Rules (1 citation)
  if (rule.category === 'replacement') {
    const sourceFormula = citedSteps[0].formula;
    const canReplace = canApplyReplacement(sourceFormula, newFormula, ruleId as any);
    if (!canReplace) {
      return {
        valid: false,
        error: `Invalid application of ${rule.name} (${rule.abbreviation}). Formula cannot be derived from line #${citations[0]} using this rule.`
      };
    }
    return { valid: true };
  }

  // 4. Handle 9 Rules of Inference
  const f1 = citedSteps[0].formula;
  const f2 = citedSteps.length > 1 ? citedSteps[1].formula : null;

  switch (ruleId) {
    case 'MP': { // Modus Ponens: p ⊃ q, p ⊢ q
      if (!f2) return { valid: false, error: 'Modus Ponens requires 2 citations.' };

      // Try (f1 = p ⊃ q, f2 = p)
      if (f1.type === 'implies' && formulasEqual(f1.left, f2)) {
        if (formulasEqual(f1.right, newFormula)) return { valid: true };
        return {
          valid: false,
          error: `Modus Ponens on lines ${citations[0]} and ${citations[1]} yields the consequent of the conditional, not the entered formula.`
        };
      }
      // Try (f2 = p ⊃ q, f1 = p)
      if (f2.type === 'implies' && formulasEqual(f2.left, f1)) {
        if (formulasEqual(f2.right, newFormula)) return { valid: true };
        return {
          valid: false,
          error: `Modus Ponens on lines ${citations[0]} and ${citations[1]} yields the consequent of the conditional, not the entered formula.`
        };
      }

      return {
        valid: false,
        error: `Modus Ponens requires a conditional (P ⊃ Q) and its antecedent (P). Neither cited line matches this structure.`
      };
    }

    case 'MT': { // Modus Tollens: p ⊃ q, ~q ⊢ ~p
      if (!f2) return { valid: false, error: 'Modus Tollens requires 2 citations.' };

      function checkMT(cond: Formula, negCons: Formula): StepValidationResult {
        if (cond.type !== 'implies') return { valid: false, error: 'First premise must be a conditional (P ⊃ Q).' };
        let matchesNeg = false;
        if (negCons.type === 'not' && formulasEqual(negCons.operand, cond.right)) {
          matchesNeg = true;
        }
        if (!matchesNeg) {
          return { valid: false, error: 'Modus Tollens second premise must be the negation of the consequent.' };
        }
        if (newFormula.type === 'not' && formulasEqual(newFormula.operand, cond.left)) {
          return { valid: true };
        }
        return { valid: false, error: 'Modus Tollens yields the negation of the antecedent (~P).' };
      }

      const res1 = checkMT(f1, f2);
      if (res1.valid) return { valid: true };
      const res2 = checkMT(f2, f1);
      if (res2.valid) return { valid: true };

      return {
        valid: false,
        error: `Modus Tollens requires a conditional (P ⊃ Q) and the negation of its consequent (~Q) to infer ~P.`
      };
    }

    case 'HS': { // Hypothetical Syllogism: p ⊃ q, q ⊃ r ⊢ p ⊃ r
      if (!f2) return { valid: false, error: 'Hypothetical Syllogism requires 2 citations.' };

      function checkHS(c1: Formula, c2: Formula): StepValidationResult {
        if (c1.type === 'implies' && c2.type === 'implies') {
          if (formulasEqual(c1.right, c2.left)) {
            if (newFormula.type === 'implies' && formulasEqual(newFormula.left, c1.left) && formulasEqual(newFormula.right, c2.right)) {
              return { valid: true };
            }
          }
        }
        return { valid: false, error: '' };
      }

      if (checkHS(f1, f2).valid) return { valid: true };
      if (checkHS(f2, f1).valid) return { valid: true };

      return {
        valid: false,
        error: `Hypothetical Syllogism requires two conditionals where the consequent of one is the antecedent of the other (P ⊃ Q and Q ⊃ R).`
      };
    }

    case 'DS': { // Disjunctive Syllogism: p ∨ q, ~p ⊢ q  (or ~q ⊢ p)
      if (!f2) return { valid: false, error: 'Disjunctive Syllogism requires 2 citations.' };

      function checkDS(disj: Formula, neg: Formula): StepValidationResult {
        if (disj.type !== 'or') return { valid: false, error: 'Requires a disjunction (P ∨ Q).' };
        if (neg.type === 'not' && formulasEqual(neg.operand, disj.left)) {
          if (formulasEqual(newFormula, disj.right)) return { valid: true };
          return { valid: false, error: 'Negating the left disjunct yields the right disjunct.' };
        }
        if (neg.type === 'not' && formulasEqual(neg.operand, disj.right)) {
          if (formulasEqual(newFormula, disj.left)) return { valid: true };
          return { valid: false, error: 'Negating the right disjunct yields the left disjunct.' };
        }
        return { valid: false, error: 'Second cited line must negate one of the disjuncts.' };
      }

      if (checkDS(f1, f2).valid) return { valid: true };
      if (checkDS(f2, f1).valid) return { valid: true };

      return {
        valid: false,
        error: `Disjunctive Syllogism requires a disjunction (P ∨ Q) and the negation of one of its disjuncts (~P or ~Q).`
      };
    }

    case 'CD': { // Constructive Dilemma: (p ⊃ q) • (r ⊃ s), p ∨ r ⊢ q ∨ s
      if (!f2) return { valid: false, error: 'Constructive Dilemma requires 2 citations.' };

      function checkCD(conj: Formula, disj: Formula): StepValidationResult {
        if (conj.type !== 'and' || disj.type !== 'or') return { valid: false, error: '' };
        const leftImp = conj.left;
        const rightImp = conj.right;
        if (leftImp.type !== 'implies' || rightImp.type !== 'implies') return { valid: false, error: '' };

        const p = leftImp.left;
        const q = leftImp.right;
        const r = rightImp.left;
        const s = rightImp.right;

        if (formulasEqual(disj.left, p) && formulasEqual(disj.right, r)) {
          if (newFormula.type === 'or' && formulasEqual(newFormula.left, q) && formulasEqual(newFormula.right, s)) {
            return { valid: true };
          }
        }
        return { valid: false, error: '' };
      }

      if (checkCD(f1, f2).valid) return { valid: true };
      if (checkCD(f2, f1).valid) return { valid: true };

      return {
        valid: false,
        error: `Constructive Dilemma requires a conjunction of conditionals ((P ⊃ Q) • (R ⊃ S)) and the disjunction of their antecedents (P ∨ R).`
      };
    }

    case 'ABS': { // Absorption: p ⊃ q ⊢ p ⊃ (p • q)
      if (f1.type !== 'implies') {
        return { valid: false, error: 'Absorption requires a conditional statement (P ⊃ Q).' };
      }
      const p = f1.left;
      const q = f1.right;
      if (
        newFormula.type === 'implies' &&
        formulasEqual(newFormula.left, p) &&
        newFormula.right.type === 'and' &&
        formulasEqual(newFormula.right.left, p) &&
        formulasEqual(newFormula.right.right, q)
      ) {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Absorption on P ⊃ Q yields P ⊃ (P • Q).'
      };
    }

    case 'SIMP': { // Simplification: p • q ⊢ p  (or q)
      if (f1.type !== 'and') {
        return { valid: false, error: 'Simplification requires a conjunction (P • Q).' };
      }
      if (formulasEqual(newFormula, f1.left) || formulasEqual(newFormula, f1.right)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Simplification yields either the left conjunct or the right conjunct of the cited line.'
      };
    }

    case 'CONJ': { // Conjunction: p, q ⊢ p • q  (or q • p)
      if (!f2) return { valid: false, error: 'Conjunction requires 2 citations.' };
      if (newFormula.type !== 'and') {
        return { valid: false, error: 'Conjunction must produce a compound conjunction (•).' };
      }
      if (
        (formulasEqual(newFormula.left, f1) && formulasEqual(newFormula.right, f2)) ||
        (formulasEqual(newFormula.left, f2) && formulasEqual(newFormula.right, f1))
      ) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `Conjunction of lines ${citations[0]} and ${citations[1]} must combine both formulas with •.`
      };
    }

    case 'ADD': { // Addition: p ⊢ p ∨ q  (or q ∨ p)
      if (newFormula.type !== 'or') {
        return { valid: false, error: 'Addition must produce a disjunction (∨).' };
      }
      if (formulasEqual(newFormula.left, f1) || formulasEqual(newFormula.right, f1)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `Addition on line ${citations[0]} must include that formula as one of the disjuncts.`
      };
    }

    default:
      return { valid: false, error: `Unhandled rule ${ruleId}` };
  }
}
