const assert = require('assert');
const { slugify, clamp } = require('./util.js');

// Test slugify function
assert.strictEqual(slugify('Hello World'), 'hello-world');
assert.strictEqual(slugify('  SPACES and  More  '), 'spaces-and-more');
assert.strictEqual(slugify('Special!@#$Characters'), 'specialcharacters');
assert.strictEqual(slugify('Multiple   Spaces'), 'multiple-spaces');

// Edge cases for slugify
assert.strictEqual(slugify(''), '');
assert.strictEqual(slugify('   '), '');

// Test clamp function
assert.strictEqual(clamp(5, 0, 10), 5);
assert.strictEqual(clamp(-5, 0, 10), 0);
assert.strictEqual(clamp(15, 0, 10), 10);
assert.strictEqual(clamp(0, 0, 10), 0);
assert.strictEqual(clamp(10, 0, 10), 10);

// Clamp with fully negative range
assert.strictEqual(clamp(-7, -10, -1), -7);
assert.strictEqual(clamp(-20, -10, -1), -10);

console.log('OK');
