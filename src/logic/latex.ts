import { Formula, NotationStyle } from '../types/logic';

export interface NotationSymbols {
  name: string;
  description: string;
  not: string;
  and: string;
  or: string;
  implies: string;
  iff: string;
  latexNot: string;
  latexAnd: string;
  latexOr: string;
  latexImplies: string;
  latexIff: string;
}

export const NOTATION_CONFIGS: Record<NotationStyle, NotationSymbols> = {
  standard: {
    name: "Modern Math / Standard",
    description: "Contemporary logic: ¬, ∧, ∨, →, ↔",
    not: "¬",
    and: " ∧ ",
    or: " ∨ ",
    implies: " → ",
    iff: " ↔ ",
    latexNot: "\\neg ",
    latexAnd: " \\land ",
    latexOr: " \\lor ",
    latexImplies: " \\rightarrow ",
    latexIff: " \\leftrightarrow ",
  },
  whitehead: {
    name: "Whitehead & Russell",
    description: "Principia Mathematica: tilde ~, dot ·, horseshoe ⊃, triple bar ≡",
    not: "~",
    and: " · ",
    or: " ∨ ",
    implies: " ⊃ ",
    iff: " ≡ ",
    latexNot: "\\sim ",
    latexAnd: " \\cdot ",
    latexOr: " \\lor ",
    latexImplies: " \\supset ",
    latexIff: " \\equiv ",
  },
};

function isBinaryFormula(f: Formula): boolean {
  return f.type === 'and' || f.type === 'or' || f.type === 'implies' || f.type === 'iff';
}

/**
 * Calculates the depth of nested enclosed subformulas within f.
 * If f contains no enclosed subformulas, depth is 0 -> rendered with '()'
 * If f contains enclosed subformulas of depth 0, depth is 1 -> rendered with '[]'
 * If f contains enclosed subformulas of depth 1, depth is 2 -> rendered with '{}'
 */
export function getEnclosureDepth(f: Formula): number {
  if (f.type === 'atom') return 0;
  if (f.type === 'not') {
    if (isBinaryFormula(f.operand)) {
      return getEnclosureDepth(f.operand) + 1;
    }
    return getEnclosureDepth(f.operand);
  }
  let maxChild = 0;
  if (isBinaryFormula(f.left)) {
    maxChild = Math.max(maxChild, getEnclosureDepth(f.left) + 1);
  } else if (f.left.type === 'not') {
    maxChild = Math.max(maxChild, getEnclosureDepth(f.left));
  }
  if (isBinaryFormula(f.right)) {
    maxChild = Math.max(maxChild, getEnclosureDepth(f.right) + 1);
  } else if (f.right.type === 'not') {
    maxChild = Math.max(maxChild, getEnclosureDepth(f.right));
  }
  return maxChild;
}

const LATEX_DELIMITERS: [string, string][] = [
  ['(', ')'],
  ['[', ']'],
  ['\\{', '\\}'],
];

const STRING_DELIMITERS: [string, string][] = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
];

function getLaTeXDelimiters(depth: number): [string, string] {
  return LATEX_DELIMITERS[depth % LATEX_DELIMITERS.length];
}

function getStringDelimiters(depth: number): [string, string] {
  return STRING_DELIMITERS[depth % STRING_DELIMITERS.length];
}

export function formulaToLaTeX(f: Formula, style: NotationStyle = 'standard'): string {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.standard;

  function render(node: Formula): string {
    if (node.type === 'atom') {
      return node.name;
    }

    if (node.type === 'not') {
      if (isBinaryFormula(node.operand)) {
        const d = getEnclosureDepth(node.operand);
        const [open, close] = getLaTeXDelimiters(d);
        return `${sym.latexNot}${open}${render(node.operand)}${close}`;
      }
      return `${sym.latexNot}${render(node.operand)}`;
    }

    let op = '';
    switch (node.type) {
      case 'and':
        op = sym.latexAnd;
        break;
      case 'or':
        op = sym.latexOr;
        break;
      case 'implies':
        op = sym.latexImplies;
        break;
      case 'iff':
        op = sym.latexIff;
        break;
    }

    let leftStr = '';
    if (isBinaryFormula(node.left)) {
      const d = getEnclosureDepth(node.left);
      const [open, close] = getLaTeXDelimiters(d);
      leftStr = `${open}${render(node.left)}${close}`;
    } else {
      leftStr = render(node.left);
    }

    let rightStr = '';
    if (isBinaryFormula(node.right)) {
      const d = getEnclosureDepth(node.right);
      const [open, close] = getLaTeXDelimiters(d);
      rightStr = `${open}${render(node.right)}${close}`;
    } else {
      rightStr = render(node.right);
    }

    return `${leftStr}${op}${rightStr}`;
  }

  return render(f);
}

