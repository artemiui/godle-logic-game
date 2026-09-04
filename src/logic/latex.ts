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

export function formulaToLaTeX(f: Formula, style: NotationStyle = 'standard'): string {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.standard;

  function render(node: Formula, parentPrecedence: number): string {
    if (node.type === 'atom') {
      return node.name;
    }

    if (node.type === 'not') {
      const inner = render(node.operand, 5);
      return `${sym.latexNot}${inner}`;
    }

    let prec = 0;
    let op = '';

    switch (node.type) {
      case 'and':
        prec = 4;
        op = sym.latexAnd;
        break;
      case 'or':
        prec = 3;
        op = sym.latexOr;
        break;
      case 'implies':
        prec = 2;
        op = sym.latexImplies;
        break;
      case 'iff':
        prec = 1;
        op = sym.latexIff;
        break;
    }

    const leftStr = render(node.left, prec);
    const rightStr = render(node.right, node.type === 'implies' ? prec - 0.1 : prec);

    const expr = `${leftStr}${op}${rightStr}`;

    if (prec < parentPrecedence) {
      return `(${expr})`;
    }
    return expr;
  }

  return render(f, 0);
}

export function formulaToString(f: Formula, style: NotationStyle = 'standard'): string {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.standard;

  function render(node: Formula, parentPrecedence: number): string {
    if (node.type === 'atom') {
      return node.name;
    }

    if (node.type === 'not') {
      const inner = render(node.operand, 5);
      return `${sym.not}${inner}`;
    }

    let prec = 0;
    let op = '';

    switch (node.type) {
      case 'and':
        prec = 4;
        op = sym.and;
        break;
      case 'or':
        prec = 3;
        op = sym.or;
        break;
      case 'implies':
        prec = 2;
        op = sym.implies;
        break;
      case 'iff':
        prec = 1;
        op = sym.iff;
        break;
    }

    const leftStr = render(node.left, prec);
    const rightStr = render(node.right, node.type === 'implies' ? prec - 0.1 : prec);

    const expr = `${leftStr}${op}${rightStr}`;

    if (prec < parentPrecedence) {
      return `(${expr})`;
    }
    return expr;
  }

  return render(f, 0);
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

