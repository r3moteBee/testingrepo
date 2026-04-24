/**
 * app.js — Safe expression parser, evaluator, and Canvas graph renderer.
 *
 * Implements a recursive-descent parser (no eval) that builds an AST
 * and evaluates it for given x values.
 */

/* ===================================================================
   SECTION 1 — Expression Tokenizer
   =================================================================== */

/**
 * Token types used by the parser.
 */
const TokenType = Object.freeze({
  NUMBER:       'NUMBER',
  OP:           'OP',       // + - * / ^
  LPAREN:       'LPAREN',    // (
  RPAREN:       'RPAREN',    // )
  VARIABLE:     'VARIABLE',  // x
  FUNCTION:     'FUNCTION',  // sin, cos, ...
});

/** All recognised function names (lowercase keys → Math fn or shim).
 *  Used both for token classification and evaluation.
 */
const KNOWN_FUNCTIONS = Object.freeze([
  'sin', 'cos', 'tan',
  'asin', 'acos', 'atan',
  'log', 'ln', 'exp',
  'sqrt', 'abs',
  'floor', 'ceil', 'round',
]);

/**
 * Tokenise a raw expression string into an array of tokens.
 * @param {string} expr
 * @returns {{type:string, value:string}[]}
 */
function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];

    // Skip whitespace
    if (ch === ' ' || ch === '\t') { i++; continue; }

    // Operators and parens
    if ('+-*/^()'.includes(ch)) {
      tokens.push({ type: ch === '(' ? TokenType.LPAREN : ch === ')' ? TokenType.RPAREN : TokenType.OP, value: ch });
      i++;
      continue;
    }

    // Digits (possibly with decimal)
    if (ch >= '0' && ch <= '9') {
      let num = '';
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
        num += expr[i++];
      }
      tokens.push({ type: TokenType.NUMBER, value: num });
      continue;
    }

    // Letters (variable or function)
    if (/[a-zA-Z]/.test(ch)) {
      let word = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        word += expr[i++].toLowerCase();
      }
      if (KNOWN_FUNCTIONS.includes(word)) {
        tokens.push({ type: TokenType.FUNCTION, value: word });
      } else if (word === 'x') {
        tokens.push({ type: TokenType.VARIABLE, value: word });
      } else {
        throw new SyntaxError(`Unknown identifier: "${word}"`);
      }
      continue;
    }

    throw new SyntaxError(`Unexpected character: "${ch}"`);
  }
  return tokens;
}

/* ===================================================================
   SECTION 2 — AST Node classes (recursive-descent parser)
   =================================================================== */

/** Base class for AST nodes. */
class Node {
  /** @returns {{type:string}} */
  get nodeType() { return 'Node'; }
}

/** A literal number. */
class NumNode extends Node {
  constructor(value) { super(); this.value = value; }
  get nodeType() { return 'Number'; }
}

/** Binary operation. */
class BinOpNode extends Node {
  constructor(op, left, right) { super(); this.op = op; this.left = left; this.right = right; }
  get nodeType() { return 'BinaryOp'; }
}

/** Unary minus. */
class NegNode extends Node {
  constructor(child) { super(); this.child = child; }
  get nodeType() { return 'UnaryMinus'; }
}

/** Function call. */
class FuncNode extends Node {
  constructor(name, arg) { super(); this.name = name; this.arg = arg; }
  get nodeType() { return 'Function'; }
}

/** Variable x. */
class VarNode extends Node {
  constructor() { super(); }
  get nodeType() { return 'Variable'; }
}

/* ===================================================================
   SECTION 3 — Parser (recursive descent)
   Grammar:
     expr    → term (( '+' | '-' ) term)*
     term    → unary (('*' | '/' | '^') unary)*
     unary   → ('-')* primary
     primary → NUMBER | 'x' | FUNC '(' expr ')' | '(' expr ')'
   =================================================================== */

