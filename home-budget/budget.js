/**
 * Home Budget - Pure logic core (NO DOM access)
 * Works in both browser and Node.js
 */

(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js
    module.exports = factory();
  } else if (typeof window !== 'undefined') {
    // Browser
    window.Budget = factory();
  }
})(this, function() {

  'use strict';

  /**
   * Create a new state object
   */
  function newState() {
    return {
      transactions: [],
      budgets: {}
    };
  }

  /**
   * Validate if a date is valid (checks day range for given month)
   */
  function isValidDate(year, month, day) {
    // Basic range checks
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Days in each month (non-leap year)
    var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Check for leap year
    if (month === 2 && day === 29) {
      var isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (!isLeap) return false;
    }
    
    // Check day against actual month
    if (day > daysInMonth[month - 1]) return false;
    
    return true;
  }

  /**
   * Get month key from date string (YYYY-MM)
   */
  function monthKey(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new Error('Invalid date string');
    }
    // Validate format YYYY-MM-DD
    var match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new Error('Invalid date format, expected YYYY-MM-DD');
    }
    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var day = parseInt(match[3], 10);
    
    if (!isValidDate(year, month, day)) {
      throw new Error('Invalid date value');
    }
    
    return match[1] + '-' + match[2];
  }

  /**
   * Add a transaction to state
   */
  function addTransaction(state, transaction) {
    // Validate required fields
    if (!transaction || typeof transaction !== 'object') {
      throw new Error('Transaction must be an object');
    }

    // Validate date
    var dateStr = transaction.date;
    if (!dateStr || typeof dateStr !== 'string') {
      throw new Error('Date is required');
    }
    
    // Validate and normalize date format
    var match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      throw new Error('Invalid date format, expected YYYY-MM-DD');
    }
    
    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var day = parseInt(match[3], 10);

    if (!isValidDate(year, month, day)) {
      throw new Error('Invalid date value');
    }

    // Validate description
    var description = transaction.description;
    if (description === undefined || description === null) {
      throw new Error('Description is required');
    }
    if (typeof description !== 'string') {
      throw new Error('Description must be a string');
    }
    if (description.trim() === '') {
      throw new Error('Description cannot be empty');
    }

    // Validate category
    var category = transaction.category;
    if (category === undefined || category === null) {
      throw new Error('Category is required');
    }
    if (typeof category !== 'string') {
      throw new Error('Category must be a string');
    }
    if (category.trim() === '') {
      throw new Error('Category cannot be empty');
    }

    // Validate amount (must be integer cents)
    var amountCents = transaction.amountCents;
    if (amountCents === undefined || amountCents === null) {
      throw new Error('Amount is required');
    }
    if (typeof amountCents !== 'number' || !Number.isInteger(amountCents)) {
      throw new Error('Amount must be an integer (cents)');
    }

    // Validate kind
    var kind = transaction.kind;
    if (!kind || typeof kind !== 'string') {
      throw new Error('Kind is required');
    }
    if (kind !== 'income' && kind !== 'expense') {
      throw new Error('Kind must be "income" or "expense"');
    }

    // Create transaction with unique ID
    var id = state.transactions.length > 0 
      ? Math.max.apply(null, state.transactions.map(function(t) { return t.id; })) + 1 
      : 1;

    var newTransaction = {
      id: id,
      date: match[1] + '-' + match[2] + '-' + match[3],
      description: description.trim(),
      category: category.trim(),
      amountCents: amountCents,
      kind: kind
    };

    state.transactions.push(newTransaction);
    return id;
  }

  /**
   * Remove a transaction by ID
   */
  function removeTransaction(state, id) {
    var idx = -1;
    for (var i = 0; i < state.transactions.length; i++) {
      if (state.transactions[i].id === id) {
        idx = i;
        break;
      }
    }
    if (idx !== -1) {
      state.transactions.splice(idx, 1);
    }
  }

  /**
   * Set a monthly budget for a category
   */
  function setBudget(state, category, monthlyLimitCents) {
    if (typeof category !== 'string' || category.trim() === '') {
      throw new Error('Category must be a non-empty string');
    }
    if (typeof monthlyLimitCents !== 'number' || !Number.isInteger(monthlyLimitCents)) {
      throw new Error('Monthly limit must be an integer (cents)');
    }
    
    state.budgets[category.trim()] = monthlyLimitCents;
  }

  /**
   * Get summary for a specific month
   */
  function monthSummary(state, monthKey) {
    if (!monthKey || typeof monthKey !== 'string') {
      throw new Error('Month key is required');
    }
    
    var match = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new Error('Invalid month key format, expected YYYY-MM');
    }

    var incomeCents = 0;
    var expenseCents = 0;
    var byCategory = {};

    // Filter transactions for the month
    state.transactions.forEach(function(t) {
      if (t.date.startsWith(monthKey)) {
        var amount = t.amountCents;
        
        if (t.kind === 'income') {
          incomeCents += amount;
        } else if (t.kind === 'expense') {
          expenseCents += amount;
          
          // Track by category
          var cat = t.category;
          if (!byCategory[cat]) {
            byCategory[cat] = { spentCents: 0, limitCents: null, overBudget: false };
          }
          byCategory[cat].spentCents += amount;
        }
      }
    });

    // Calculate net
    var netCents = incomeCents - expenseCents;

    // Add budget info to categories
    for (var cat in byCategory) {
      if (state.budgets.hasOwnProperty(cat)) {
        var limit = state.budgets[cat];
        byCategory[cat].limitCents = limit;
        byCategory[cat].overBudget = byCategory[cat].spentCents > limit;
      }
    }

    return {
      incomeCents: incomeCents,
      expenseCents: expenseCents,
      netCents: netCents,
      byCategory: byCategory
    };
  }

  /**
   * Get next month key (YYYY-MM)
   */
  function nextMonth(monthKey) {
    var match = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new Error('Invalid month key format');
    }
    
    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    
    if (month === 12) {
      return (year + 1) + '-01';
    } else {
      return year + '-' + String(month + 1).padStart(2, '0');
    }
  }

  /**
   * Get previous month key (YYYY-MM)
   */
  function prevMonth(monthKey) {
    var match = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new Error('Invalid month key format');
    }
    
    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    
    if (month === 1) {
      return (year - 1) + '-12';
    } else {
      return year + '-' + String(month - 1).padStart(2, '0');
    }
  }

  /**
   * Get current month key
   */
  function getCurrentMonthKey() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }

  return {
    newState: newState,
    addTransaction: addTransaction,
    removeTransaction: removeTransaction,
    setBudget: setBudget,
    monthKey: monthKey,
    monthSummary: monthSummary,
    nextMonth: nextMonth,
    prevMonth: prevMonth,
    getCurrentMonthKey: getCurrentMonthKey
  };
});
