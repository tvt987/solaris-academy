/**
 * Safe deterministic JavaScript subset interpreter (zero eval, zero new Function).
 * Designed specifically for Solaris Academy's in-browser coding sandbox with strict
 * step-budget protection and prototype-chain isolation.
 */

type TokenType =
  | 'number'
  | 'string'
  | 'ident'
  | 'op'
  | 'punct'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const MULTI_CHAR_OPS = [
  '===',
  '!==',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '??',
  '=>',
  '?.',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '++',
  '--',
  '...',
];

const SINGLE_CHAR_OPS = new Set(['+', '-', '*', '/', '%', '=', '<', '>', '!', '?']);
const PUNCT_CHARS = new Set(['(', ')', '{', '}', '[', ']', ',', ';', ':', '.']);

const BLOCKED_PROPS = new Set(['__proto__', 'constructor', 'prototype']);

export function tokenizeJs(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i] ?? '';

    // Whitespace
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Line comment
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i += 1;
      continue;
    }

    // Block comment
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    // String literal ('...', "...", `...`)
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch;
      const start = i;
      i += 1;
      let str = '';
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) {
          const esc = source[i + 1] ?? '';
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === 'r') str += '\r';
          else str += esc;
          i += 2;
        } else {
          str += source[i] ?? '';
          i += 1;
        }
      }
      if (i >= len) {
        throw new SyntaxError(`Unterminated string literal at position ${start}`);
      }
      i += 1; // closing quote
      tokens.push({ type: 'string', value: str, pos: start });
      continue;
    }

    // Number literal (int, decimal, scientific notation like 1e-12)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const start = i;
      while (i < len && /[0-9_]/.test(source[i] ?? '')) i += 1;
      if (source[i] === '.' && /[0-9]/.test(source[i + 1] ?? '')) {
        i += 1;
        while (i < len && /[0-9_]/.test(source[i] ?? '')) i += 1;
      }
      if ((source[i] === 'e' || source[i] === 'E') && /[0-9+-]/.test(source[i + 1] ?? '')) {
        i += 1;
        if (source[i] === '+' || source[i] === '-') i += 1;
        while (i < len && /[0-9_]/.test(source[i] ?? '')) i += 1;
      }
      tokens.push({ type: 'number', value: source.slice(start, i).replace(/_/g, ''), pos: start });
      continue;
    }

    // Identifier or keyword
    if (/[A-Za-z_$]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < len && /[A-Za-z0-9_$]/.test(source[i] ?? '')) i += 1;
      tokens.push({ type: 'ident', value: source.slice(start, i), pos: start });
      continue;
    }

    // Multi-char operators
    let matchedMulti = false;
    for (const op of MULTI_CHAR_OPS) {
      if (source.startsWith(op, i)) {
        tokens.push({ type: 'op', value: op, pos: i });
        i += op.length;
        matchedMulti = true;
        break;
      }
    }
    if (matchedMulti) continue;

    if (SINGLE_CHAR_OPS.has(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i });
      i += 1;
      continue;
    }

    if (PUNCT_CHARS.has(ch)) {
      tokens.push({ type: 'punct', value: ch, pos: i });
      i += 1;
      continue;
    }

    throw new SyntaxError(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ type: 'eof', value: '', pos: len });
  return tokens;
}

// --- AST Nodes ---

type Pattern =
  | { kind: 'IdentPattern'; name: string }
  | { kind: 'ArrayPattern'; elements: Array<Pattern | null> }
  | { kind: 'ObjectPattern'; properties: Array<{ key: string; value: Pattern }> };

interface ParamNode {
  pattern: Pattern;
  defaultExpr?: Expr;
}

type Stmt =
  | { kind: 'BlockStmt'; body: Stmt[] }
  | { kind: 'VarDecl'; declKind: 'const' | 'let' | 'var'; pattern: Pattern; init?: Expr }
  | { kind: 'FuncDecl'; name: string; params: ParamNode[]; body: Stmt[] }
  | { kind: 'ReturnStmt'; arg?: Expr }
  | { kind: 'IfStmt'; test: Expr; consequent: Stmt; alternate?: Stmt }
  | { kind: 'ForStmt'; init?: Stmt | Expr; test?: Expr; update?: Expr; body: Stmt }
  | { kind: 'ForOfStmt'; declKind: 'const' | 'let' | 'var'; pattern: Pattern; iterable: Expr; body: Stmt }
  | { kind: 'WhileStmt'; test: Expr; body: Stmt }
  | { kind: 'BreakStmt' }
  | { kind: 'ContinueStmt' }
  | { kind: 'ExprStmt'; expr: Expr }
  | { kind: 'EmptyStmt' };

