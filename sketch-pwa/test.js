/**
 * Node-runnable tests for Sketch PWA
 * Tests canvas.js (pure functions) and storage.js (with fake-indexeddb)
 */

import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';

// Override indexedDB with fake IndexedDB BEFORE importing storage.js
import FakeIndexedDB from 'fake-indexeddb';
global.indexedDB = FakeIndexedDB;

// Now import the modules
import { serializeDrawing, deserializeDrawing, createStrokes, 
         addPoint, startNewStroke, endStroke, undo, clearStrokes } from './canvas.js';

// For storage tests, we need to re-import after setting up fake-indexeddb
let initDB, createDrawing, getDrawing, listDrawings, updateDrawing, deleteDrawing;

async function reloadStorage() {
  // Use dynamic import to get fresh module with fake indexedDB
  const storageModule = await import('./storage.js');
  initDB = storageModule.initDB;
  createDrawing = storageModule.createDrawing;
  getDrawing = storageModule.getDrawing;
  listDrawings = storageModule.listDrawings;
  updateDrawing = storageModule.updateDrawing;
  deleteDrawing = storageModule.deleteDrawing;
}

// Initial reload to set up with fake indexedDB
reloadStorage();

describe('Canvas JS - Pure Functions', () => {
  describe('createStrokes()', () => {
    it('should create an empty strokes array', () => {
      const result = createStrokes();
      assert(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });
  });

  describe('addPoint()', () => {
    it('should add a point to an empty strokes array', () => {
      const strokes = createStrokes();
      const result = addPoint(strokes, 100, 200, '#ff0000', 5);
      
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].points.length, 1);
      assert.strictEqual(result[0].points[0].x, 100);
      assert.strictEqual(result[0].points[0].y, 200);
      assert.strictEqual(result[0].color, '#ff0000');
      assert.strictEqual(result[0].size, 5);
    });

    it('should add a point to an existing stroke', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = addPoint(strokes, 150, 250, '#ff0000', 5);
      
      assert.strictEqual(strokes.length, 1);
      assert.strictEqual(strokes[0].points.length, 2);
      assert.strictEqual(strokes[0].points[1].x, 150);
      assert.strictEqual(strokes[0].points[1].y, 250);
    });

    it('should not add duplicate consecutive points', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5); // Same point
      
      assert.strictEqual(strokes.length, 1);
      assert.strictEqual(strokes[0].points.length, 1);
    });
  });

  describe('startNewStroke()', () => {
    it('should start a new empty stroke', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      
      strokes = startNewStroke(strokes, '#00ff00', 3);
      
      assert.strictEqual(strokes.length, 2);
      assert.strictEqual(strokes[1].points.length, 0);
      assert.strictEqual(strokes[1].color, '#00ff00');
      assert.strictEqual(strokes[1].size, 3);
    });
  });

  describe('endStroke()', () => {
    it('should return strokes unchanged if last stroke has points', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = endStroke(strokes);
      
      assert.strictEqual(strokes.length, 1);
    });

    it('should remove empty last stroke', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = startNewStroke(strokes, '#00ff00', 3); // Empty stroke
      
      assert.strictEqual(strokes.length, 2);
      
      strokes = endStroke(strokes);
      
      assert.strictEqual(strokes.length, 1); // Empty stroke removed
    });
  });

  describe('undo()', () => {
    it('should remove the last stroke', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = startNewStroke(strokes, '#00ff00', 3);
      strokes = addPoint(strokes, 150, 250, '#00ff00', 3);
      
      assert.strictEqual(strokes.length, 2);
      
      strokes = undo(strokes);
      
      assert.strictEqual(strokes.length, 1);
    });

    it('should not crash on empty strokes', () => {
      const strokes = createStrokes();
      const result = undo(strokes);
      
      assert.strictEqual(result.length, 0);
    });
  });

  describe('serializeDrawing() and deserializeDrawing()', () => {
    it('should round-trip serialize/deserialize strokes', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = startNewStroke(strokes, '#00ff00', 3);
      strokes = addPoint(strokes, 150, 250, '#00ff00', 3);
      
      const json = serializeDrawing(strokes);
      assert(typeof json === 'string');
      
      const restoredStrokes = deserializeDrawing(json);
      assert.strictEqual(restoredStrokes.length, strokes.length);
      
      // Check first stroke
      assert.strictEqual(restoredStrokes[0].points.length, 1);
      assert.strictEqual(restoredStrokes[0].points[0].x, 100);
      assert.strictEqual(restoredStrokes[0].points[0].y, 200);
      assert.strictEqual(restoredStrokes[0].color, '#ff0000');
      
      // Check second stroke
      assert.strictEqual(restoredStrokes[1].points.length, 1);
      assert.strictEqual(restoredStrokes[1].points[0].x, 150);
      assert.strictEqual(restoredStrokes[1].points[0].y, 250);
      assert.strictEqual(restoredStrokes[1].color, '#00ff00');
    });

    it('should return empty array for invalid JSON', () => {
      const result = deserializeDrawing('invalid json');
      assert(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });

    it('should return empty array for non-array JSON', () => {
      const result = deserializeDrawing(JSON.stringify({}));
      assert(Array.isArray(result));
      assert.strictEqual(result.length, 0);
    });
  });

  describe('clearStrokes()', () => {
    it('should clear all strokes', () => {
      let strokes = createStrokes();
      strokes = addPoint(strokes, 100, 200, '#ff0000', 5);
      strokes = addPoint(strokes, 150, 250, '#ff0000', 5);
      
      assert.strictEqual(strokes.length, 1);
      
      strokes = clearStrokes(strokes);
      
      assert.strictEqual(strokes.length, 0);
    });
  });
});

