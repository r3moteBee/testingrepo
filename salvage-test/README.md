# salvage-test utilities

This module provides two utility functions: `slugify` and `clamp`.

## Installation

```bash
npm install salvage-test
```

## Usage

### slugify(s)

Converts a string to lowercase dash-separated format (slug).

```javascript
const { slugify } = require('salvage-test');

slugify('Hello World');           // 'hello-world'
slugify('  SPACES and  More  ');   // 'spaces-and-more'
slugify('Special!@#$Characters');  // 'specialcharacters'
```

### clamp(n, min, max)

Constrains a number to be within the specified range.

```javascript
const { clamp } = require('salvage-test');

clamp(5, 0, 10);   // 5
clamp(-5, 0, 10);  // 0
clamp(15, 0, 10);  // 10
```

## License

MIT