function parse(expr) {
  const tokens = tokenize(expr);
  let pos = 0;

  function peek() { return tokens[pos] || null; }
  function consume(type) {
    const tok = peek();
    if (!tok || (type && tok.type !== type)) {
      throw new SyntaxError(`Expected ${type || 'token'} but got "${tok ? tok.value : 'end of expression'}"`);
    }
    pos++;
    return tok;
  }

  /** expr → term (( '+' | '-' ) term)* */
  function parseExpr() {
    let node = parseTerm();
    while (peek() && peek().type === TokenType.OP && '+-'.includes(peek().value)) {
      const op = consume(TokenType.OP).value;
      const right = parseTerm();
      node = new BinOpNode(op, node, right);
    }
    return node;
  }

  /** term → unary (('*' | '/' | '^') unary)* */
  function parseTerm() {
    let node = parseUnary();
    while (peek() && peek().type === TokenType.OP && '*/^'.includes(peek().value)) {
      const op = consume(TokenType.OP).value;
      const right = parseUnary();
      node = new BinOpNode(op, node, right);
    }
    return node;
  }

  /** unary → ('-')* primary */
  function parseUnary() {
    if (peek() && peek().type === TokenType.OP && peek().value === '-') {
      consume(TokenType.OP);
      const child = parseUnary();
      return new NegNode(child);
    }
    return parsePrimary();
  }

  /** primary → NUMBER | 'x' | FUNC '(' expr ')' | '(' expr ')' */
  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new SyntaxError('Unexpected end of expression');

    // Number literal
    if (tok.type === TokenType.NUMBER) {
      consume(TokenType.NUMBER);
      return new NumNode(parseFloat(tok.value));
    }

    // Variable x
    if (tok.type === TokenType.VARIABLE) {
      consume(TokenType.VARIABLE);
      return new VarNode();
    }

    // Parenthesised expression
    if (tok.type === TokenType.LPAREN) {
      consume(TokenType.LPAREN);
      const node = parseExpr();
      consume(TokenType.RPAREN);
      return node;
    }

    // Function call
    if (tok.type === TokenType.FUNCTION) {
      const name = consume(TokenType.FUNCTION).value;
      consume(TokenType.LPAREN);
      const arg = parseExpr();
      consume(TokenType.RPAREN);
      return new FuncNode(name, arg);
    }

    throw new SyntaxError(`Unexpected token: "${tok.value}"`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) {
    throw new SyntaxError(`Unexpected token after expression: "${tokens[pos].value}"`);
  }
  return ast;
}

/* ===================================================================
   SECTION 4 — Evaluator (walk the AST)
   =================================================================== */

/**
 * Evaluate an AST node for a given x value.
 * @param {Node} ast
 * @param {number} xVal
 * @returns {number}
 */
function evaluate(ast, xVal) {
  switch (ast.nodeType) {
    case 'Number':
      return ast.value;

    case 'Variable':
      return xVal;

    case 'UnaryMinus':
      return -evaluate(ast.child, xVal);

    case 'BinaryOp': {
      const left = evaluate(ast.left, xVal);
      const right = evaluate(ast.right, xVal);
      switch (ast.op) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': {
          if (right === 0) throw new Error('Division by zero');
          return left / right;
        }
        case '^': {
          // Handle fractional exponents carefully
          if (left < 0 && !Number.isInteger(right)) {
            throw new Error('Negative base with non-integer exponent');
          }
          return Math.pow(left, right);
        }
        default: throw new Error(`Unknown operator: ${ast.op}`);
      }
    }

    case 'Function': {
      const v = evaluate(ast.arg, xVal);
      switch (ast.name) {
        case 'sin':   return Math.sin(v);
        case 'cos':   return Math.cos(v);
        case 'tan':   return Math.tan(v);
        case 'asin':  {
          if (v < -1 || v > 1) throw new Error('asin domain error');
          return Math.asin(v);
        }
        case 'acos': {
          if (v < -1 || v > 1) throw new Error('acos domain error');
          return Math.acos(v);
        }
        case 'atan':  return Math.atan(v);
        case 'log':   {
          if (v <= 0) throw new Error('log domain error');
          return Math.log10(v);
        }
        case 'ln': {
          if (v <= 0) throw new Error('ln domain error');
          return Math.log(v);
        }
        case 'exp':   return Math.exp(v);
        case 'sqrt': {
          if (v < 0) throw new Error('sqrt domain error');
          return Math.sqrt(v);
        }
        case 'abs':   return Math.abs(v);
        case 'floor': return Math.floor(v);
        case 'ceil':  return Math.ceil(v);
        case 'round': return Math.round(v);
        default: throw new Error(`Unknown function: ${ast.name}`);
      }
    }

    default:
      throw new Error(`Unknown node type: ${ast.nodeType}`);
  }
}

/* ===================================================================
   SECTION 5 — Calculator (simple UI logic)
   =================================================================== */

let calcExpression = '';
const displayEl = document.getElementById('calc-display');

function updateDisplay() {
  displayEl.value = calcExpression || '0';
}

