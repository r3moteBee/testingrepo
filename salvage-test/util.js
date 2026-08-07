/**
 * Slugify: convert string to lowercase dash-separated format
 * @param {string} s - Input string
 * @returns {string} - Slugified string
 */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Clamp: constrain a number to be within a range
 * @param {number} n - Number to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped number
 */
function clamp(n, min, max) {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

module.exports = { slugify, clamp };
