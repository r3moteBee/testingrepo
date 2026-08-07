/**
 * DOM wiring and event handlers for the Sketch PWA
 */

importScripts('canvas.js');
importScripts('storage.js');

// Canvas state
let strokes = [];
let isDrawing = false;
let currentColor = '#000000';
let currentSize = 3;

// DOM elements
let canvas, ctx;
let drawingNameInput;
let saveButton, clearButton, undoButton;
let drawingsList;

/**
 * Initialize the app
 */
async function init() {
  // Wait for DOM to be ready if running in browser
  if (typeof document !== 'undefined') {
    await new Promise((resolve) => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve);
      }
    });
  }

  // Initialize IndexedDB
  await initDB();

  if (typeof document !== 'undefined') {
    setupDOM();
    loadLatestDrawing();
    renderDrawingsList();
  }
}

/**
 * Set up DOM elements and event listeners
 */
function setupDOM() {
  canvas = document.getElementById('sketchCanvas');
  ctx = canvas.getContext('2d');
  
  if (!canvas || !ctx) return;

  // Set canvas size
  resizeCanvas();
  
  drawingNameInput = document.getElementById('drawingName');
  saveButton = document.getElementById('saveButton');
  clearButton = document.getElementById('clearButton');
  undoButton = document.getElementById('undoButton');
  
  // Color picker
  const colorPicker = document.getElementById('colorPicker');
  
  // Brush size slider
  const brushSizeSlider = document.getElementById('brushSize');

  // Canvas event listeners (pointer events for mouse/touch)
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  // Toolbar controls
  saveButton?.addEventListener('click', saveDrawing);
  clearButton?.addEventListener('click', () => {
    strokes = [];
    renderCanvas();
  });
  undoButton?.addEventListener('click', () => {
    strokes = undo(strokes);
    renderCanvas();
  });
  
  colorPicker?.addEventListener('input', (e) => {
    currentColor = e.target.value;
  });
  
  brushSizeSlider?.addEventListener('input', (e) => {
    currentSize = parseInt(e.target.value, 10);
  });
  
  // Window resize
  window.addEventListener('resize', () => {
    resizeCanvas();
    renderCanvas();
  });
  
  // Drawing name input
  drawingNameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveDrawing();
  });
}

/**
 * Resize canvas to fit container
 */
function resizeCanvas() {
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  ctx.scale(dpr, dpr);
}

/**
 * Handle pointer down event (start drawing)
 */
function handlePointerDown(e) {
  isDrawing = true;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  strokes = startNewStroke(strokes, currentColor, currentSize);
  strokes = addPoint(strokes, x, y, currentColor, currentSize);
  
  renderCanvas();
}

/**
 * Handle pointer move event (drawing)
 */