describe('Storage JS - IndexedDB CRUD', () => {
  const TEST_DB_NAME = 'TestSketchDB';
  
  before(async () => {
    // Clear any existing test database
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('SketchDB');
      request.onsuccess = resolve;
      request.onerror = () => resolve();
    });
    
    // Reload storage module to ensure it uses the fake indexedDB
    const storageModule = await import('./storage.js');
    initDB = storageModule.initDB;
    createDrawing = storageModule.createDrawing;
    getDrawing = storageModule.getDrawing;
    listDrawings = storageModule.listDrawings;
    updateDrawing = storageModule.updateDrawing;
    deleteDrawing = storageModule.deleteDrawing;
  });

  after(async () => {
    // Cleanup - delete the test database
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('SketchDB');
      request.onsuccess = resolve;
      request.onerror = () => resolve();
    });
  });

  describe('initDB()', () => {
    it('should initialize the database', async () => {
      const db = await initDB();
      assert(db !== null);
    });
  });

  describe('createDrawing()', () => {
    it('should create a new drawing and return an ID', async () => {
      const id = await createDrawing({
        name: 'Test Drawing 1',
        strokes: [{ points: [{ x: 10, y: 20 }], color: '#ff0000', size: 5 }]
      });
      
      assert(typeof id === 'number');
      assert(id > 0);
    });

    it('should create multiple drawings with different IDs', async () => {
      const id1 = await createDrawing({
        name: 'Test Drawing 2',
        strokes: [{ points: [], color: '#00ff00', size: 3 }]
      });
      
      const id2 = await createDrawing({
        name: 'Test Drawing 3',
        strokes: [{ points: [], color: '#0000ff', size: 2 }]
      });
      
      assert(id1 !== id2);
    });
  });

  describe('getDrawing()', () => {
    it('should retrieve a drawing by ID', async () => {
      const id = await createDrawing({
        name: 'Retrieved Drawing',
        strokes: [{ points: [{ x: 100, y: 200 }], color: '#ff0000', size: 5 }]
      });
      
      const drawing = await getDrawing(id);
      
      assert(drawing !== null);
      assert.strictEqual(drawing.name, 'Retrieved Drawing');
      assert(Array.isArray(drawing.strokes));
    });

    it('should return null for non-existent drawing', async () => {
      const drawing = await getDrawing(99999);
      
      assert.strictEqual(drawing, null);
    });
  });

  describe('listDrawings()', () => {
    it('should list all drawings', async () => {
      // Create a few drawings
      await createDrawing({ name: 'List Test 1', strokes: [] });
      await createDrawing({ name: 'List Test 2', strokes: [] });
      
      const drawings = await listDrawings();
      
      assert(Array.isArray(drawings));
      assert(drawings.length >= 2);
      
      // Check structure of each drawing
      drawings.forEach(drawing => {
        assert('id' in drawing);
        assert('name' in drawing);
        assert('updatedAt' in drawing);
      });
    });

    it('should include only required fields', async () => {
      // Create a new one to ensure we have at least one
      await createDrawing({ name: 'Minimal Test', strokes: [] });
      
      const allDrawings = await listDrawings();
      const firstDrawing = allDrawings[0];
      
      // Should have exactly these fields
      assert('id' in firstDrawing);
      assert('name' in firstDrawing);
      assert('updatedAt' in firstDrawing);
      
      // Should not have strokes or createdAt in the list response
      assert(!('strokes' in firstDrawing));
      assert(!('createdAt' in firstDrawing));
    });
  });

  describe('updateDrawing()', () => {
    it('should update an existing drawing', async () => {
      // Create a drawing
      const id = await createDrawing({
        name: 'Original Name',
        strokes: [{ points: [], color: '#000000', size: 1 }]
      });
      
      // Update it
      await updateDrawing(id, {
        name: 'Updated Name',
        strokes: [{ points: [{ x: 50, y: 50 }], color: '#ffffff', size: 10 }]
      });
      
      // Verify update
      const drawing = await getDrawing(id);
      
      assert.strictEqual(drawing.name, 'Updated Name');
      assert.strictEqual(drawing.strokes.length, 1);
      assert.strictEqual(drawing.strokes[0].points.length, 1);
    });

    it('should throw error for non-existent drawing', async () => {
      try {
        await updateDrawing(99999, { name: 'Should Fail' });
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error instanceof Error);
      }
    });
  });

  describe('deleteDrawing()', () => {
    it('should delete a drawing', async () => {
      // Create a drawing
      const id = await createDrawing({
        name: 'To Be Deleted',
        strokes: []
      });
      
      // Verify it exists
      const beforeDelete = await getDrawing(id);
      assert(beforeDelete !== null);
      
      // Delete it
      await deleteDrawing(id);
      
      // Verify it's gone
      const afterDelete = await getDrawing(id);
      assert.strictEqual(afterDelete, null);
    });

    it('should not throw error for non-existent drawing', async () => {
      // This should not throw
      await deleteDrawing(99999);
    });
  });

  describe('Full CRUD Cycle', () => {
    it('should complete a full create-read-update-delete cycle', async () => {
      // CREATE
      const id = await createDrawing({
        name: 'CRUD Test Drawing',
        strokes: [{ points: [{ x: 10, y: 10 }], color: '#ff0000', size: 3 }]
      });
      
      // READ
      let drawing = await getDrawing(id);
      assert(drawing !== null);
      assert.strictEqual(drawing.name, 'CRUD Test Drawing');
      
      // UPDATE
      await updateDrawing(id, {
        name: 'CRUD Updated Drawing',
        strokes: [{ points: [{ x: 20, y: 20 }], color: '#00ff00', size: 5 }]
      });
      
      drawing = await getDrawing(id);
      assert.strictEqual(drawing.name, 'CRUD Updated Drawing');
      
      // DELETE
      await deleteDrawing(id);
      
      drawing = await getDrawing(id);
      assert.strictEqual(drawing, null);
    });
  });
});