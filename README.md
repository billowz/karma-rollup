# **karma-rollup**

Karma preprocessor to bundle ES2015 modules using [Rollup](http://rollupjs.org).

[![Travis](https://img.shields.io/travis/tao-zeng/karma-rollup.svg)](https://travis-ci.org/tao-zeng/karma-rollup)
[![Dependency](https://img.shields.io/david/tao-zeng/karma-rollup.svg)](https://david-dm.org/tao-zeng/karma-rollup)
[![Downloads](https://img.shields.io/npm/dm/karma-rollup.svg)](https://www.npmjs.com/package/karma-rollup)
[![Version](https://img.shields.io/npm/v/karma-rollup.svg)](https://www.npmjs.com/package/karma-rollup)
[![license](https://img.shields.io/github/license/tao-zeng/karma-rollup.svg)](https://github.com/tao-zeng/karma-rollup/blob/master/LICENSE)

## Features

- Rebundles your files when watched dependencies change
- Caches bundle output for improved performance

## Installation

```bash
npm install karma-rollup --save-dev
```

## Configuration

All the options detailed in the [Rollup Documentation](https://github.com/rollup/rollup/wiki/JavaScript-API) can be
passed to `rollupPreprocessor.options`.

### Standard

Below is a well-founded recommendation using the [Bublé](https://buble.surge.sh) ES2015 transpiler:

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: ['test/**/*.spec.js'],

    plugins: ['karma-*'],

    preprocessors: {
      'test/**/*.spec.js': ['rollup']
    },

    rollupPreprocessor: {
      options: {
        /**
         * This is just a normal Rollup config object,
         * except that `input` is handled for you.
         */
        plugins: [require('rollup-plugin-buble')()],
        output: {
          format: 'iife', // Helps prevent naming collisions.
          name: '<your_project>', // Required for 'iife' format.
          sourcemap: 'inline' // Sensible for testing.
        }
      },
      // ["debug", "info"], log level for watch description
      logWatch: 'info',
      // File test/**/*.spec.js will be deployed on Karma with path test/**/*.test.js
      transformPath: filePath => filePath.replace('.spec.js', '.test.js')
    }
  })
}
```

### Configured Preprocessors

Below shows an example where [configured preprocessors](http://karma-runner.github.io/1.0/config/preprocessors.html) can
be very helpful:

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    files: ['test/**/*.spec.js'],

    preprocessors: {
      'test/buble/**/*.spec.js': ['rollup'],
      'test/babel/**/*.spec.js': ['rollupBabel']
    },

    rollupPreprocessor: {
      options: {
        plugins: [require('rollup-plugin-buble')()],
        output: {
          format: 'iife',
          name: '<your_project>',
          sourcemap: 'inline'
        }
      }
    },

    customPreprocessors: {
      /**
       * Clones the base preprocessor, but overwrites
       * its options with those defined below...
       */
      rollupBabel: {
        base: 'rollup',
        options: {
          // In this case, to use a different transpiler:
          plugins: [require('rollup-plugin-babel')()]
        },
        // In this case, to use a different logWatch and transformPath:
        // ["debug", "info"], log level for watch description
        logWatch: 'info',
        // File test/**/*.spec.js will be deployed on Karma with path test/**/*.test.js
        transformPath: filePath => filePath.replace('.spec.js', '.test.js')
      }
    }
  })
}
```

## Support

Supports all Rollup plug-ins, and works on Node `8` and up. Happy bundling!