function appendCalc(ch) {
  if (calcExpression === '0' && ch !== '.') calcExpression = '';
  calcExpression += ch;
  updateDisplay();
}

function clearCalc() {
  calcExpression = '';
  updateDisplay();
}

function calculate() {
  try {
    const ast = parse(calcExpression);
    // Evaluate with x=0 (calculator mode — no variable)
    const result = evaluate(ast, 0);
    calcExpression = String(Number.isFinite(result) ? parseFloat(result.toFixed(10)) : 'Error');
    updateDisplay();
  } catch (e) {
    calcExpression = 'Error';
    updateDisplay();
  }
}

/* ===================================================================
   SECTION 6 — Graph Rendering (Canvas)
   =================================================================== */

const canvas = document.getElementById('graph-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('graph-status');

/** Clear the canvas. */
function clearCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Draw axes and grid on the Canvas.
 */
function drawAxes(xMin, xMax) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const padding = 40; // left/right/bottom
  const plotW = w - 2 * padding;
  const plotH = h - padding; // top label space

  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;

  // Grid lines (nice round numbers)
  const xRange = xMax - xMin;
  let step = niceStep(xRange / 10);

  // Vertical grid lines (x)
  let xStart = Math.ceil(xMin / step) * step;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#999';
  while (xStart <= xMax) {
    const px = padding + ((xStart - xMin) / (xMax - xMin)) * plotW;
    ctx.beginPath();
    ctx.moveTo(px, padding);
    ctx.lineTo(px, h - padding);
    ctx.stroke();
    // Label
    const label = formatNumber(xStart);
    ctx.fillText(label, px - ctx.measureText(label).width / 2, h - padding + 14);
    xStart += step;
  }

  // Horizontal lines — we'll compute y-range from the function later.
  return { padding, plotW, plotH };
}

/** Compute a nice step for grid spacing. */
function niceStep(rough) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let nice;
  if (norm <= 1.5)      nice = 1;
  else if (norm <= 3.5) nice = 2;
  else if (norm <= 7.5) nice = 5;
  else                  nice = 10;
  return nice * pow;
}

/** Format a number for label display. */
function formatNumber(n) {
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)) {
    return n.toExponential(1);
  }
  const s = parseFloat(n.toPrecision(6));
  return String(s);
}

/**
 * Main graph rendering function.
 */
