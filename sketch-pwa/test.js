require('fake-indexeddb/auto');
const assert = require('node:assert/strict');
const SketchCanvas = require('./canvas.js');
const SketchStorage = require('./storage.js');

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
assert.throws(() => SketchCanvas.deserializeDrawing('{\"notStrokes\": []}'), { name: 'TypeError', message: 'Drawing must contain a strokes array' });
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

async function runStorageTests() {
  // Test createDrawing resolves an id
  const d1 = await SketchStorage.createDrawing({ name: 'Drawing 1', strokes: [] });
  assert.ok(typeof d1 === 'number');

  // Test getDrawing returns the stored record with name/strokes/createdAt/updatedAt
  const retrieved1 = await SketchStorage.getDrawing(d1);
  assert.strictEqual(retrieved1.name, 'Drawing 1');
  assert.deepEqual(retrieved1.strokes, []);
  assert.ok(retrieved1.createdAt);
  assert.ok(retrieved1.updatedAt);

  // Test create a second drawing and listDrawings returns both as {id, name, updatedAt} objects WITHOUT a strokes property
  const d2 = await SketchStorage.createDrawing({ name: 'Drawing 2', strokes: [{ color: 'red', size: 1, points: [] }] });
  const list = await SketchStorage.listDrawings();
  assert.strictEqual(list.length, 2);
  for (const item of list) {
    assert.ok(item.id !== undefined);
    assert.ok(item.name !== undefined);
    assert.ok(item.updatedAt !== undefined);
    assert.strictEqual(item.strokes, undefined);
  }

  // Test updateDrawing renames one and getDrawing shows the new name with updatedAt >= the old value
  const oldUpdatedAt = retrieved1.updatedAt;
  // Small delay to ensure updatedAt changes
  await new Promise(r => setTimeout(r, 10));
  await SketchStorage.updateDrawing(d1, { name: 'Updated Name' });
  const updated1 = await SketchStorage.getDrawing(d1);
  assert.strictEqual(updated1.name, 'Updated Name');
  assert.ok(updated1.updatedAt >= oldUpdatedAt);

  // Test updateDrawing on a missing id rejects
  await assert.rejects(
    async () => {
      await SketchStorage.updateDrawing(99999, { name: 'Missing' });
    },
    { message: 'Drawing not found' }
  );

  // Test deleteDrawing removes one and listDrawings shrinks by one
  await SketchStorage.deleteDrawing(d1);
  const listAfterDelete = await SketchStorage.listDrawings();
  assert.strictEqual(listAfterDelete.length, 1);
}

// Execute storage tests
runStorageTests().then(() => {
  console.log("OK");
}).catch(err => {
  console.error('Storage tests failed:', err);
  process.exit(1);
});
