export type FormulaType = 'atom' | 'not' | 'and' | 'or' | 'implies' | 'iff';

export interface AtomFormula {
  type: 'atom';
  name: string; // e.g. "P", "Q", "R"
}

export interface NotFormula {
  type: 'not';
  operand: Formula;
}

export interface BinaryFormula {
  type: 'and' | 'or' | 'implies' | 'iff';
  left: Formula;
  right: Formula;
}

export type Formula = AtomFormula | NotFormula | BinaryFormula;

export type NotationStyle = 'copi' | 'standard' | 'whitehead' | 'ascii';

export type InferenceRuleId = 
  | 'MP'   // Modus Ponens
  | 'MT'   // Modus Tollens
  | 'HS'   // Hypothetical Syllogism
  | 'DS'   // Disjunctive Syllogism
  | 'CD'   // Constructive Dilemma
  | 'ABS'  // Absorption
  | 'SIMP' // Simplification
  | 'CONJ' // Conjunction
  | 'ADD'; // Addition

export type ReplacementRuleId =
  | 'DEM'   // De Morgan's
  | 'COM'   // Commutation
  | 'ASSOC' // Association
  | 'DIST'  // Distribution
  | 'DN'    // Double Negation
  | 'TRANS' // Transposition
  | 'IMPL'  // Material Implication
  | 'EQUIV' // Material Equivalence
  | 'EXP'   // Exportation
  | 'TAUT'; // Tautology

export type RuleId = InferenceRuleId | ReplacementRuleId;

export interface RuleDefinition {
  id: RuleId;
  name: string;
  abbreviation: string;
  category: 'inference' | 'replacement';
  requiredPremiseCount: number; // 1 or 2 for inference, 1 for replacement
  copiSchema: string; // textual representation of the rule schema
  description: string;
  example: {
    inputs: string[];
    result: string;
    explanation: string;
  };
}

export interface ProofStep {
  stepNumber: number;
  formula: Formula;
  rule: RuleId | 'premise';
  citations: number[]; // line numbers used
  isPremise?: boolean;
}

export interface Problem {
  id: string;
  title: string;
  description?: string;
  premises: Formula[];
  conclusion: Formula;
  difficulty: 'easy' | 'medium' | 'hard';
  presetId?: string;
  seed?: string;
  author?: string;
  creator_username?: string;
  isCommunity?: boolean;
}

export interface StepValidationResult {
  valid: boolean;
  error?: string;
  hint?: string;
}

export interface WordleDailyState {
  date: string; // YYYY-MM-DD
  stages: {
    easy: boolean;
    medium: boolean;
    hard: boolean;
  };
  currentStage: 'easy' | 'medium' | 'hard';
  history: Record<string, ProofStep[]>;
  completedToday: boolean;
  score: number;
}

export interface FrenzyState {
  seed: string;
  hearts: number; // starts at 3
  maxHearts: number;
  timeRemaining: number;
  isOver: boolean;
  isWon: boolean;
  errorLog: string[];
}
