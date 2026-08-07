/**
 * Pure drawing engine logic for the Sketch PWA.
 * Separated from DOM where feasible for testability.
 */

/**
 * Represents a single point in a stroke
 * @typedef {{x: number, y: number}} Point
 */

/**
 * Represents a stroke (collection of points with shared properties)
 * @typedef {{points: Point[], color: string, size: number}} Stroke
 */

/**
 * Creates a new empty strokes array
 * @returns {Stroke[]}
 */
export function createStrokes() {
  return [];
}

/**
 * Adds a point to the current stroke
 * @param {Stroke[]} strokes - Array of strokes
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} color - Color string
 * @param {number} size - Brush size
 * @returns {Stroke[]} New strokes array with updated current stroke
 */
export function addPoint(strokes, x, y, color, size) {
  const newStrokes = [...strokes];
  if (newStrokes.length === 0) {
    newStrokes.push({ points: [{ x, y }], color, size });
  } else {
    const lastStroke = newStrokes[newStrokes.length - 1];
    // Only add if point is different (avoid duplicates)
    const lastPoint = lastStroke.points[lastStroke.points.length - 1];
    if (!lastPoint || lastPoint.x !== x || lastPoint.y !== y) {
      newStrokes[newStrokes.length - 1] = {
        ...lastStroke,
        points: [...lastStroke.points, { x, y }]
      };
    }
  }
  return newStrokes;
}

/**
 * Starts a new stroke
 * @param {Stroke[]} strokes - Array of strokes
 * @param {string} color - Color string
 * @param {number} size - Brush size
 * @returns {Stroke[]} New strokes array with empty stroke added
 */
export function startNewStroke(strokes, color, size) {
  return [...strokes, { points: [], color, size }];
}

/**
 * Ends the current stroke (adds a point to close it if needed)
 * @param {Stroke[]} strokes - Array of strokes
 * @returns {Stroke[]} New strokes array with completed stroke
 */
export function endStroke(strokes) {
  const newStrokes = [...strokes];
  if (newStrokes.length > 0) {
    const lastStroke = newStrokes[newStrokes.length - 1];
    if (lastStroke.points.length === 0) {
      // Remove empty stroke
      return newStrokes.slice(0, -1);
    }
  }
  return newStrokes;
}

/**
 * Undo: removes the last stroke
 * @param {Stroke[]} strokes - Array of strokes
 * @returns {Stroke[]} New strokes array with last stroke removed
 */
export function undo(strokes) {
  if (strokes.length === 0) return strokes;
  return strokes.slice(0, -1);
}

/**
 * Renders all strokes to a canvas context
 * @param {Stroke[]} strokes - Array of strokes to render
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
export function renderStrokes(strokes, ctx) {
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const [firstPoint, ...points] = stroke.points;
    ctx.moveTo(firstPoint.x, firstPoint.y);
    
    for (const point of points) {
      ctx.lineTo(point.x, point.y);
    }
    
    ctx.stroke();
  }
}

/**
 * Serializes strokes array to JSON string
 * @param {Stroke[]} strokes - Array of strokes
 * @returns {string} JSON string representation
 */
export function serializeDrawing(strokes) {
  return JSON.stringify(strokes);
}

/**
 * Deserializes JSON string to strokes array
 * @param {string} json - JSON string representation
 * @returns {Stroke[]} Array of strokes
 */
export function deserializeDrawing(json) {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    // Validate structure
    for (const stroke of parsed) {
      if (!stroke || !Array.isArray(stroke.points)) return [];
    }
    return parsed;
  } catch (e) {
    return [];
  }
}

/**
 * Clears all strokes
 * @param {Stroke[]} strokes - Array of strokes
 * @returns {Stroke[]} Empty array
 */
export function clearStrokes(strokes) {
  return [];
}

// CommonJS compatibility for Node.js require()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createStrokes,
    addPoint,
    startNewStroke,
    endStroke,
    undo,
    renderStrokes,
    serializeDrawing,
    deserializeDrawing,
    clearStrokes
  };
}