function createDrawing() {
  return { strokes: [] };
}

function startStroke(drawing, { color, size }) {
  const stroke = { color, size, points: [] };
  drawing.strokes.push(stroke);
  return stroke;
}

function addPoint(stroke, x, y) {
  stroke.points.push({ x, y });
}

function undo(drawing) {
  return drawing.strokes.pop();
}

function renderDrawing(drawing, ctx) {
  for (const stroke of drawing.strokes) {
    if (stroke.points.length === 0) continue;

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
}

function serializeDrawing(drawing) {
  return JSON.stringify(drawing);
}

function deserializeDrawing(json) {
  let drawing;
  try {
    drawing = JSON.parse(json);
  } catch (e) {
    throw new TypeError('Invalid JSON');
  }

  if (!drawing || !Array.isArray(drawing.strokes)) {
    throw new TypeError('Drawing must contain a strokes array');
  }

  return drawing;
}

const SketchCanvas = {
  createDrawing,
  startStroke,
  addPoint,
  undo,
  renderDrawing,
  serializeDrawing,
  deserializeDrawing
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SketchCanvas;
} else {
  globalThis.SketchCanvas = SketchCanvas;
}
