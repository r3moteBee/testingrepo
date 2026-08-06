/**
 * Home Budget - Unit tests for budget.js
 * Run with: node test.js
 */

const assert = require('node:assert/strict');
const Budget = require('./budget.js');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log('✓ ' + name);
  } catch (e) {
    failedTests++;
    console.log('✗ ' + name + ': ' + e.message);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg || 'Expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function assertDeepEqual(actual, expected, msg) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(msg || 'Expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

console.log('Testing budget.js...\n');

// Test newState
test('newState creates empty state', function() {
  const state = Budget.newState();
  assertEqual(state.transactions.length, 0);
  assertDeepEqual(state.budgets, {});
});

// Test monthKey
test('monthKey extracts YYYY-MM from date', function() {
  assertEqual(Budget.monthKey('2025-01-15'), '2025-01');
  assertEqual(Budget.monthKey('2025-12-31'), '2025-12');
  assertEqual(Budget.monthKey('2025-06-01'), '2025-06');
});

test('monthKey throws on invalid date', function() {
  assert.throws(function() { Budget.monthKey('invalid'); }, /Invalid/);
  assert.throws(function() { Budget.monthKey('2025-13-01'); }, /Invalid/);
  assert.throws(function() { Budget.monthKey('2025-01-32'); }, /Invalid/);
  assert.throws(function() { Budget.monthKey('25-01-01'); }, /Invalid/);
});

// Test cents math (no float pitfalls)
test('cents math avoids float issues', function() {
  const state = Budget.newState();
  
  // Add transactions that would cause float issues in dollars
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 1', category: 'Food', amountCents: 33, kind: 'expense' });
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 2', category: 'Food', amountCents: 34, kind: 'expense' });
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 3', category: 'Food', amountCents: 33, kind: 'expense' });
  
  const summary = Budget.monthSummary(state, '2025-01');
  assertEqual(summary.expenseCents, 100);
  assertEqual(summary.byCategory.Food.spentCents, 100);
});

// Test addTransaction
test('addTransaction adds transaction', function() {
  const state = Budget.newState();
  const id = Budget.addTransaction(state, { 
    date: '2025-01-15', 
    description: 'Groceries', 
    category: 'Food', 
    amountCents: 5000, 
    kind: 'expense' 
  });
  
  assertEqual(id, 1);
  assertEqual(state.transactions.length, 1);
  assertDeepEqual(state.transactions[0], {
    id: 1,
    date: '2025-01-15',
    description: 'Groceries',
    category: 'Food',
    amountCents: 5000,
    kind: 'expense'
  });
});

test('addTransaction validates inputs', function() {
  const state = Budget.newState();
  
  // Missing fields
  assert.throws(function() { Budget.addTransaction(state, {}); }, /Date is required/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01' }); }, /Description is required/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 'Test' }); }, /Category is required/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 'Test', category: 'Food' }); }, /Amount is required/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 'Test', category: 'Food', amountCents: 100 }); }, /Kind is required/);
  
  // Invalid types
  assert.throws(function() { Budget.addTransaction(state, { date: 'not-a-date', description: 'Test', category: 'Food', amountCents: 100, kind: 'expense' }); }, /Invalid date format/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 123, category: 'Food', amountCents: 100, kind: 'expense' }); }, /Description must be a string/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 'Test', category: '', amountCents: 100, kind: 'expense' }); }, /Category cannot be empty/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 'Test', category: 'Food', amountCents: 10.5, kind: 'expense' }); }, /Amount must be an integer/);
  assert.throws(function() { Budget.addTransaction(state, { date: '2025-01-01', description: 'Test', category: 'Food', amountCents: 100, kind: 'invalid' }); }, /Kind must be "income" or "expense"/);
});

test('addTransaction generates unique IDs', function() {
  const state = Budget.newState();
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 1', category: 'A', amountCents: 100, kind: 'expense' });
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 2', category: 'A', amountCents: 200, kind: 'expense' });
  
  assertEqual(state.transactions[0].id, 1);
  assertEqual(state.transactions[1].id, 2);
});