export function formulaToString(f: Formula, style: NotationStyle = 'standard'): string {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.standard;

  function render(node: Formula): string {
    if (node.type === 'atom') {
      return node.name;
    }

    if (node.type === 'not') {
      if (isBinaryFormula(node.operand)) {
        const d = getEnclosureDepth(node.operand);
        const [open, close] = getStringDelimiters(d);
        return `${sym.not}${open}${render(node.operand)}${close}`;
      }
      return `${sym.not}${render(node.operand)}`;
    }

    let op = '';
    switch (node.type) {
      case 'and':
        op = sym.and;
        break;
      case 'or':
        op = sym.or;
        break;
      case 'implies':
        op = sym.implies;
        break;
      case 'iff':
        op = sym.iff;
        break;
    }

    let leftStr = '';
    if (isBinaryFormula(node.left)) {
      const d = getEnclosureDepth(node.left);
      const [open, close] = getStringDelimiters(d);
      leftStr = `${open}${render(node.left)}${close}`;
    } else {
      leftStr = render(node.left);
    }

    let rightStr = '';
    if (isBinaryFormula(node.right)) {
      const d = getEnclosureDepth(node.right);
      const [open, close] = getStringDelimiters(d);
      rightStr = `${open}${render(node.right)}${close}`;
    } else {
      rightStr = render(node.right);
    }

    return `${leftStr}${op}${rightStr}`;
  }

  return render(f);
}

export interface ReplacementResult {
  text: string;
  cursor: number;
  changed: boolean;
}

/**
 * Detects keywords like 'AND', 'OR', 'NOT', 'IMPLIES', 'THEN', 'IFF', 'EQUIV'
 * as well as shorthand like '->', '=>', '<->', '<=>', '&&', '||'
 * and converts them in real time to the corresponding logic symbol for the active notation.
 * Preserves caret / cursor position smoothly.
 */
export function replaceFormulaKeywords(
  text: string,
  cursor: number,
  style: NotationStyle = 'standard'
): ReplacementResult {
  const config = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.standard;
  const symbols = {
    and: config.and.trim(),
    or: config.or.trim(),
    not: config.not.trim(),
    implies: config.implies.trim(),
    iff: config.iff.trim(),
  };

  // Match symbols & words:
  // 1. Multi-character arrow operators: <->, <=>, ->, =>, &&, ||
  // 2. Whole words for logic connectives: IMPLIES, EQUIV, THEN, BICOND, COND, AND, IFF, OR
  // 3. Whole word NOT with optional trailing whitespace: \bNOT\b\s*
  const pattern = /(<->|<=>|->|=>|&&|\|\||\b(?:IMPLIES|EQUIV|THEN|BICOND|COND|AND|IFF|OR)\b|\bNOT\b\s*)/gi;

  let changed = false;
  let newCursor = cursor;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];
    const matchEnd = matchStart + matchText.length;
    const cleanUpper = matchText.trim().toUpperCase();

    let replacement = matchText;
    switch (cleanUpper) {
      case 'AND':
      case '&&':
        replacement = symbols.and;
        break;
      case 'OR':
      case '||':
        replacement = symbols.or;
        break;
      case 'NOT':
        replacement = symbols.not;
        break;
      case 'IMPLIES':
      case 'THEN':
      case 'COND':
      case '->':
      case '=>':
        replacement = symbols.implies;
        break;
      case 'IFF':
      case 'EQUIV':
      case 'BICOND':
      case '<->':
      case '<=>':
        replacement = symbols.iff;
        break;
    }

    if (replacement !== matchText) {
      changed = true;
      result += text.slice(lastIndex, matchStart) + replacement;
      lastIndex = matchEnd;

      // Adjust cursor
      const diff = replacement.length - matchText.length;
      if (cursor >= matchEnd) {
        newCursor += diff;
      } else if (cursor > matchStart && cursor < matchEnd) {
        newCursor = matchStart + replacement.length;
      }
    } else {
      result += text.slice(lastIndex, matchEnd);
      lastIndex = matchEnd;
    }
  }

  if (!changed) {
    return { text, cursor, changed: false };
  }

  result += text.slice(lastIndex);

  return {
    text: result,
    cursor: Math.max(0, Math.min(newCursor, result.length)),
    changed: true,
  };
}