function handlePointerMove(e) {
  if (!isDrawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  strokes = addPoint(strokes, x, y, currentColor, currentSize);
  renderCanvas();
}

/**
 * Handle pointer up event (stop drawing)
 */
function handlePointerUp() {
  if (!isDrawing) return;
  
  isDrawing = false;
  strokes = endStroke(strokes);
}

/**
 * Render all strokes to canvas
 */
function renderCanvas() {
  if (!canvas || !ctx) return;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  renderStrokes(strokes, ctx);
}

/**
 * Save the current drawing
 */
async function saveDrawing() {
  const name = drawingNameInput?.value || 'Untitled Drawing';
  
  if (strokes.length === 0 && !name) {
    alert('Please draw something or enter a name');
    return;
  }

  try {
    // Check if we're updating an existing drawing
    const savedDrawings = await listDrawings();
    const currentDrawingId = canvas.dataset.drawingId ? parseInt(canvas.dataset.drawingId, 10) : null;
    
    if (currentDrawingId && savedDrawings.some(d => d.id === currentDrawingId)) {
      // Update existing
      await updateDrawing(currentDrawingId, { name, strokes });
    } else {
      // Create new
      const id = await createDrawing({ name, strokes });
      canvas.dataset.drawingId = id;
    }
    
    alert('Drawing saved!');
    renderDrawingsList();
  } catch (error) {
    console.error('Failed to save drawing:', error);
    alert('Failed to save drawing: ' + error.message);
  }
}

/**
 * Load a drawing by ID
 */
async function loadDrawing(id) {
  try {
    const drawing = await getDrawing(id);
    
    if (!drawing) return;
    
    strokes = deserializeDrawing(JSON.stringify(drawing.strokes));
    drawingNameInput.value = drawing.name;
    canvas.dataset.drawingId = id;
    
    renderCanvas();
  } catch (error) {
    console.error('Failed to load drawing:', error);
    alert('Failed to load drawing: ' + error.message);
  }
}

/**
 * Rename a drawing
 */
async function renameDrawing(id, newName) {
  try {
    await updateDrawing(id, { name: newName });
    alert('Drawing renamed!');
    renderDrawingsList();
  } catch (error) {
    console.error('Failed to rename drawing:', error);
    alert('Failed to rename drawing: ' + error.message);
  }
}

/**
 * Delete a drawing
 */
async function deleteDrawing(id, element) {
  if (!confirm('Are you sure you want to delete this drawing?')) return;
  
  try {
    await deleteDrawing(id);
    
    // Remove from DOM
    const listItem = element.closest('.drawing-item');
    if (listItem) {
      listItem.remove();
    }
    
    // If current drawing was deleted, clear canvas
    if (canvas.dataset.drawingId == id) {
      strokes = [];
      drawingNameInput.value = '';
      delete canvas.dataset.drawingId;
      renderCanvas();
    }
    
    alert('Drawing deleted!');
  } catch (error) {
    console.error('Failed to delete drawing:', error);
    alert('Failed to delete drawing: ' + error.message);
  }
}

/**
 * Render the drawings list
 */
async function renderDrawingsList() {
  const container = document.getElementById('drawingsList');
  
  if (!container) return;
  
  try {
    const drawings = await listDrawings();
    
    container.innerHTML = '';
    
    if (drawings.length === 0) {
      container.innerHTML = '<p class="no-drawings">No drawings yet. Start drawing!</p>';
      return;
    }
    
    // Sort by most recent first
    const sortedDrawings = [...drawings].sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    sortedDrawings.forEach(drawing => {
      const item = document.createElement('div');
      item.className = 'drawing-item';
      
      // Format date
      const dateStr = new Date(drawing.updatedAt).toLocaleString();
      
      item.innerHTML = `
        <div class="drawing-info">
          <strong>${escapeHtml(drawing.name)}</strong>
          <small>${dateStr}</small>
        </div>
        <div class="drawing-actions">
          <button class="btn-load" data-id="${drawing.id}">Load</button>
          <input type="text" class="input-rename" placeholder="New name" data-id="${drawing.id}">
          <button class="btn-save-rename" data-id="${drawing.id}">Rename</button>
          <button class="btn-delete" data-id="${drawing.id}">Delete</button>
        </div>
      `;
      
      container.appendChild(item);
    });
    
    // Add event listeners
    container.querySelectorAll('.btn-load').forEach(btn => {
      btn.addEventListener('click', () => loadDrawing(parseInt(btn.dataset.id, 10)));
    });
    
    container.querySelectorAll('.btn-save-rename').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.closest('.drawing-actions').querySelector('.input-rename');
        const newName = input.value.trim();
        
        if (newName) {
          renameDrawing(parseInt(btn.dataset.id, 10), newName);
        }
      });
    });
    
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => deleteDrawing(parseInt(btn.dataset.id, 10), e.target));
    });
    
  } catch (error) {
    console.error('Failed to render drawings list:', error);
  }
}

/**
 * Load the most recent drawing
 */
async function loadLatestDrawing() {
  try {
    const drawings = await listDrawings();
    
    if (drawings.length > 0) {
      // Sort by most recent
      const sorted = [...drawings].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      
      await loadDrawing(sorted[0].id);
    }
  } catch (error) {
    console.error('Failed to load latest drawing:', error);
  }
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    init,
    setupDOM,
    resizeCanvas,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    renderCanvas,
    saveDrawing,
    loadDrawing,
    renameDrawing,
    deleteDrawing,
    renderDrawingsList
  };
}

// Initialize when module loads (in browser context)
if (typeof document !== 'undefined') {
  init();
}