type Expr =
  | { kind: 'Literal'; value: unknown }
  | { kind: 'Ident'; name: string }
  | { kind: 'ArrayExpr'; elements: Array<{ spread: boolean; expr: Expr }> }
  | { kind: 'ObjectExpr'; props: Array<{ key: string; value: Expr; spread?: boolean }> }
  | { kind: 'ArrowFn'; params: ParamNode[]; body: Stmt[] | Expr }
  | { kind: 'FuncExpr'; name?: string; params: ParamNode[]; body: Stmt[] }
  | { kind: 'UnaryExpr'; op: string; arg: Expr }
  | { kind: 'UpdateExpr'; op: '++' | '--'; prefix: boolean; arg: Expr }
  | { kind: 'BinaryExpr'; op: string; left: Expr; right: Expr }
  | { kind: 'LogicalExpr'; op: '&&' | '||' | '??'; left: Expr; right: Expr }
  | { kind: 'ConditionalExpr'; test: Expr; consequent: Expr; alternate: Expr }
  | { kind: 'AssignExpr'; op: string; left: Expr; right: Expr }
  | { kind: 'MemberExpr'; object: Expr; property: Expr; computed: boolean; optional: boolean }
  | { kind: 'CallExpr'; callee: Expr; args: Array<{ spread: boolean; expr: Expr }>; optional: boolean }
  | { kind: 'NewExpr'; callee: Expr; args: Array<{ spread: boolean; expr: Expr }> };

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[this.pos + offset] ?? { type: 'eof', value: '', pos: 0 };
  }

  private consume(): Token {
    const tok = this.peek();
    this.pos += 1;
    return tok;
  }

  private match(type: TokenType, value?: string): boolean {
    const tok = this.peek();
    if (tok.type !== type) return false;
    if (value !== undefined && tok.value !== value) return false;
    return true;
  }

  private expect(type: TokenType, value?: string): Token {
    const tok = this.peek();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new SyntaxError(
        `Expected ${value ?? type} but got '${tok.value || tok.type}' at position ${tok.pos}`,
      );
    }
    return this.consume();
  }

  private consumeOptionalSemicolon(): void {
    if (this.match('punct', ';')) {
      this.consume();
    }
  }

  parseProgram(): Stmt[] {
    const stmts: Stmt[] = [];
    while (!this.match('eof')) {
      stmts.push(this.parseStmt());
    }
    return stmts;
  }

  private parseStmt(): Stmt {
    if (this.match('punct', ';')) {
      this.consume();
      return { kind: 'EmptyStmt' };
    }
    if (this.match('punct', '{')) {
      return this.parseBlock();
    }
    if (this.match('ident', 'function')) {
      return this.parseFuncDecl();
    }
    if (this.match('ident', 'const') || this.match('ident', 'let') || this.match('ident', 'var')) {
      const decl = this.parseVarDecl(true);
      this.consumeOptionalSemicolon();
      return decl;
    }
    if (this.match('ident', 'return')) {
      this.consume();
      if (this.match('punct', ';') || this.match('punct', '}') || this.match('eof')) {
        this.consumeOptionalSemicolon();
        return { kind: 'ReturnStmt' };
      }
      const arg = this.parseExpr();
      this.consumeOptionalSemicolon();
      return { kind: 'ReturnStmt', arg };
    }
    if (this.match('ident', 'if')) {
      this.consume();
      this.expect('punct', '(');
      const test = this.parseExpr();
      this.expect('punct', ')');
      const consequent = this.parseStmt();
      let alternate: Stmt | undefined;
      if (this.match('ident', 'else')) {
        this.consume();
        alternate = this.parseStmt();
      }
      return { kind: 'IfStmt', test, consequent, alternate };
    }
    if (this.match('ident', 'for')) {
      return this.parseForStmt();
    }
    if (this.match('ident', 'while')) {
      this.consume();
      this.expect('punct', '(');
      const test = this.parseExpr();
      this.expect('punct', ')');
      const body = this.parseStmt();
      return { kind: 'WhileStmt', test, body };
    }
    if (this.match('ident', 'break')) {
      this.consume();
      this.consumeOptionalSemicolon();
      return { kind: 'BreakStmt' };
    }
    if (this.match('ident', 'continue')) {
      this.consume();
      this.consumeOptionalSemicolon();
      return { kind: 'ContinueStmt' };
    }

    const expr = this.parseExpr();
    this.consumeOptionalSemicolon();
    return { kind: 'ExprStmt', expr };
  }

  private parseBlock(): Stmt {
    this.expect('punct', '{');
    const body: Stmt[] = [];
    while (!this.match('punct', '}') && !this.match('eof')) {
      body.push(this.parseStmt());
    }
    this.expect('punct', '}');
    return { kind: 'BlockStmt', body };
  }

  private parseFuncDecl(): Stmt {
    this.expect('ident', 'function');
    const name = this.expect('ident').value;
    const params = this.parseParamList();
    const block = this.parseBlock();
    return {
      kind: 'FuncDecl',
      name,
      params,
      body: block.kind === 'BlockStmt' ? block.body : [],
    };
  }

  private parseParamList(): ParamNode[] {
    this.expect('punct', '(');
    const params: ParamNode[] = [];
    while (!this.match('punct', ')') && !this.match('eof')) {
      const pattern = this.parsePattern();
      let defaultExpr: Expr | undefined;
      if (this.match('op', '=')) {
        this.consume();
        defaultExpr = this.parseAssignExpr();
      }
      params.push({ pattern, defaultExpr });
      if (this.match('punct', ',')) {
        this.consume();
      } else {
        break;
      }
    }
    this.expect('punct', ')');
    return params;
  }

  private parsePattern(): Pattern {
    if (this.match('punct', '[')) {
      this.consume();
      const elements: Array<Pattern | null> = [];
      while (!this.match('punct', ']') && !this.match('eof')) {
        if (this.match('punct', ',')) {
          elements.push(null);
          this.consume();
          continue;
        }
        elements.push(this.parsePattern());
        if (this.match('punct', ',')) this.consume();
      }
      this.expect('punct', ']');
      return { kind: 'ArrayPattern', elements };
    }
    if (this.match('punct', '{')) {
      this.consume();
      const properties: Array<{ key: string; value: Pattern }> = [];
      while (!this.match('punct', '}') && !this.match('eof')) {
        const keyTok = this.expect('ident');
        let value: Pattern = { kind: 'IdentPattern', name: keyTok.value };
        if (this.match('punct', ':')) {
          this.consume();
          value = this.parsePattern();
        }
        properties.push({ key: keyTok.value, value });
        if (this.match('punct', ',')) this.consume();
      }
      this.expect('punct', '}');
      return { kind: 'ObjectPattern', properties };
    }
    const ident = this.expect('ident');
    return { kind: 'IdentPattern', name: ident.value };
  }

  private parseVarDecl(allowInit: boolean): Stmt {
    const kindTok = this.consume();
    const declKind = kindTok.value as 'const' | 'let' | 'var';
    const pattern = this.parsePattern();
    let init: Expr | undefined;
    if (allowInit && this.match('op', '=')) {
      this.consume();
      init = this.parseAssignExpr();
    }
    return { kind: 'VarDecl', declKind, pattern, init };
  }

  private parseForStmt(): Stmt {
    this.expect('ident', 'for');
    this.expect('punct', '(');

    // Check for-of
    if (this.match('ident', 'const') || this.match('ident', 'let') || this.match('ident', 'var')) {
      const savedPos = this.pos;
      const declKind = this.consume().value as 'const' | 'let' | 'var';
      const pattern = this.parsePattern();
      if (this.match('ident', 'of')) {
        this.consume();
        const iterable = this.parseExpr();
        this.expect('punct', ')');
        const body = this.parseStmt();
        return { kind: 'ForOfStmt', declKind, pattern, iterable, body };
      }
      // Restore and parse classic for loop
      this.pos = savedPos;
    }

    let init: Stmt | Expr | undefined;
    if (!this.match('punct', ';')) {
      if (this.match('ident', 'const') || this.match('ident', 'let') || this.match('ident', 'var')) {
        init = this.parseVarDecl(true);
      } else {
        init = this.parseExpr();
      }
    }
    this.expect('punct', ';');

    let test: Expr | undefined;
    if (!this.match('punct', ';')) {
      test = this.parseExpr();
    }
    this.expect('punct', ';');

    let update: Expr | undefined;
    if (!this.match('punct', ')')) {
      update = this.parseExpr();
    }
    this.expect('punct', ')');

    const body = this.parseStmt();
    return { kind: 'ForStmt', init, test, update, body };
  }

  private parseExpr(): Expr {
    return this.parseAssignExpr();
  }

  private parseAssignExpr(): Expr {
    const arrow = this.tryParseArrowFn();
    if (arrow) return arrow;

    const left = this.parseConditionalExpr();
    const tok = this.peek();
    if (
      tok.type === 'op' &&
      (tok.value === '=' ||
        tok.value === '+=' ||
        tok.value === '-=' ||
        tok.value === '*=' ||
        tok.value === '/=' ||
        tok.value === '%=')
    ) {
      this.consume();
      const right = this.parseAssignExpr();
      return { kind: 'AssignExpr', op: tok.value, left, right };
    }
    return left;
  }

  private tryParseArrowFn(): Expr | null {
    const saved = this.pos;
    try {
      // Single bare identifier arrow: x => ...
      if (this.match('ident') && this.peek(1).type === 'op' && this.peek(1).value === '=>') {
        const name = this.consume().value;
        this.consume(); // =>
        return this.finishArrowBody([{ pattern: { kind: 'IdentPattern', name } }]);
      }
      // Parenthesized parameter list: (a, b) => ... or ([id]) => ...
      if (this.match('punct', '(')) {
        const params = this.parseParamList();
        if (this.match('op', '=>')) {
          this.consume();
          return this.finishArrowBody(params);
        }
      }
    } catch {
      // Backtrack
    }
    this.pos = saved;
    return null;
  }

  private finishArrowBody(params: ParamNode[]): Expr {
    if (this.match('punct', '{')) {
      const block = this.parseBlock();
      return {
        kind: 'ArrowFn',
        params,
        body: block.kind === 'BlockStmt' ? block.body : [],
      };
    }
    const expr = this.parseAssignExpr();
    return { kind: 'ArrowFn', params, body: expr };
  }

  private parseConditionalExpr(): Expr {
    const test = this.parseNullishOrExpr();
    if (this.match('op', '?')) {
      this.consume();
      const consequent = this.parseAssignExpr();
      this.expect('punct', ':');
      const alternate = this.parseAssignExpr();
      return { kind: 'ConditionalExpr', test, consequent, alternate };
    }
    return test;
  }

  private parseNullishOrExpr(): Expr {
    let left = this.parseLogicalAndExpr();
    while (this.match('op', '||') || this.match('op', '??')) {
      const op = this.consume().value as '||' | '??';
      const right = this.parseLogicalAndExpr();
      left = { kind: 'LogicalExpr', op, left, right };
    }
    return left;
  }

  private parseLogicalAndExpr(): Expr {
    let left = this.parseEqualityExpr();
    while (this.match('op', '&&')) {
      this.consume();
      const right = this.parseEqualityExpr();
      left = { kind: 'LogicalExpr', op: '&&', left, right };
    }
    return left;
  }

  private parseEqualityExpr(): Expr {
    let left = this.parseRelationalExpr();
    while (
      this.match('op', '===') ||
      this.match('op', '!==') ||
      this.match('op', '==') ||
      this.match('op', '!=')
    ) {
      const op = this.consume().value;
      const right = this.parseRelationalExpr();
      left = { kind: 'BinaryExpr', op, left, right };
    }
    return left;
  }

  private parseRelationalExpr(): Expr {
    let left = this.parseAdditiveExpr();
    while (
      this.match('op', '<') ||
      this.match('op', '<=') ||
      this.match('op', '>') ||
      this.match('op', '>=')
    ) {
      const op = this.consume().value;
      const right = this.parseAdditiveExpr();
      left = { kind: 'BinaryExpr', op, left, right };
    }
    return left;
  }

  private parseAdditiveExpr(): Expr {
    let left = this.parseMultiplicativeExpr();
    while (this.match('op', '+') || this.match('op', '-')) {
      const op = this.consume().value;
      const right = this.parseMultiplicativeExpr();
      left = { kind: 'BinaryExpr', op, left, right };
    }
    return left;
  }

  private parseMultiplicativeExpr(): Expr {
    let left = this.parseUnaryExpr();
    while (this.match('op', '*') || this.match('op', '/') || this.match('op', '%')) {
      const op = this.consume().value;
      const right = this.parseUnaryExpr();
      left = { kind: 'BinaryExpr', op, left, right };
    }
    return left;
  }

  private parseUnaryExpr(): Expr {
    if (this.match('op', '!') || this.match('op', '-') || this.match('op', '+')) {
      const op = this.consume().value;
      return { kind: 'UnaryExpr', op, arg: this.parseUnaryExpr() };
    }
    if (this.match('ident', 'typeof')) {
      this.consume();
      return { kind: 'UnaryExpr', op: 'typeof', arg: this.parseUnaryExpr() };
    }
    if (this.match('op', '++') || this.match('op', '--')) {
      const op = this.consume().value as '++' | '--';
      return { kind: 'UpdateExpr', op, prefix: true, arg: this.parseUnaryExpr() };
    }
    if (this.match('ident', 'new')) {
      this.consume();
      const callee = this.parsePrimaryExpr();
      const args = this.match('punct', '(') ? this.parseCallArgs() : [];
      return { kind: 'NewExpr', callee, args };
    }
    return this.parsePostfixExpr();
  }

  private parsePostfixExpr(): Expr {
    let expr = this.parseCallAndMemberExpr();
    if (this.match('op', '++') || this.match('op', '--')) {
      const op = this.consume().value as '++' | '--';
      expr = { kind: 'UpdateExpr', op, prefix: false, arg: expr };
    }
    return expr;
  }

  private parseCallAndMemberExpr(): Expr {
    let expr = this.parsePrimaryExpr();

    while (true) {
      if (this.match('punct', '.')) {
        this.consume();
        const prop = this.expect('ident').value;
        expr = {
          kind: 'MemberExpr',
          object: expr,
          property: { kind: 'Literal', value: prop },
          computed: false,
          optional: false,
        };
        continue;
      }
      if (this.match('op', '?.')) {
        this.consume();
        if (this.match('punct', '[')) {
          this.consume();
          const propExpr = this.parseExpr();
          this.expect('punct', ']');
          expr = {
            kind: 'MemberExpr',
            object: expr,
            property: propExpr,
            computed: true,
            optional: true,
          };
        } else if (this.match('punct', '(')) {
          const args = this.parseCallArgs();
          expr = { kind: 'CallExpr', callee: expr, args, optional: true };
        } else {
          const prop = this.expect('ident').value;
          expr = {
            kind: 'MemberExpr',
            object: expr,
            property: { kind: 'Literal', value: prop },
            computed: false,
            optional: true,
          };
        }
        continue;
      }
      if (this.match('punct', '[')) {
        this.consume();
        const propExpr = this.parseExpr();
        this.expect('punct', ']');
        expr = {
          kind: 'MemberExpr',
          object: expr,
          property: propExpr,
          computed: true,
          optional: false,
        };
        continue;
      }
      if (this.match('punct', '(')) {
        const args = this.parseCallArgs();
        expr = { kind: 'CallExpr', callee: expr, args, optional: false };
        continue;
      }
      break;
    }

    return expr;
  }

  private parseCallArgs(): Array<{ spread: boolean; expr: Expr }> {
    this.expect('punct', '(');
    const args: Array<{ spread: boolean; expr: Expr }> = [];
    while (!this.match('punct', ')') && !this.match('eof')) {
      let spread = false;
      if (this.match('op', '...')) {
        this.consume();
        spread = true;
      }
      args.push({ spread, expr: this.parseAssignExpr() });
      if (this.match('punct', ',')) {
        this.consume();
      } else {
        break;
      }
    }
    this.expect('punct', ')');
    return args;
  }

  private parsePrimaryExpr(): Expr {
    const tok = this.peek();

    if (tok.type === 'number') {
      this.consume();
      return { kind: 'Literal', value: Number(tok.value) };
    }
    if (tok.type === 'string') {
      this.consume();
      return { kind: 'Literal', value: tok.value };
    }
    if (tok.type === 'ident') {
      if (tok.value === 'true') {
        this.consume();
        return { kind: 'Literal', value: true };
      }
      if (tok.value === 'false') {
        this.consume();
        return { kind: 'Literal', value: false };
      }
      if (tok.value === 'null') {
        this.consume();
        return { kind: 'Literal', value: null };
      }
      if (tok.value === 'undefined') {
        this.consume();
        return { kind: 'Literal', value: undefined };
      }
      if (tok.value === 'function') {
        this.consume();
        const name = this.match('ident') ? this.consume().value : undefined;
        const params = this.parseParamList();
        const block = this.parseBlock();
        return {
          kind: 'FuncExpr',
          name,
          params,
          body: block.kind === 'BlockStmt' ? block.body : [],
        };
      }
      this.consume();
      return { kind: 'Ident', name: tok.value };
    }
    if (this.match('punct', '(')) {
      this.consume();
      const expr = this.parseExpr();
      this.expect('punct', ')');
      return expr;
    }
    if (this.match('punct', '[')) {
      this.consume();
      const elements: Array<{ spread: boolean; expr: Expr }> = [];
      while (!this.match('punct', ']') && !this.match('eof')) {
        let spread = false;
        if (this.match('op', '...')) {
          this.consume();
          spread = true;
        }
        elements.push({ spread, expr: this.parseAssignExpr() });
        if (this.match('punct', ',')) this.consume();
      }
      this.expect('punct', ']');
      return { kind: 'ArrayExpr', elements };
    }
    if (this.match('punct', '{')) {
      this.consume();
      const props: Array<{ key: string; value: Expr; spread?: boolean }> = [];
      while (!this.match('punct', '}') && !this.match('eof')) {
        if (this.match('op', '...')) {
          this.consume();
          props.push({ key: '', value: this.parseAssignExpr(), spread: true });
          if (this.match('punct', ',')) this.consume();
          continue;
        }
        const keyTok = this.peek();
        let key: string;
        if (keyTok.type === 'ident' || keyTok.type === 'string' || keyTok.type === 'number') {
          key = this.consume().value;
        } else {
          throw new SyntaxError(`Unexpected property key '${keyTok.value}' at position ${keyTok.pos}`);
        }
        if (this.match('punct', ':')) {
          this.consume();
          const value = this.parseAssignExpr();
          props.push({ key, value });
        } else {
          // Shorthand property: { accepted }
          props.push({ key, value: { kind: 'Ident', name: key } });
        }
        if (this.match('punct', ',')) this.consume();
      }
      this.expect('punct', '}');
      return { kind: 'ObjectExpr', props };
    }

    throw new SyntaxError(`Unexpected token '${tok.value || tok.type}' at position ${tok.pos}`);
  }
}