// Test removeTransaction
test('removeTransaction removes transaction', function() {
  const state = Budget.newState();
  const id1 = Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 1', category: 'A', amountCents: 100, kind: 'expense' });
  const id2 = Budget.addTransaction(state, { date: '2025-01-01', description: 'Test 2', category: 'A', amountCents: 200, kind: 'expense' });
  
  Budget.removeTransaction(state, id1);
  
  assertEqual(state.transactions.length, 1);
  assertEqual(state.transactions[0].id, id2);
});

test('removeTransaction handles non-existent ID', function() {
  const state = Budget.newState();
  assert.doesNotThrow(function() { Budget.removeTransaction(state, 999); });
});

// Test income vs expense
test('income and expense are tracked separately', function() {
  const state = Budget.newState();
  
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Salary', category: 'Income', amountCents: 50000, kind: 'income' });
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Groceries', category: 'Food', amountCents: 5000, kind: 'expense' });
  
  const summary = Budget.monthSummary(state, '2025-01');
  
  assertEqual(summary.incomeCents, 50000);
  assertEqual(summary.expenseCents, 5000);
  assertEqual(summary.netCents, 45000);
});

// Test month filtering
test('monthSummary filters by month', function() {
  const state = Budget.newState();
  
  // January transactions
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Jan 1', category: 'A', amountCents: 100, kind: 'expense' });
  Budget.addTransaction(state, { date: '2025-01-15', description: 'Jan 15', category: 'A', amountCents: 200, kind: 'expense' });
  
  // February transaction
  Budget.addTransaction(state, { date: '2025-02-01', description: 'Feb 1', category: 'A', amountCents: 300, kind: 'expense' });
  
  const janSummary = Budget.monthSummary(state, '2025-01');
  assertEqual(janSummary.expenseCents, 300);
  
  const febSummary = Budget.monthSummary(state, '2025-02');
  assertEqual(febSummary.expenseCents, 300);
});

// Test budgets
test('setBudget sets budget', function() {
  const state = Budget.newState();
  Budget.setBudget(state, 'Food', 5000);
  
  assertEqual(state.budgets.Food, 5000);
});

test('setBudget validates inputs', function() {
  const state = Budget.newState();
  
  assert.throws(function() { Budget.setBudget(state, '', 5000); }, /Category must be a non-empty string/);
  assert.throws(function() { Budget.setBudget(state, 'Food', 10.5); }, /Monthly limit must be an integer/);
});

test('monthSummary calculates overBudget', function() {
  const state = Budget.newState();
  
  Budget.setBudget(state, 'Food', 1000);
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Groceries 1', category: 'Food', amountCents: 600, kind: 'expense' });
  Budget.addTransaction(state, { date: '2025-01-15', description: 'Groceries 2', category: 'Food', amountCents: 500, kind: 'expense' });
  
  const summary = Budget.monthSummary(state, '2025-01');
  
  assertEqual(summary.byCategory.Food.spentCents, 1100);
  assertEqual(summary.byCategory.Food.limitCents, 1000);
  assertEqual(summary.byCategory.Food.overBudget, true);
});

test('monthSummary shows under budget', function() {
  const state = Budget.newState();
  
  Budget.setBudget(state, 'Food', 2000);
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Groceries', category: 'Food', amountCents: 500, kind: 'expense' });
  
  const summary = Budget.monthSummary(state, '2025-01');
  
  assertEqual(summary.byCategory.Food.overBudget, false);
});

test('monthSummary handles category without budget', function() {
  const state = Budget.newState();
  
  Budget.addTransaction(state, { date: '2025-01-01', description: 'Groceries', category: 'Food', amountCents: 500, kind: 'expense' });
  
  const summary = Budget.monthSummary(state, '2025-01');
  
  assertEqual(summary.byCategory.Food.spentCents, 500);
  assertEqual(summary.byCategory.Food.limitCents, null);
  assertEqual(summary.byCategory.Food.overBudget, false);
});

// Test nextMonth and prevMonth
test('nextMonth increments month', function() {
  assertEqual(Budget.nextMonth('2025-01'), '2025-02');
  assertEqual(Budget.nextMonth('2025-12'), '2026-01');
});

test('prevMonth decrements month', function() {
  assertEqual(Budget.prevMonth('2025-02'), '2025-01');
  assertEqual(Budget.prevMonth('2025-01'), '2024-12');
});

// Summary
console.log('\n' + passedTests + ' tests passed, ' + failedTests + ' tests failed.');

if (failedTests > 0) {
  process.exit(1);
}
