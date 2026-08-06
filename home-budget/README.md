# Home Budget

A static, client-side single-page web application for managing personal finances. No build step required, no external dependencies.

## Features

- Track income and expenses by month
- Categorize transactions (Food, Utilities, Salary, etc.)
- Set monthly budgets per category with visual over-budget indicators
- Export/Import data as JSON for backup
- Responsive design that works on mobile devices
- Light/dark theme support (auto-detected from system preference)

## Data Storage

All data is stored in the browser's `localStorage` under the key `home-budget-v1`. This means:

- Data is private to your browser
- No data is sent to any server
- Data persists between page reloads
- To share or backup your data, use the Export button

## Running Locally

Simply open `index.html` in any modern web browser:

```bash
# If you have a local server:
npx serve .

# Or just open the file directly in your browser
open index.html
```

The app works from any subdirectory (e.g., GitHub Pages project sites), so relative paths are used throughout.

## Deploying to GitHub Pages

1. Create a new repository on GitHub
2. Upload all files (`index.html`, `styles.css`, `app.js`, `budget.js`)
3. Go to repository Settings → Pages
4. Under "Source", select the `main` branch and click Save

Your app will be available at `https://<username>.github.io/<repo>/`

## Usage

### Adding a Transaction
1. Enter the date (defaults to today)
2. Enter a description (e.g., "Grocery Store")
3. Enter a category (e.g., "Food")
4. Enter the amount in dollars
5. Select Income or Expense
6. Click "Add Transaction"

### Setting a Budget
In the Category Budgets section:
1. Enter a budget amount in dollars for any category
2. Click "Save"

Categories with transactions will appear automatically. The bar shows how much you've spent, and the budget limit is displayed.

### Export/Import
- **Export Backup**: Downloads a JSON file of all your data
- **Import Backup**: Uploads a previously exported JSON file to restore data

## Technical Details

### Architecture
- `index.html` - Semantic HTML5 single page structure
- `styles.css` - CSS with `prefers-color-scheme` for light/dark mode
- `budget.js` - Pure logic (no DOM access), works in both browser and Node
- `app.js` - DOM wiring, localStorage persistence, UI rendering

### Money Handling
All monetary values are stored and processed as integers representing cents to avoid floating-point precision issues.

### Validation
- Dates must be in YYYY-MM-DD format with valid values
- All fields are required and validated before adding transactions
- Budget amounts must be non-negative integers
