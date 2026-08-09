const assert = require('node:assert/strict');
const SketchCanvas = require('./canvas.js');

// Test stroke recording
const drawing = SketchCanvas.createDrawing();
const stroke = SketchCanvas.startStroke(drawing, { color: 'red', size: 5 });
assert.strictEqual(drawing.strokes.length, 1);
assert.strictEqual(stroke.color, 'red');
assert.strictEqual(stroke.size, 5);
assert.deepEqual(stroke.points, []);

SketchCanvas.addPoint(stroke, 10, 20);
SketchCanvas.addPoint(stroke, 30, 40);
assert.deepEqual(stroke.points, [{ x: 10, y: 20 }, { x: 30, y: 40 }]);

// Test undo
const undoneStroke = SketchCanvas.undo(drawing);
assert.strictEqual(undoneStroke, stroke);
assert.strictEqual(drawing.strokes.length, 0);

const undefinedStroke = SketchCanvas.undo(drawing);
assert.strictEqual(undefinedStroke, undefined);

// Test serialize/deserialize round-trip
const drawing2 = SketchCanvas.createDrawing();
const stroke2 = SketchCanvas.startStroke(drawing2, { color: 'blue', size: 2 });
SketchCanvas.addPoint(stroke2, 100, 200);
const json = SketchCanvas.serializeDrawing(drawing2);
const deserialized = SketchCanvas.deserializeDrawing(json);
assert.deepEqual(drawing2, deserialized);

// Test deserializeDrawing throwing TypeError
assert.throws(() => SketchCanvas.deserializeDrawing('invalid json'), { name: 'TypeError', message: 'Invalid JSON' });
assert.throws(() => SketchCanvas.deserializeDrawing('{"notStrokes": []}'), { name: 'TypeError', message: 'Drawing must contain a strokes array' });
assert.throws(() => SketchCanvas.deserializeDrawing('null'), { name: 'TypeError', message: 'Drawing must contain a strokes array' });

// Test renderDrawing driving a stub ctx object
const ctxCalls = [];
const stubCtx = {
  strokeStyle: '',
  lineWidth: 0,
  lineCap: '',
  lineJoin: '',
  beginPath: () => ctxCalls.push('beginPath'),
  moveTo: (x, y) => {
    ctxCalls.push('moveTo');
    stubCtx._lastMove = { x, y };
  },
  lineTo: (x, y) => {
    ctxCalls.push('lineTo');
    stubCtx._lastLine = { x, y };
  },
  stroke: () => ctxCalls.push('stroke'),
  _lastMove: null,
  _lastLine: null
};

const renderDrawing2 = SketchCanvas.createDrawing();
const stroke3 = SketchCanvas.startStroke(renderDrawing2, { color: 'green', size: 10 });
SketchCanvas.addPoint(stroke3, 5, 5);
SketchCanvas.addPoint(stroke3, 15, 15);

SketchCanvas.renderDrawing(renderDrawing2, stubCtx);

assert.ok(ctxCalls.includes('beginPath'));
assert.ok(ctxCalls.includes('moveTo'));
assert.ok(ctxCalls.includes('lineTo'));
assert.ok(ctxCalls.includes('stroke'));
assert.strictEqual(stubCtx.strokeStyle, 'green');
assert.strictEqual(stubCtx.lineWidth, 10);
assert.strictEqual(stubCtx.lineCap, 'round');
assert.strictEqual(stubCtx.lineJoin, 'round');
assert.deepEqual(stubCtx._lastMove, { x: 5, y: 5 });
assert.deepEqual(stubCtx._lastLine, { x: 15, y: 15 });

console.log("OK");
