/**
 * Home Budget - DOM wiring and state management
 */

(function() {
  'use strict';

  // Import budget logic (works in both browser and Node)
  var Budget = (typeof module !== 'undefined' && module.exports) 
    ? require('./budget.js')
    : window.Budget;

  // DOM elements
  var $ = function(selector) { return document.querySelector(selector); };
  var $$ = function(selector) { return document.querySelectorAll(selector); };

  // State
  var state;
  var currentMonth = Budget.getCurrentMonthKey();

  // Storage key
  var STORAGE_KEY = 'home-budget-v1';

  /**
   * Load state from localStorage
   */
  function loadState() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        state = JSON.parse(stored);
        // Ensure budgets is an object
        if (!state.budgets || typeof state.budgets !== 'object') {
          state.budgets = {};
        }
      } else {
        state = Budget.newState();
      }
    } catch (e) {
      console.error('Failed to load state:', e);
      state = Budget.newState();
    }
  }

  /**
   * Save state to localStorage
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  /**
   * Format cents as currency string
   */
  function formatMoney(cents) {
    var sign = cents < 0 ? '-' : '';
    var absCents = Math.abs(cents);
    var dollars = Math.floor(absCents / 100);
    var centsPart = absCents % 100;
    return sign + '$' + dollars.toLocaleString() + '.' + String(centsPart).padStart(2, '0');
  }

  /**
   * Format month as readable string
   */
  function formatMonth(monthKey) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    var match = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!match) return monthKey;
    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10) - 1;
    return months[month] + ' ' + year;
  }

  /**
   * Render the entire app
   */
  function render() {
    renderHeader();
    renderSummary();
    renderTransactionForm();
    renderTransactionsList();
    renderBudgetsSection();
  }

  /**
   * Render header with month picker
   */
  function renderHeader() {
    var header = $('#month-header');
    if (!header) return;

    // Month navigation
    var prevBtn = $('.month-prev', header);
    var nextBtn = $('.month-next', header);
    var monthLabel = $('.month-label', header);

    if (prevBtn) {
      prevBtn.onclick = function() {
        currentMonth = Budget.prevMonth(currentMonth);
        saveState();
        render();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = function() {
        currentMonth = Budget.nextMonth(currentMonth);
        saveState();
        render();
      };
    }

    if (monthLabel) {
      monthLabel.textContent = formatMonth(currentMonth);
    }
  }

  /**
   * Render summary section
   */
  function renderSummary() {
    var summary = $('#summary');
    if (!summary) return;

    var data = Budget.monthSummary(state, currentMonth);

    $('.income-val', summary).textContent = formatMoney(data.incomeCents);
    $('.expense-val', summary).textContent = formatMoney(data.expenseCents);
    $('.net-val', summary).textContent = formatMoney(data.netCents);

    // Color coding for net
    var netEl = $('.net-val', summary);
    if (data.netCents > 0) {
      netEl.style.color = 'var(--success)';
    } else if (data.netCents < 0) {
      netEl.style.color = 'var(--danger)';
    } else {
      netEl.style.color = '';
    }
  }

  /**
   * Render transaction form
   */
  function renderTransactionForm() {
    var form = $('#transaction-form');
    if (!form) return;

    // Set default date to today
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + 
                  String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(today.getDate()).padStart(2, '0');
    $('#trans-date').value = dateStr;

    // Handle form submission
    form.onsubmit = function(e) {
      e.preventDefault();

      var date = $('#trans-date').value;
      var description = $('#trans-desc').value.trim();
      var category = $('#trans-category').value.trim();
      var amountStr = $('#trans-amount').value.trim();
      var kind = $('.kind-toggle input:checked', form).value;

      // Parse amount (convert dollars to cents)
      var amountCents;
      if (amountStr === '' || isNaN(amountStr)) {
        alert('Please enter a valid amount');
        return;
      }
      var amountFloat = parseFloat(amountStr);
      if (isNaN(amountFloat) || amountFloat < 0) {
        alert('Amount must be a positive number');
        return;
      }
      amountCents = Math.round(amountFloat * 100);

      try {
        Budget.addTransaction(state, {
          date: date,
          description: description,
          category: category,
          amountCents: amountCents,
          kind: kind
        });
        saveState();
        render();
        
        // Reset form
        $('#trans-desc').value = '';
        $('#trans-category').value = '';
        $('#trans-amount').value = '';
      } catch (err) {
        alert(err.message);
      }
    };
  }

  /**
   * Render transactions list
   */
  function renderTransactionsList() {
    var container = $('#transactions-list');
    if (!container) return;

    // Filter transactions for current month
    var transactions = state.transactions.filter(function(t) {
      return t.date.startsWith(currentMonth);
    }).sort(function(a, b) {
      // Sort by date descending, then by id (newest first)
      if (b.date !== a.date) {
        return b.date.localeCompare(a.date);
      }
      return b.id - a.id;
    });

    if (transactions.length === 0) {
      container.innerHTML = '<p class="no-transactions">No transactions for this month</p>';
      return;
    }

    var html = '<table><thead><tr>' +
      '<th>Date</th><th>Description</th><th>Category</th>' +
      '<th class="amount-col">Amount</th><th class="action-col">Action</th>' +
      '</tr></thead><tbody>';

    transactions.forEach(function(t) {
      var formattedDate = t.date.replace(/-(\d{2})$/, '-$1').replace(/^(\d{4}-\d{2})-/, '$1/'); // YYYY-MM-DD
      var formattedAmount = formatMoney(t.amountCents);
      var amountClass = t.kind === 'income' ? 'income-amount' : 'expense-amount';

      html += '<tr data-id="' + t.id + '">' +
        '<td>' + formattedDate + '</td>' +
        '<td>' + escapeHtml(t.description) + '</td>' +
        '<td>' + escapeHtml(t.category) + '</td>' +
        '<td class="' + amountClass + '">' + formattedAmount + '</td>' +
        '<td><button class="delete-btn" data-id="' + t.id + '">×</button></td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Add delete handlers
    $$('.delete-btn', container).forEach(function(btn) {
      btn.onclick = function() {
        var id = parseInt(this.dataset.id, 10);
        if (confirm('Delete this transaction?')) {
          Budget.removeTransaction(state, id);
          saveState();
          render();
        }
      };
    });
  }

  /**
   * Render budgets section
   */
  function renderBudgetsSection() {
    var container = $('#budgets-section');
    if (!container) return;

    var data = Budget.monthSummary(state, currentMonth);

    // Get all unique categories from transactions and budgets
    var categories = {};
    
    // From transactions
    state.transactions.forEach(function(t) {
      if (t.date.startsWith(currentMonth)) {
        categories[t.category] = true;
      }
    });
    
    // From budgets
    for (var cat in state.budgets) {
      categories[cat] = true;
    }

    var html = '<div class="budgets-grid">';
    
    for (var cat in categories) {
      var spent = data.byCategory[cat] ? data.byCategory[cat].spentCents : 0;
      var limit = state.budgets.hasOwnProperty(cat) ? state.budgets[cat] : null;
      var overBudget = limit !== null && spent > limit;

      html += '<div class="budget-item' + (overBudget ? ' over-budget' : '') + '">' +
        '<div class="budget-header">' +
          '<span class="category-name">' + escapeHtml(cat) + '</span>' +
          (limit !== null ? '<span class="budget-limit">Limit: ' + formatMoney(limit) + '</span>' : '') +
        '</div>' +
        '<div class="budget-bar">' +
          '<div class="budget-fill" style="width: ' + (limit ? Math.min(100, spent / limit * 100) : 0) + '%"></div>' +
        '</div>' +
        '<div class="budget-values">' +
          '<span>Spent: ' + formatMoney(spent) + '</span>' +
          (limit !== null ? '<span class="' + (overBudget ? 'over-budget-text' : '') + '">' +
            (overBudget ? 'Over budget by ' + formatMoney(spent - limit) : 'Remaining: ' + formatMoney(limit - spent)) +
          '</span>' : '<span>No limit set</span>') +
        '</div>' +
        '<div class="budget-edit">' +
          '<input type="number" placeholder="Set limit (USD)" min="0" step="1"' +
            'data-category="' + escapeHtml(cat) + '">' +
          '<button class="save-budget-btn" data-category="' + escapeHtml(cat) + '">Save</button>' +
        '</div>' +
      '</div>';
    }

    html += '</div>';

    if (Object.keys(categories).length === 0) {
      html += '<p class="no-budgets">No transactions or budgets yet</p>';
    }

    container.innerHTML = html;

    // Add save budget handlers
    $$('.save-budget-btn', container).forEach(function(btn) {
      btn.onclick = function() {
        var cat = this.dataset.category;
        var input = $('input[data-category="' + cat + '"]', container);
        var limitDollars = parseFloat(input.value);
        
        if (isNaN(limitDollars) || limitDollars < 0) {
          alert('Please enter a valid budget amount');
          return;
        }

        var limitCents = Math.round(limitDollars * 100);
        
        try {
          Budget.setBudget(state, cat, limitCents);
          saveState();
          render();
        } catch (err) {
          alert(err.message);
        }
      };
    });
  }

  /**
   * Escape HTML entities
   */
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
  }

  // Export functions for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      state: function() { return state; },
      setState: function(s) { state = s; },
      render: render,
      loadState: loadState,
      saveState: saveState
    };
  }

  // Initialize on DOM ready
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadState();
      render();
      
      // Setup Export/Import buttons
      $('#export-btn').onclick = function() {
        var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
        var downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'budget-backup-' + new Date().toISOString().slice(0, 10) + '.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
      };

      $('#import-btn').onclick = function() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
          var file = e.target.files[0];
          if (!file) return;
          
          var reader = new FileReader();
          reader.onload = function(event) {
            try {
              var importedState = JSON.parse(event.target.result);
              
              // Validate structure
              if (!importedState.transactions || !Array.isArray(importedState.transactions)) {
                throw new Error('Invalid state: transactions must be an array');
              }
              if (!importedState.budgets || typeof importedState.budgets !== 'object') {
                throw new Error('Invalid state: budgets must be an object');
              }
              
              if (confirm('This will replace your current data. Continue?')) {
                state = importedState;
                saveState();
                render();
              }
            } catch (err) {
              alert('Failed to import: ' + err.message);
            }
          };
          reader.readAsText(file);
        };
        
        input.click();
      };
    });
  }
})();
