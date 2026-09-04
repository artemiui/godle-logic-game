import { Formula, ProofStep, RuleId } from '../types/logic';
import { formulasEqual } from './ast';
import { COPI_RULES } from './rules';

export interface ProofSearchResult {
  solvable: boolean;
  steps: ProofStep[];
  minSteps: number;
}

export function solveProblem(
  premises: Formula[],
  conclusion: Formula,
  maxSteps: number = 7
): ProofSearchResult {
  for (let i = 0; i < premises.length; i++) {
    if (formulasEqual(premises[i], conclusion)) {
      return {
        solvable: true,
        steps: premises.map((f, idx) => ({
          stepNumber: idx + 1,
          formula: f,
          rule: 'premise' as const,
          citations: [],
          isPremise: true,
        })),
        minSteps: 0,
      };
    }
  }

  const initialSteps: ProofStep[] = premises.map((f, idx) => ({
    stepNumber: idx + 1,
    formula: f,
    rule: 'premise' as const,
    citations: [],
    isPremise: true,
  }));

  function getSinglePremiseDeductions(step: ProofStep): { formula: Formula; rule: RuleId }[] {
    const res: { formula: Formula; rule: RuleId }[] = [];
    const f = step.formula;

    // SIMP
    if (f.type === 'and') {
      res.push({ formula: f.left, rule: 'SIMP' });
      res.push({ formula: f.right, rule: 'SIMP' });
    }

    // ABS
    if (f.type === 'implies') {
      res.push({
        formula: {
          type: 'implies',
          left: f.left,
          right: { type: 'and', left: f.left, right: f.right }
        },
        rule: 'ABS'
      });
    }

    // DN
    if (f.type === 'not' && f.operand.type === 'not') {
      res.push({ formula: f.operand.operand, rule: 'DN' });
    } else {
      res.push({ formula: { type: 'not', operand: { type: 'not', operand: f } }, rule: 'DN' });
    }

    // COM
    if (f.type === 'or') {
      res.push({ formula: { type: 'or', left: f.right, right: f.left }, rule: 'COM' });
    }
    if (f.type === 'and') {
      res.push({ formula: { type: 'and', left: f.right, right: f.left }, rule: 'COM' });
    }

    // IMPL
    if (f.type === 'implies') {
      res.push({
        formula: { type: 'or', left: { type: 'not', operand: f.left }, right: f.right },
        rule: 'IMPL'
      });
    } else if (f.type === 'or' && f.left.type === 'not') {
      res.push({
        formula: { type: 'implies', left: f.left.operand, right: f.right },
        rule: 'IMPL'
      });
    }

    // DEM
    if (f.type === 'not') {
      if (f.operand.type === 'and') {
        res.push({
          formula: {
            type: 'or',
            left: { type: 'not', operand: f.operand.left },
            right: { type: 'not', operand: f.operand.right }
          },
          rule: 'DEM'
        });
      } else if (f.operand.type === 'or') {
        res.push({
          formula: {
            type: 'and',
            left: { type: 'not', operand: f.operand.left },
            right: { type: 'not', operand: f.operand.right }
          },
          rule: 'DEM'
        });
      }
    }

    // TRANS
    if (f.type === 'implies') {
      res.push({
        formula: {
          type: 'implies',
          left: { type: 'not', operand: f.right },
          right: { type: 'not', operand: f.left }
        },
        rule: 'TRANS'
      });
    }

    return res;
  }

  function getTwoPremiseDeductions(s1: ProofStep, s2: ProofStep): { formula: Formula; rule: RuleId }[] {
    const res: { formula: Formula; rule: RuleId }[] = [];
    const f1 = s1.formula;
    const f2 = s2.formula;

    // MP
    if (f1.type === 'implies' && formulasEqual(f1.left, f2)) {
      res.push({ formula: f1.right, rule: 'MP' });
    }
    if (f2.type === 'implies' && formulasEqual(f2.left, f1)) {
      res.push({ formula: f2.right, rule: 'MP' });
    }

    // MT
    if (f1.type === 'implies' && f2.type === 'not' && formulasEqual(f1.right, f2.operand)) {
      res.push({ formula: { type: 'not', operand: f1.left }, rule: 'MT' });
    }
    if (f2.type === 'implies' && f1.type === 'not' && formulasEqual(f2.right, f1.operand)) {
      res.push({ formula: { type: 'not', operand: f2.left }, rule: 'MT' });
    }

    // HS
    if (f1.type === 'implies' && f2.type === 'implies') {
      if (formulasEqual(f1.right, f2.left)) {
        res.push({ formula: { type: 'implies', left: f1.left, right: f2.right }, rule: 'HS' });
      }
      if (formulasEqual(f2.right, f1.left)) {
        res.push({ formula: { type: 'implies', left: f2.left, right: f1.right }, rule: 'HS' });
      }
    }

    // DS
    if (f1.type === 'or' && f2.type === 'not') {
      if (formulasEqual(f1.left, f2.operand)) res.push({ formula: f1.right, rule: 'DS' });
      if (formulasEqual(f1.right, f2.operand)) res.push({ formula: f1.left, rule: 'DS' });
    }
    if (f2.type === 'or' && f1.type === 'not') {
      if (formulasEqual(f2.left, f1.operand)) res.push({ formula: f2.right, rule: 'DS' });
      if (formulasEqual(f2.right, f1.operand)) res.push({ formula: f2.left, rule: 'DS' });
    }

    // CD
    if (f1.type === 'and' && f1.left.type === 'implies' && f1.right.type === 'implies' && f2.type === 'or') {
      if (formulasEqual(f1.left.left, f2.left) && formulasEqual(f1.right.left, f2.right)) {
        res.push({ formula: { type: 'or', left: f1.left.right, right: f1.right.right }, rule: 'CD' });
      }
    }

    return res;
  }

  const queue: ProofStep[][] = [[...initialSteps]];
  const visitedFormulas = new Set<string>();

  for (const step of initialSteps) {
    visitedFormulas.add(JSON.stringify(step.formula));
  }

  let iterations = 0;
  const MAX_ITERATIONS = 400;

  while (queue.length > 0 && iterations++ < MAX_ITERATIONS) {
    const currentSteps = queue.shift()!;
    const lastStep = currentSteps[currentSteps.length - 1];

    if (formulasEqual(lastStep.formula, conclusion)) {
      return {
        solvable: true,
        steps: currentSteps,
        minSteps: currentSteps.length - initialSteps.length,
      };
    }

    if (currentSteps.length - initialSteps.length >= maxSteps) {
      continue;
    }

    for (const step of currentSteps) {
      const candidates = getSinglePremiseDeductions(step);
      for (const cand of candidates) {
        const key = JSON.stringify(cand.formula);
        if (!visitedFormulas.has(key)) {
          visitedFormulas.add(key);
          const nextStep: ProofStep = {
            stepNumber: currentSteps.length + 1,
            formula: cand.formula,
            rule: cand.rule,
            citations: [step.stepNumber],
          };
          const nextProof = [...currentSteps, nextStep];
          if (formulasEqual(cand.formula, conclusion)) {
            return {
              solvable: true,
              steps: nextProof,
              minSteps: nextProof.length - initialSteps.length,
            };
          }
          queue.push(nextProof);
        }
      }
    }

    for (let i = 0; i < currentSteps.length; i++) {
      for (let j = i + 1; j < currentSteps.length; j++) {
        const s1 = currentSteps[i];
        const s2 = currentSteps[j];
        const candidates = getTwoPremiseDeductions(s1, s2);
        for (const cand of candidates) {
          const key = JSON.stringify(cand.formula);
          if (!visitedFormulas.has(key)) {
            visitedFormulas.add(key);
            const nextStep: ProofStep = {
              stepNumber: currentSteps.length + 1,
              formula: cand.formula,
              rule: cand.rule,
              citations: [s1.stepNumber, s2.stepNumber],
            };
            const nextProof = [...currentSteps, nextStep];
            if (formulasEqual(cand.formula, conclusion)) {
              return {
                solvable: true,
                steps: nextProof,
                minSteps: nextProof.length - initialSteps.length,
              };
            }
            queue.push(nextProof);
          }
        }
      }
    }
  }

  return { solvable: false, steps: [], minSteps: -1 };
}

export function getProofHint(steps: ProofStep[], conclusion: Formula): string {
  for (const s of steps) {
    if (formulasEqual(s.formula, conclusion)) {
      return "You have already derived the conclusion! Great job.";
    }
  }

  const premises = steps.map(s => s.formula);
  const solution = solveProblem(premises, conclusion, 6);

  if (solution.solvable && solution.steps.length > steps.length) {
    const nextStep = solution.steps[steps.length];
    const ruleObj = COPI_RULES.find(r => r.id === nextStep.rule);
    const ruleName = ruleObj ? ruleObj.name : nextStep.rule;
    const lines = nextStep.citations.join(' and ');
    return `Hint: Look at line(s) ${lines}. Can you apply ${ruleName} (${nextStep.rule})?`;
  }

  return "Hint: Examine your conditional (⊃) or disjunctive (∨) statements. Can you find antecedent or negated disjuncts in other lines?";
}
