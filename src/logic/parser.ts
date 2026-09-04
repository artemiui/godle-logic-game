import { Formula } from '../types/logic';

export interface Token {
  type: 'ATOM' | 'NOT' | 'AND' | 'OR' | 'IMPLIES' | 'IFF' | 'LPAREN' | 'RPAREN' | 'EOF';
  value: string;
  pos: number;
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    const ch = s[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    const twoChars = s.slice(i, i + 2);
    const threeChars = s.slice(i, i + 3);

    if (threeChars === '<->' || threeChars === '<=>') {
      tokens.push({ type: 'IFF', value: threeChars, pos: i });
      i += 3;
      continue;
    }

    if (twoChars === '->' || twoChars === '=>') {
      tokens.push({ type: 'IMPLIES', value: twoChars, pos: i });
      i += 2;
      continue;
    }

    if (twoChars === '&&') {
      tokens.push({ type: 'AND', value: twoChars, pos: i });
      i += 2;
      continue;
    }

    if (twoChars === '||') {
      tokens.push({ type: 'OR', value: twoChars, pos: i });
      i += 2;
      continue;
    }

    if (ch === '~' || ch === '¬' || ch === '!' || ch === '-') {
      tokens.push({ type: 'NOT', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === '•' || ch === '·' || ch === '*' || ch === '&' || ch === '^' || ch === '∧') {
      tokens.push({ type: 'AND', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === '∨' || ch === '|' || ch === '+') {
      tokens.push({ type: 'OR', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === 'v' || ch === 'V') {
      const prevToken = tokens[tokens.length - 1];
      if (prevToken && (prevToken.type === 'ATOM' || prevToken.type === 'RPAREN')) {
        tokens.push({ type: 'OR', value: ch, pos: i });
        i++;
        continue;
      }
      if (ch === 'v') {
        tokens.push({ type: 'OR', value: ch, pos: i });
        i++;
        continue;
      }
    }

    if (ch === '⊃' || ch === '>' || ch === '→') {
      tokens.push({ type: 'IMPLIES', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === '≡' || ch === '=' || ch === '↔') {
      tokens.push({ type: 'IFF', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      tokens.push({ type: 'LPAREN', value: ch, pos: i });
      i++;
      continue;
    }

    if (ch === ')' || ch === ']' || ch === '}') {
      tokens.push({ type: 'RPAREN', value: ch, pos: i });
      i++;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: 'ATOM', value: ch.toUpperCase(), pos: i });
      i++;
      continue;
    }

    throw new Error('Unexpected character at position ' + (i + 1));
  }

  tokens.push({ type: 'EOF', value: '', pos: s.length });
  return tokens;
}

export class LogicParser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', pos: 0 };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private check(type: Token['type']): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private match(...types: Token['type'][]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: Token['type'], message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(message + (token.value ? " near '" + token.value + "'" : ' at end of input'));
  }

  public parse(): Formula {
    const expr = this.iff();
    if (!this.isAtEnd()) {
      throw new Error("Unexpected symbol '" + this.peek().value + "' after valid expression");
    }
    return expr;
  }

  private iff(): Formula {
    let expr = this.implies();

    while (this.match('IFF')) {
      const right = this.implies();
      expr = { type: 'iff', left: expr, right };
    }

    return expr;
  }

  private implies(): Formula {
    let expr = this.or();

    if (this.match('IMPLIES')) {
      const right = this.implies();
      return { type: 'implies', left: expr, right };
    }

    return expr;
  }

  private or(): Formula {
    let expr = this.and();

    while (this.match('OR')) {
      const right = this.and();
      expr = { type: 'or', left: expr, right };
    }

    return expr;
  }

  private and(): Formula {
    let expr = this.not();

    while (this.match('AND')) {
      const right = this.not();
      expr = { type: 'and', left: expr, right };
    }

    return expr;
  }

  private not(): Formula {
    if (this.match('NOT')) {
      const operand = this.not();
      return { type: 'not', operand };
    }

    return this.primary();
  }

  private primary(): Formula {
    if (this.match('ATOM')) {
      return { type: 'atom', name: this.previous().value };
    }

    if (this.match('LPAREN')) {
      const expr = this.iff();
      this.consume('RPAREN', 'Expected closing parenthesis/bracket');
      return expr;
    }

    const token = this.peek();
    if (token.type === 'EOF') {
      throw new Error('Unexpected end of formula: missing variable or sub-expression');
    }
    throw new Error("Unexpected token '" + token.value + "' at character " + (token.pos + 1));
  }
}

export function parseFormula(input: string): Formula {
  if (!input || !input.trim()) {
    throw new Error('Empty formula string');
  }
  const tokens = tokenize(input);
  const parser = new LogicParser(tokens);
  return parser.parse();
}

export function safeParseFormula(input: string): { formula: Formula | null; error?: string } {
  try {
    return { formula: parseFormula(input) };
  } catch (err: any) {
    return { formula: null, error: err.message || 'Failed to parse formula' };
  }
}