// --- Runtime Evaluator ---

class Scope {
  private vars = new Map<string, { value: unknown; isConst: boolean }>();
  private parent: Scope | null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  define(name: string, value: unknown, isConst: boolean): void {
    this.vars.set(name, { value, isConst });
  }

  get(name: string): unknown {
    if (this.vars.has(name)) {
      return this.vars.get(name)?.value;
    }
    if (this.parent) return this.parent.get(name);
    throw new ReferenceError(`Identifier '${name}' is not defined`);
  }

  has(name: string): boolean {
    if (this.vars.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }

  set(name: string, value: unknown): unknown {
    const entry = this.vars.get(name);
    if (entry) {
      if (entry.isConst) {
        throw new TypeError(`Assignment to constant variable '${name}'`);
      }
      entry.value = value;
      return value;
    }
    if (this.parent) return this.parent.set(name, value);
    throw new ReferenceError(`Identifier '${name}' is not defined`);
  }
}

type Signal =
  | { type: 'none' }
  | { type: 'return'; value: unknown }
  | { type: 'break' }
  | { type: 'continue' };

const NONE_SIGNAL: Signal = { type: 'none' };

interface ExecContext {
  steps: number;
  maxSteps: number;
}

function tick(ctx: ExecContext): void {
  ctx.steps += 1;
  if (ctx.steps > ctx.maxSteps) {
    throw new Error('Execution step limit exceeded (possible infinite loop)');
  }
}

function createSafeGlobalScope(): Scope {
  const scope = new Scope(null);
  const safeEntries: Array<[string, unknown]> = [
    ['Math', Math],
    ['Number', Number],
    ['String', String],
    ['Boolean', Boolean],
    ['Array', Array],
    ['Object', Object],
    ['Set', Set],
    ['Map', Map],
    ['JSON', JSON],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['isNaN', Number.isNaN],
    ['isFinite', Number.isFinite],
    ['parseInt', Number.parseInt],
    ['parseFloat', Number.parseFloat],
    ['undefined', undefined],
  ];
  for (const [k, v] of safeEntries) {
    scope.define(k, v, true);
  }
  return scope;
}

function bindPattern(
  scope: Scope,
  pattern: Pattern,
  value: unknown,
  isConst: boolean,
): void {
  if (pattern.kind === 'IdentPattern') {
    scope.define(pattern.name, value, isConst);
    return;
  }
  if (pattern.kind === 'ArrayPattern') {
    const arr = Array.isArray(value) ? value : [];
    pattern.elements.forEach((el, idx) => {
      if (el) bindPattern(scope, el, arr[idx], isConst);
    });
    return;
  }
  if (pattern.kind === 'ObjectPattern') {
    const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    for (const prop of pattern.properties) {
      if (BLOCKED_PROPS.has(prop.key)) {
        throw new Error(`Access to '${prop.key}' is blocked in sandbox`);
      }
      bindPattern(scope, prop.value, obj[prop.key], isConst);
    }
  }
}

function makeCallable(
  params: ParamNode[],
  body: Stmt[] | Expr,
  closureScope: Scope,
  ctx: ExecContext,
): (...args: unknown[]) => unknown {
  return (...args: unknown[]): unknown => {
    tick(ctx);
    const fnScope = new Scope(closureScope);
    params.forEach((param, idx) => {
      const provided = idx < args.length ? args[idx] : undefined;
      const val =
        provided === undefined && param.defaultExpr
          ? evalExpr(param.defaultExpr, fnScope, ctx)
          : provided;
      bindPattern(fnScope, param.pattern, val, false);
    });

    if (Array.isArray(body)) {
      const sig = evalStmts(body, fnScope, ctx);
      if (sig.type === 'return') return sig.value;
      return undefined;
    }
    return evalExpr(body, fnScope, ctx);
  };
}

function evalStmts(stmts: Stmt[], scope: Scope, ctx: ExecContext): Signal {
  // Hoist function declarations inside current block
  for (const stmt of stmts) {
    if (stmt.kind === 'FuncDecl') {
      const fn = makeCallable(stmt.params, stmt.body, scope, ctx);
      scope.define(stmt.name, fn, false);
    }
  }

  for (const stmt of stmts) {
    if (stmt.kind === 'FuncDecl') continue;
    const sig = evalStmt(stmt, scope, ctx);
    if (sig.type !== 'none') return sig;
  }
  return NONE_SIGNAL;
}

function evalStmt(stmt: Stmt, scope: Scope, ctx: ExecContext): Signal {
  tick(ctx);

  switch (stmt.kind) {
    case 'EmptyStmt':
    case 'FuncDecl':
      return NONE_SIGNAL;

    case 'BlockStmt':
      return evalStmts(stmt.body, new Scope(scope), ctx);

    case 'VarDecl': {
      const val = stmt.init ? evalExpr(stmt.init, scope, ctx) : undefined;
      bindPattern(scope, stmt.pattern, val, stmt.declKind === 'const');
      return NONE_SIGNAL;
    }

    case 'ReturnStmt':
      return {
        type: 'return',
        value: stmt.arg ? evalExpr(stmt.arg, scope, ctx) : undefined,
      };

    case 'BreakStmt':
      return { type: 'break' };

    case 'ContinueStmt':
      return { type: 'continue' };

    case 'ExprStmt':
      evalExpr(stmt.expr, scope, ctx);
      return NONE_SIGNAL;

    case 'IfStmt': {
      const cond = evalExpr(stmt.test, scope, ctx);
      if (cond) {
        return evalStmt(stmt.consequent, scope, ctx);
      }
      if (stmt.alternate) {
        return evalStmt(stmt.alternate, scope, ctx);
      }
      return NONE_SIGNAL;
    }

    case 'WhileStmt': {
      while (evalExpr(stmt.test, scope, ctx)) {
        tick(ctx);
        const sig = evalStmt(stmt.body, scope, ctx);
        if (sig.type === 'return') return sig;
        if (sig.type === 'break') break;
      }
      return NONE_SIGNAL;
    }

    case 'ForStmt': {
      const loopScope = new Scope(scope);
      if (stmt.init) {
        if ('kind' in stmt.init && (stmt.init.kind === 'VarDecl' || stmt.init.kind === 'ExprStmt')) {
          evalStmt(stmt.init as Stmt, loopScope, ctx);
        } else {
          evalExpr(stmt.init as Expr, loopScope, ctx);
        }
      }
      while (stmt.test ? Boolean(evalExpr(stmt.test, loopScope, ctx)) : true) {
        tick(ctx);
        const iterScope = new Scope(loopScope);
        const sig = evalStmt(stmt.body, iterScope, ctx);
        if (sig.type === 'return') return sig;
        if (sig.type === 'break') break;
        if (stmt.update) {
          evalExpr(stmt.update, loopScope, ctx);
        }
      }
      return NONE_SIGNAL;
    }

    case 'ForOfStmt': {
      const iterable = evalExpr(stmt.iterable, scope, ctx);
      if (iterable === null || iterable === undefined || typeof (iterable as Iterable<unknown>)[Symbol.iterator] !== 'function') {
        throw new TypeError('Value is not iterable in for..of loop');
      }
      for (const item of iterable as Iterable<unknown>) {
        tick(ctx);
        const iterScope = new Scope(scope);
        bindPattern(iterScope, stmt.pattern, item, stmt.declKind === 'const');
        const sig = evalStmt(stmt.body, iterScope, ctx);
        if (sig.type === 'return') return sig;
        if (sig.type === 'break') break;
      }
      return NONE_SIGNAL;
    }
  }
}

function readSafeProp(obj: unknown, key: string | number): unknown {
  const keyStr = String(key);
  if (BLOCKED_PROPS.has(keyStr)) {
    throw new Error(`Property access to '${keyStr}' is blocked in sandbox`);
  }
  if (obj === null || obj === undefined) {
    throw new TypeError(`Cannot read properties of ${String(obj)} (reading '${keyStr}')`);
  }
  return (obj as Record<string, unknown>)[keyStr];
}

function writeSafeProp(obj: unknown, key: string | number, val: unknown): unknown {
  const keyStr = String(key);
  if (BLOCKED_PROPS.has(keyStr)) {
    throw new Error(`Property write to '${keyStr}' is blocked in sandbox`);
  }
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    throw new TypeError(`Cannot set property '${keyStr}' on non-object`);
  }
  (obj as Record<string, unknown>)[keyStr] = val;
  return val;
}

