module.exports = function(config) {
	config.set({
		plugins: ['karma-jasmine', 'karma-mocha-reporter', 'karma-chrome-launcher', require('./lib')],

		frameworks: ['jasmine'],
		reporters: ['mocha'],
		browsers: ['ChromeHeadless'],

		captureTimeout: 60000,
		autoWatch: true,
		singleRun: true,
		colors: true,
		port: 9876,

		basePath: '',
		files: [
			{ pattern: 'test/*.js', watched: true }
		],
		exclude: [],

		preprocessors: {
			'test/*.js': ['rollup'],
			'test/t3.js': ['rollupNode']
		},

		rollupPreprocessor: {
			options: {
				output: {
					name: 'lib',
					format: 'iife',
					sourcemap: 'inline'
				},
				plugins: [require('@rollup/plugin-buble')()]
			}
		},

		customPreprocessors: {
			rollupNode: {
				base: 'rollup',
				options: {
					plugins: [
						require('@rollup/plugin-node-resolve').nodeResolve(),
						require('@rollup/plugin-commonjs')(),
						require('@rollup/plugin-buble')()
					]
				}
			}
		}
	})
}
