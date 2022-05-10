const path = require('path')
const fs = require('fs/promises')
const esbuild = require('esbuild')
const { getPkgConfig } = require('./lib/pkgAnalyze.cjs')

bundlePkgJS(
  process.cwd(),
  process.argv.slice(2).includes('--watch'),
).catch(() => process.exit(1))

const target = 'es2018' // too recent for Edge?

async function bundlePkgJS(pkgDir, watch) {
  const pkgConfig = await getPkgConfig(pkgDir)
  const [entryMap, naiveEntryMap] = await queryEntrySources(pkgDir)
  const outdir = path.join(pkgDir, 'dist')
  const sourcemapOptions = {
    sourcemap: 'linked', // generate sourcemaps & reference via a comment
    sourcesContent: watch, // for non-watch, don't copy all source code into map
  }

  return Promise.all([
    buildEntryPoints('esm', '.mjs'),
    !watch && buildEntryPoints('cjs', '.cjs'),
    !watch && buildGlobalEntryPoints(),
  ])

  function buildEntryPoints(format, outExt) {
    return esbuild.build({
      entryPoints: entryMap,
      bundle: true,
      watch,
      format,
      target,
      outdir,
      outExtension: { '.js': outExt },
      ...sourcemapOptions,
      external: Object.keys(pkgConfig.dependencies || {}),
      plugins: [localPathRewriting(naiveEntryMap, outExt)],
    })
  }

  function buildGlobalEntryPoints() {
    const globalEntryMap = filterMap(
      entryMap,
      (modulePath, moduleId) => moduleId === 'global',
    )
    return esbuild.build({
      entryPoints: globalEntryMap,
      bundle: true,
      watch,
      format: 'iife',
      target,
      outdir, // will output as .js by default
      ...sourcemapOptions,
    })
  }
}

async function queryEntrySources(pkgDir) {
  const srcDir = path.join(pkgDir, 'src')
  const entryMap = {}
  const entryMapOverrides = {}

  if (await isDirectory(srcDir)) {
    const filenames = await fs.readdir(srcDir)

    for (const filename of filenames) {
      const fullPath = path.resolve(srcDir, filename)
      let match
      if (
        (match = filename.match(/^(.*)\.build\.ts$/))
      ) {
        entryMapOverrides[match[1]] = fullPath
      } else if (
        !filename.match(/\.d\.ts$/) &&
        (match = filename.match(/^(.*)\.ts$/))
      ) {
        entryMap[match[1]] = fullPath
      }
    }
  }

  return [
    { ...entryMap, ...entryMapOverrides }, // entryMap
    entryMap, // naiveEntryMap
  ]
}

function localPathRewriting(naiveEntryMap, outExt) {
  const naiveEntryFullPathMap = strArrayToMap(Object.values(naiveEntryMap))
  return {
    name: 'local path rewriting',
    setup(build) {
      build.onResolve({ filter: /^\.\// }, (args) => {
        const fullPath = path.resolve(args.resolveDir, args.path) + '.ts'

        // importing an entry point?
        // if so, don't bundle. reference the file (with appropriate extension) instead
        if (naiveEntryFullPathMap[fullPath]) {
          return { path: args.path + outExt, external: true }
        }
      })
    },
  }
}

function isDirectory(path) {
  return fs.lstat(path)
    .then((stat) => stat.isDirectory())
    .catch(() => false)
}

function strArrayToMap(a) {
  const map = {}

  for (const str of a) {
    map[str] = true
  }

  return map
}

function filterMap(map, func) {
  const newMap = {}

  for (const key in map) {
    if (func(map[key], key)) {
      newMap[key] = map[key]
    }
  }

  return newMap
}
