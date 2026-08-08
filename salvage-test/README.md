# salvage-test utilities

This module provides two utility functions: `slugify` and `clamp`.

## Installation

Copy `util.js` into your project and require it directly. Run the tests with `node test.js`.

## Usage

### slugify(s)

Converts a string to lowercase dash-separated format (slug).

```javascript
const { slugify } = require('./util.js');

slugify('Hello World');           // 'hello-world'
slugify('  SPACES and  More  ');   // 'spaces-and-more'
slugify('Special!@#$Characters');  // 'specialcharacters'
```

### clamp(n, min, max)

Constrains a number to be within the specified range.

```javascript
const { clamp } = require('./util.js');

clamp(5, 0, 10);   // 5
clamp(-5, 0, 10);  // 0
clamp(15, 0, 10);  // 10
```

## License

MIT
