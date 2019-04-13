const path = require('path')
const rollup = require('rollup')
const chokidar = require('chokidar')
const debounce = require('debounce')

function normalizePath(path) {
	return path.replace(/\\/g, '/')
}

function hasNullByte(string) {
	return string.includes('\u0000')
}

/**
 * Rollup preprocessor factory.
 *
 * @param {Object} args Config object of custom preprocessor.
 * @param {Object} config Karma's config.
 * @param {Object} emitter Karma's emitter.
 * @param {Object} logger Karma's logger.
 * @return {Function} the function to preprocess files.
 */
function createPreprocessor(preconfig, config, emitter, logger) {
	function relativePath(_path) {
		if (Array.isArray(_path)) return _path.map(relativePath)
		return normalizePath(path.relative(config.basePath, _path))
	}

	const preprocessorConfig = config.rollupPreprocessor || {},
		options = Object.assign({}, preprocessorConfig.options, preconfig.options),
		transformPath = preconfig.transformPath || preprocessorConfig.transformPath || (filepath => filepath),
		logWatch = preconfig.logWatch || preprocessorConfig.logWatch || 'debug'

	if (logWatch !== 'debug' && logWatch !== 'info')
		throw new Error(`invalid logWatch: ${logWatch}, should be "debug" or "info"`)

	const log = logger.create('preprocessor.rollup')

	const cache = {}

	const watch =
		!config.singleRun && config.autoWatch
			? (function() {
					const depWatcher = chokidar.watch(),
						entryWatcher = chokidar.watch()

					emitter.on('exit', done => {
						depWatcher.close()
						entryWatcher.close()
						done()
					})

					const entries = {},
						dependencies = {}

					let dirties = null,
						refreshing = false

					function refresh(_dirties) {
						dirties = Object.assign(dirties || {}, _dirties)
						if (!refreshing) {
							refreshing = true
							_refresh().then(() => {
								refreshing = false
							})
						}
					}

					function _refresh() {
						const entries = Object.keys(dirties)
						dirties = null
						return Promise.all(
							entries.map(entry => {
								log.debug('Refresh entries: %s', relativePath(entry))
								return emitter._fileList.changeFile(normalizePath(entry), true)
							})
						).then(() => {
							return dirties && _refresh()
						})
					}

					entryWatcher.on('unlink', entry => {
						log.info('Removed entry file: %s', relativePath(entry))
						const entryDeps = entries[entry],
							dels = entryDeps ? entryDeps.filter(path => putDep(entry, path)) : []

						delete entries[entry]

						if (dels.length) {
							log[logWatch]('Unwatching deps: ', relativePath(dels).join(', '))
							depWatcher.unwatch(dels)
						}

						log[logWatch]('Unwatching entry: ', relativePath(entry))
						entryWatcher.unwatch(entry)

						// remove cache
						delete cache[path]
					})

					depWatcher.on(
						'change',
						debounce(path => {
							log.info('Changed dependency file: %s', relativePath(path))
							refresh(dependencies[path].entries)
						}, config.autoWatchBatchDelay)
					)

					function putDep(entry, path, map) {
						const dep = dependencies[path]
						if (!map || map[path] !== true) {
							delete dep.entries[entry]
						}
						return --dep.count === 0
					}

					return function watch(entry, entryDeps) {
						if (hasNullByte(entry)) return

						const oldEntryDeps = entries[entry],
							entryDepDict = {}

						entryDeps = entryDeps.filter(
							path => !hasNullByte(path) && entryDepDict[path] !== true && (entryDepDict[path] = true)
						)

						const adds = entryDeps.filter(path => {
							const dep = dependencies[path] || (dependencies[path] = { count: 0, entries: {} })
							dep.entries[entry] = true
							return ++dep.count === 1
						})

						const dels = oldEntryDeps ? oldEntryDeps.filter(path => putDep(entry, path, entryDepDict)) : []

						entries[entry] = entryDeps

						if (!oldEntryDeps) {
							log[logWatch]('Watching entry: %s', relativePath(entry))
							entryWatcher.add(entry)
						}

						if (adds.length) {
							log[logWatch]('Watching dependencies: %s', relativePath(adds).join(', '))
							depWatcher.add(adds)
						}

						if (dels.length) {
							log[logWatch]('Unwatching dependencies: %s', relativePath(dels).join(', '))
							depWatcher.unwatch(dels)
						}
					}
			  })()
			: function() {}

	return async function preprocess(original, file, done) {
		const input = file.originalPath,
			location = relativePath(input),
			opts = Object.assign({}, options, {
				input,
				cache: cache[input]
			})

		file.path = transformPath(input)

		try {
			const bundle = await rollup.rollup(opts)
			cache[input] = bundle.cache

			watch(bundle.watchFiles[0], bundle.watchFiles.slice(1))

			const { output } = await bundle.generate(opts)

			log.info('Generating bundle for %s', location)

			for (const result of output) {
				if (!result.isAsset) {
					const { code, map } = result
					const { sourcemap } = opts.output

					file.sourceMap = map

					const processed = sourcemap === 'inline' ? code + `\n//# sourceMappingURL=${map.toUrl()}\n` : code

					log.info('Generated bundle for %s: %s', location, file.path)
					return done(null, processed)
				}
			}
			log.warn('Generated empty bundle for %s', location)
			done(null, original)
		} catch (error) {
			log.error('Generated bundle for %s with error: %s\n\n%s\n', location, error.message, error.stack)
			done(error, null)
		}
	}
}

createPreprocessor.$inject = ['args', 'config', 'emitter', 'logger']

module.exports = { 'preprocessor:rollup': ['factory', createPreprocessor] }