function renderGraph() {
  clearCanvas();
  statusEl.textContent = '';
  statusEl.className = 'status-msg';

  const funcStr = document.getElementById('func-input').value.trim();
  if (!funcStr) {
    setStatus('Enter a function like: x^2, sin(x), cos(x)', 'error');
    drawPlaceholder();
    return;
  }

  let xMin = parseFloat(document.getElementById('x-min').value);
  let xMax = parseFloat(document.getElementById('x-max').value);
  const samples = parseInt(document.getElementById('samples').value, 10) || 400;

  if (isNaN(xMin) || isNaN(xMax)) {
    setStatus('Invalid x-range. Use numbers.', 'error');
    return;
  }
  if (xMin >= xMax) {
    setStatus('x-min must be less than x-max.', 'error');
    return;
  }

  // Parse the expression.
  let ast;
  try {
    ast = parse(funcStr);
  } catch (e) {
    setStatus(`Parse error: ${e.message}`, 'error');
    return;
  }

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const padding = 40;
  const plotW = w - 2 * padding;
  const plotH = h - padding;

  // Evaluate the function at sample points to determine y-range.
  const points = [];
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i <= samples; i++) {
    const xVal = xMin + (i / samples) * (xMax - xMin);
    try {
      const yVal = evaluate(ast, xVal);
      if (Number.isFinite(yVal)) {
        points.push({ x: xVal, y: yVal });
        if (yVal < yMin) yMin = yVal;
        if (yVal > yMax) yMax = yVal;
      }
    } catch {
      // Skip points that cause domain errors
    }
  }

  if (points.length === 0) {
    setStatus('No valid y-values for the given x-range.', 'error');
    return;
  }

  // Add padding to y-range so the curve doesn't touch edges.
  let yRange = yMax - yMin;
  if (yRange === 0) yRange = 2;
  const yPad = yRange * 0.1;
  yMin -= yPad;
  yMax += yPad;

  // Map x → pixel coordinate.
  const toPx = (x) => padding + ((x - xMin) / (xMax - xMin)) * plotW;
  // Map y → pixel coordinate (inverted: canvas y goes down).
  const toPy = (y) => padding + ((1 - (y - yMin) / (yMax - yMin))) * plotH;

  // ---- Draw grid & axes ----
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;

  // Vertical grid lines
  const xStep = niceStep((xMax - xMin) / 10);
  let xLabelStart = Math.ceil(xMin / xStep) * xStep;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#999';
  while (xLabelStart <= xMax) {
    const px = toPx(xLabelStart);
    ctx.beginPath();
    ctx.moveTo(px, padding);
    ctx.lineTo(px, h - padding);
    ctx.stroke();
    const label = formatNumber(xLabelStart);
    ctx.fillText(label, px - ctx.measureText(label).width / 2, h - padding + 14);
    xLabelStart += xStep;
  }

  // Horizontal grid lines
  const yStep = niceStep((yMax - yMin) / 8);
  let yLabelStart = Math.ceil(yMin / yStep) * yStep;
  while (yLabelStart <= yMax) {
    const py = toPy(yLabelStart);
    ctx.beginPath();
    ctx.moveTo(padding, py);
    ctx.lineTo(w - padding, py);
    ctx.stroke();
    const label = formatNumber(yLabelStart);
    ctx.fillText(label, 4, py + 3);
    yLabelStart += yStep;
  }

  // Draw x-axis (y=0) if visible.
  const yZero = toPy(0);
  if (yZero >= padding && yZero <= h - padding) {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, yZero);
    ctx.lineTo(w - padding, yZero);
    ctx.stroke();
  }

  // Draw y-axis (x=0) if visible.
  const xZero = toPx(0);
  if (xZero >= padding && xZero <= w - padding) {
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xZero, padding);
    ctx.lineTo(xZero, h - padding);
    ctx.stroke();
  }

  // ---- Draw the function curve ----
  ctx.strokeStyle = '#1a73e8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  let started = false;
  for (const pt of points) {
    const px = toPx(pt.x);
    const py = toPy(pt.y);
    if (py < 0 || py > h) {
      // Off-screen — break the path to avoid drawing near vertical asymptotes.
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();

  // ---- Draw the function label on canvas ----
  ctx.fillStyle = '#1a73e8';
  ctx.font = 'bold 13px sans-serif';
  const labelX = padding + 8;
  const labelY = padding + 16;
  ctx.fillText(`f(x) = ${funcStr}`, labelX, labelY);

  setStatus('Graph rendered successfully.', 'success');
}

/** Draw a placeholder when no function is entered. */
function drawPlaceholder() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.fillStyle = '#aaa';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Enter an expression and click Plot', w / 2, h / 2);
  ctx.textAlign = 'start';
}

/** Show a status message. */
function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status-msg' + (type ? ` ${type}` : '');
}

/* ===================================================================
   SECTION 7 — Self-Check (validate sample functions)
   =================================================================== */

/**
 * Run a few self-checks to ensure the parser and evaluator work correctly.
 */
function runSelfCheck() {
  const checks = [
    { expr: 'x^2', x: 3, expected: 9 },
    { expr: 'x^2', x: -3, expected: 9 },
    { expr: 'sin(x)', x: Math.PI / 2, expected: 1 },
    { expr: 'cos(x)', x: 0, expected: 1 },
    { expr: 'sqrt(abs(x))', x: -4, expected: 2 },
    { expr: 'x^3 - 2*x + 1', x: 2, expected: 5 },
    { expr: 'sin(x) + cos(x)', x: 0, expected: 1 },
    { expr: 'exp(-x^2)', x: 0, expected: 1 },
    { expr: 'floor(x) + ceil(-x)', x: 2.7, expected: 3 },
    { expr: 'abs(x-1)', x: 0.5, expected: 0.5 },
  ];

  let passed = 0;
  for (const check of checks) {
    try {
      const ast = parse(check.expr);
      const result = evaluate(ast, check.x);
      const ok = Math.abs(result - check.expected) < 1e-9;
      if (ok) {
        passed++;
      } else {
        console.warn(`Self-check FAIL: "${check.expr}" at x=${check.x}: got ${result}, expected ${check.expected}`);
      }
    } catch (e) {
      console.warn(`Self-check ERROR: "${check.expr}" — ${e.message}`);
    }
  }

  console.log(`[Self-Check] ${passed}/${checks.length} passed.`);
  if (passed === checks.length) {
    console.log('[Self-Check] All sample functions produced expected curves ✓');
  }
}

/* ===================================================================
   SECTION 8 — Initialisation
   =================================================================== */

runSelfCheck();
drawPlaceholder();