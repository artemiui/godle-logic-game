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
  copi: {
    name: "Copi (Classic)",
    description: "Irving Copi's Symbolic Logic: tilde ~, dot •, horseshoe ⊃, triple bar ≡",
    not: "~",
    and: " • ",
    or: " ∨ ",
    implies: " ⊃ ",
    iff: " ≡ ",
    latexNot: "\\sim ",
    latexAnd: " \\mathbin{\\bullet} ",
    latexOr: " \\lor ",
    latexImplies: " \\supset ",
    latexIff: " \\equiv ",
  },
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
  ascii: {
    name: "ASCII / Programmer",
    description: "Plain keyboard logic: ~, &, v, ->, <->",
    not: "~",
    and: " & ",
    or: " v ",
    implies: " -> ",
    iff: " <-> ",
    latexNot: "\\sim ",
    latexAnd: " \\ \\&\\  ",
    latexOr: " \\lor ",
    latexImplies: " \\to ",
    latexIff: " \\leftrightarrow ",
  },
};

export function formulaToLaTeX(f: Formula, style: NotationStyle = 'copi'): string {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.copi;

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

export function formulaToString(f: Formula, style: NotationStyle = 'copi'): string {
  const sym = NOTATION_CONFIGS[style] || NOTATION_CONFIGS.copi;

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
