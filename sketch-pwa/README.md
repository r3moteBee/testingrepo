# Sketch PWA - Browser Drawing App

A browser-based drawing/sketch application with full CRUD for saved drawings, persisted in IndexedDB. No backend server required - everything runs in the browser.

## Features

- ✏️ **Freehand Drawing** - Draw with mouse or touch
- 🎨 **Color Picker** - Choose any color for your brush
- 🖌️ **Adjustable Brush Size** - Slider from 1-20 pixels
- 💾 **Full CRUD** - Create, Read, Update, Delete saved drawings
- 🌓 **Light/Dark Theme** - Automatically adapts to system preference
- 💾 **Persistent Storage** - Drawings saved in IndexedDB (browser local storage)
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔌 **Offline Capable** - PWA with service worker for offline use

## Architecture

```
sketch-pwa/
├── index.html      # Main app HTML with canvas, toolbar, drawings panel
├── manifest.json   # PWA manifest for installability
├── sw.js           # Service worker with cache-first strategy
├── styles.css      # Responsive styling with light/dark theme
├── canvas.js       # Pure drawing engine (stroke management, render)
├── storage.js      # IndexedDB CRUD wrapper
├── app.js          # DOM wiring and event handlers
└── test.js         # Node tests for canvas.js and storage.js
```

### Data Flow

1. **User Interaction** → Pointer events in `app.js`
2. **Drawing Logic** → `canvas.js` (pure functions)
3. **Storage** → `storage.js` → IndexedDB
4. **Persistence** → Drawings persist across sessions

## Running Locally

### Option 1: Simple HTTP Server (Python)

```bash
cd sketch-pwa
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

### Option 2: Node.js HTTP Server

```bash
cd sketch-pwa
npx serve .
# Or use any static file server
```

### Option 3: VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"

## Deploying

### GitHub Pages

1. Push all files to a GitHub repository
2. Go to Settings → Pages
3. Select branch (main) and folder (/root or /docs)
4. Click Save

### Netlify

1. Drag and drop the `sketch-pwa` folder to Netlify
2. Or connect your GitHub repository

### Vercel

1. Import your GitHub repository
2. No build step needed - it's static files
3. Deploy

### Any Static Hosting

Just upload all files in `sketch-pwa/` to any static hosting service:
- Cloudflare Pages
- Firebase Hosting
- Amazon S3 + CloudFront
- Any web hosting with static file support

## Data Storage Notes

### IndexedDB

Drawings are stored in the browser's IndexedDB database:

- **Database Name**: `SketchDB`
- **Object Store**: `drawings`
- **Fields**:
  - `id` (auto-increment)
  - `name` (string)
  - `strokes` (array of stroke objects)
  - `createdAt` (Date)
  - `updatedAt` (Date)

### Stroke Format

```javascript
[
  {
    points: [
      { x: number, y: number },
      // ... more points
    ],
    color: string,  // CSS color value
    size: number    // brush size in pixels
  }
]
```

### Storage Limits

- Browser storage is limited (typically 50-80% of disk space)
- Drawings are stored locally per browser
- Clearing browser cache will delete all drawings
- No data sync between browsers/devices

## Architecture Overview

### Canvas.js (Pure Functions)

Contains all drawing logic without DOM dependencies:

- `createStrokes()` - Initialize empty strokes array
- `addPoint(strokes, x, y, color, size)` - Add point to stroke
- `startNewStroke(strokes, color, size)` - Begin new stroke
- `endStroke(strokes)` - Finalize current stroke
- `undo(strokes)` - Remove last stroke
- `renderStrokes(strokes, ctx)` - Render to canvas context
- `serializeDrawing(strokes)` - Convert to JSON string
- `deserializeDrawing(json)` - Parse from JSON string

### Storage.js (IndexedDB Wrapper)

Provides CRUD operations:

- `initDB()` - Initialize database
- `createDrawing(data)` - Create new drawing
- `getDrawing(id)` - Retrieve drawing by ID
- `listDrawings()` - List all drawings (id, name, updatedAt)
- `updateDrawing(id, data)` - Update existing drawing
- `deleteDrawing(id)` - Delete drawing

### App.js (DOM Wiring)

Handles:

- Canvas pointer/touch events
- Toolbar controls
- Save button (create/update)
- Drawings panel rendering
- Load/Rename/Delete functionality

## Testing

Run the test suite with Node.js:

```bash
cd sketch-pwa
npm install --no-audit --no-fund
node test.js
```

### Test Coverage

**Tested:**
- ✅ `canvas.js` - All pure functions (serialize/deserialize, undo, stroke management)
- ✅ `storage.js` - Full CRUD with fake-indexeddb

**Not Tested:**
- UI rendering (requires browser environment)
- Pointer/touch event handling
- Service worker caching behavior
- IndexedDB actual persistence in browser (requires manual testing)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Opera: ✅ Full support

## License

MIT - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `node test.js`
5. Open a pull request

## Acknowledgments

- Built with vanilla JavaScript - no frameworks
- Uses native browser APIs (Canvas, IndexedDB)
- Inspired by drawing apps like MS Paint
