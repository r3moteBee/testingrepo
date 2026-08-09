(function() {
  document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const colorInput = document.getElementById('color');
    const sizeInput = document.getElementById('size');
    const undoBtn = document.getElementById('undo');
    const clearBtn = document.getElementById('clear');
    const saveBtn = document.getElementById('save');
    const drawingsList = document.getElementById('drawings');

    let drawing = SketchCanvas.createDrawing();
    let currentId = null;
    let currentStroke = null;

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      SketchCanvas.renderDrawing(drawing, ctx);
    }

    function getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    canvas.addEventListener('pointerdown', (e) => {
      const coords = getCanvasCoords(e);
      canvas.setPointerCapture(e.pointerId);
      currentStroke = SketchCanvas.startStroke(drawing, {
        color: colorInput.value,
        size: Number(sizeInput.value)
      });
      SketchCanvas.addPoint(currentStroke, coords.x, coords.y);
      redraw();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!currentStroke) return;
      const coords = getCanvasCoords(e);
      SketchCanvas.addPoint(currentStroke, coords.x, coords.y);
      redraw();
    });

    const endStroke = () => {
      currentStroke = null;
    };

    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    undoBtn.addEventListener('click', () => {
      SketchCanvas.undo(drawing);
      redraw();
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear drawing?')) {
        drawing = SketchCanvas.createDrawing();
        redraw();
      }
    });

    saveBtn.addEventListener('click', async () => {
      if (currentId === null) {
        const name = prompt('Name this drawing');
        if (name) {
          currentId = await SketchStorage.createDrawing({ name, strokes: drawing.strokes });
          await refreshList();
        }
      } else {
        await SketchStorage.updateDrawing(currentId, { strokes: drawing.strokes });
        await refreshList();
      }
    });

    async function refreshList() {
      const drawings = await SketchStorage.listDrawings();
      drawingsList.innerHTML = '';
      drawings.forEach(record => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = record.name;
        
        const controls = document.createElement('div');
        controls.className = 'drawing-controls';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.onclick = async () => {
          const record = await SketchStorage.getDrawing(record.id);
          drawing = { strokes: record.strokes };
          currentId = record.id;
          redraw();
        };

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.onclick = async () => {
          const newName = prompt('New name:', record.name);
          if (newName) {
            await SketchStorage.updateDrawing(record.id, { name: newName });
            await refreshList();
          }
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = async () => {
          if (confirm('Delete this drawing?')) {
            await SketchStorage.deleteDrawing(record.id);
            if (currentId === record.id) {
              currentId = null;
              drawing = SketchCanvas.createDrawing();
              redraw();
            }
            await refreshList();
          }
        };

        controls.appendChild(loadBtn);
        controls.appendChild(renameBtn);
        controls.appendChild(deleteBtn);
        li.appendChild(nameSpan);
        li.appendChild(controls);
        drawingsList.appendChild(li);
      });
    }

    await refreshList();
  });
})();