function applyCompound(op: string, current: unknown, rhs: unknown): unknown {
  switch (op) {
    case '=':
      return rhs;
    case '+=':
      if (typeof current === 'string' || typeof rhs === 'string') {
        return String(current) + String(rhs);
      }
      return Number(current) + Number(rhs);
    case '-=':
      return Number(current) - Number(rhs);
    case '*=':
      return Number(current) * Number(rhs);
    case '/=':
      return Number(current) / Number(rhs);
    case '%=':
      return Number(current) % Number(rhs);
    default:
      throw new Error(`Unsupported assignment operator '${op}'`);
  }
}

function evalArgs(
  args: Array<{ spread: boolean; expr: Expr }>,
  scope: Scope,
  ctx: ExecContext,
): unknown[] {
  const out: unknown[] = [];
  for (const a of args) {
    const val = evalExpr(a.expr, scope, ctx);
    if (a.spread) {
      if (Array.isArray(val)) out.push(...val);
      else if (val && typeof (val as Iterable<unknown>)[Symbol.iterator] === 'function') {
        out.push(...Array.from(val as Iterable<unknown>));
      }
    } else {
      out.push(val);
    }
  }
  return out;
}

function evalExpr(expr: Expr, scope: Scope, ctx: ExecContext): unknown {
  tick(ctx);

  switch (expr.kind) {
    case 'Literal':
      return expr.value;

    case 'Ident':
      return scope.get(expr.name);

    case 'ArrayExpr':
      return evalArgs(expr.elements, scope, ctx);

    case 'ObjectExpr': {
      const obj: Record<string, unknown> = {};
      for (const prop of expr.props) {
        if (prop.spread) {
          const val = evalExpr(prop.value, scope, ctx);
          if (val && typeof val === 'object') {
            for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
              if (!BLOCKED_PROPS.has(k)) obj[k] = v;
            }
          }
        } else {
          if (BLOCKED_PROPS.has(prop.key)) {
            throw new Error(`Property '${prop.key}' is blocked in sandbox`);
          }
          obj[prop.key] = evalExpr(prop.value, scope, ctx);
        }
      }
      return obj;
    }

    case 'ArrowFn':
      return makeCallable(expr.params, expr.body, scope, ctx);

    case 'FuncExpr':
      return makeCallable(expr.params, expr.body, scope, ctx);

    case 'UnaryExpr': {
      if (expr.op === 'typeof') {
        if (expr.arg.kind === 'Ident' && !scope.has(expr.arg.name)) {
          return 'undefined';
        }
        return typeof evalExpr(expr.arg, scope, ctx);
      }
      const val = evalExpr(expr.arg, scope, ctx);
      if (expr.op === '!') return !val;
      if (expr.op === '-') return -Number(val);
      if (expr.op === '+') return +Number(val);
      throw new Error(`Unsupported unary operator '${expr.op}'`);
    }

    case 'UpdateExpr': {
      const delta = expr.op === '++' ? 1 : -1;
      if (expr.arg.kind === 'Ident') {
        const prev = Number(scope.get(expr.arg.name));
        const next = prev + delta;
        scope.set(expr.arg.name, next);
        return expr.prefix ? next : prev;
      }
      if (expr.arg.kind === 'MemberExpr') {
        const obj = evalExpr(expr.arg.object, scope, ctx);
        const key = expr.arg.computed
          ? String(evalExpr(expr.arg.property, scope, ctx))
          : String((expr.arg.property as { kind: 'Literal'; value: unknown }).value);
        const prev = Number(readSafeProp(obj, key));
        const next = prev + delta;
        writeSafeProp(obj, key, next);
        return expr.prefix ? next : prev;
      }
      throw new SyntaxError('Invalid left-hand side in update expression');
    }

    case 'LogicalExpr': {
      const left = evalExpr(expr.left, scope, ctx);
      if (expr.op === '&&') return left ? evalExpr(expr.right, scope, ctx) : left;
      if (expr.op === '||') return left ? left : evalExpr(expr.right, scope, ctx);
      return left !== null && left !== undefined ? left : evalExpr(expr.right, scope, ctx);
    }

    case 'ConditionalExpr': {
      const cond = evalExpr(expr.test, scope, ctx);
      return cond
        ? evalExpr(expr.consequent, scope, ctx)
        : evalExpr(expr.alternate, scope, ctx);
    }

    case 'BinaryExpr': {
      const l = evalExpr(expr.left, scope, ctx);
      const r = evalExpr(expr.right, scope, ctx);
      switch (expr.op) {
        case '+':
          if (typeof l === 'string' || typeof r === 'string') return String(l) + String(r);
          return Number(l) + Number(r);
        case '-':
          return Number(l) - Number(r);
        case '*':
          return Number(l) * Number(r);
        case '/':
          return Number(l) / Number(r);
        case '%':
          return Number(l) % Number(r);
        case '<':
          return (l as number) < (r as number);
        case '<=':
          return (l as number) <= (r as number);
        case '>':
          return (l as number) > (r as number);
        case '>=':
          return (l as number) >= (r as number);
        case '===':
          return l === r;
        case '!==':
          return l !== r;
        case '==':
          // eslint-disable-next-line eqeqeq
          return l == r;
        case '!=':
          // eslint-disable-next-line eqeqeq
          return l != r;
        default:
          throw new Error(`Unsupported binary operator '${expr.op}'`);
      }
    }

    case 'AssignExpr': {
      const rhs = evalExpr(expr.right, scope, ctx);
      if (expr.left.kind === 'Ident') {
        const cur = expr.op === '=' ? undefined : scope.get(expr.left.name);
        return scope.set(expr.left.name, applyCompound(expr.op, cur, rhs));
      }
      if (expr.left.kind === 'MemberExpr') {
        const obj = evalExpr(expr.left.object, scope, ctx);
        const key = expr.left.computed
          ? String(evalExpr(expr.left.property, scope, ctx))
          : String((expr.left.property as { kind: 'Literal'; value: unknown }).value);
        const cur = expr.op === '=' ? undefined : readSafeProp(obj, key);
        return writeSafeProp(obj, key, applyCompound(expr.op, cur, rhs));
      }
      throw new SyntaxError('Invalid left-hand side in assignment');
    }

    case 'MemberExpr': {
      const obj = evalExpr(expr.object, scope, ctx);
      if (expr.optional && (obj === null || obj === undefined)) {
        return undefined;
      }
      const key = expr.computed
        ? String(evalExpr(expr.property, scope, ctx))
        : String((expr.property as { kind: 'Literal'; value: unknown }).value);
      return readSafeProp(obj, key);
    }

    case 'CallExpr': {
      const args = evalArgs(expr.args, scope, ctx);
      if (expr.callee.kind === 'MemberExpr') {
        const targetObj = evalExpr(expr.callee.object, scope, ctx);
        if ((expr.optional || expr.callee.optional) && (targetObj === null || targetObj === undefined)) {
          return undefined;
        }
        const key = expr.callee.computed
          ? String(evalExpr(expr.callee.property, scope, ctx))
          : String((expr.callee.property as { kind: 'Literal'; value: unknown }).value);
        const method = readSafeProp(targetObj, key);
        if (typeof method !== 'function') {
          throw new TypeError(`'${key}' is not a function`);
        }
        return Reflect.apply(method, targetObj, args);
      }

      const fn = evalExpr(expr.callee, scope, ctx);
      if (expr.optional && (fn === null || fn === undefined)) {
        return undefined;
      }
      if (typeof fn !== 'function') {
        throw new TypeError('Callee is not a function');
      }
      return Reflect.apply(fn, undefined, args);
    }

    case 'NewExpr': {
      const ctor = evalExpr(expr.callee, scope, ctx);
      const args = evalArgs(expr.args, scope, ctx);
      if (ctor === Set) {
        return new Set(args[0] as Iterable<unknown> | undefined);
      }
      if (ctor === Map) {
        return new Map(args[0] as Iterable<readonly [unknown, unknown]> | undefined);
      }
      if (ctor === Array) {
        return new Array(...args);
      }
      throw new TypeError('Constructor is not permitted in sandbox (allowed: Set, Map, Array)');
    }
  }
}

/**
 * Compiles user JS code purely via AST parsing (zero eval / zero new Function)
 * and returns an isolated callable wrapper with deterministic step budget.
 */
export function compileSafeSandboxFunction(
  sourceCode: string,
  expectedFnName: string,
  maxSteps: number = 80_000,
): (...args: unknown[]) => unknown {
  const tokens = tokenizeJs(sourceCode);
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();

  const globalScope = createSafeGlobalScope();
  const topScope = new Scope(globalScope);
  const bootCtx: ExecContext = { steps: 0, maxSteps };
  evalStmts(ast, topScope, bootCtx);

  if (!topScope.has(expectedFnName)) {
    throw new Error(`Expected function '${expectedFnName}' to be defined.`);
  }
  const target = topScope.get(expectedFnName);
  if (typeof target !== 'function') {
    throw new Error(`Expected '${expectedFnName}' to be a function.`);
  }

  return (...args: unknown[]): unknown => {
    // Reset step counter per test case invocation so each test case gets a clean budget
    bootCtx.steps = 0;
    return (target as (...fnArgs: unknown[]) => unknown)(...args);
  };
}
