const path = require('path')
const fs = require('fs/promises')
const { analyzePkgConfig, getPkgConfig } = require('../lib/pkgAnalyze.cjs')
const resolve = require('@rollup/plugin-node-resolve').default
const sucrase = require('@rollup/plugin-sucrase')
const dts = require('rollup-plugin-dts').default
const { createTypeInputHash, typePreparing } = require('../lib/pkgTypes.cjs')

module.exports = {
  buildPkgBundleConfigs,
}

const watchOptions = {
  buildDelay: 100,
  clearScreen: false, // don't clear tsc's concurrent output (see preserveWatchOutput)
}

async function buildPkgBundleConfigs(pkgDir, commandLineArgs) {
  const { watch } = commandLineArgs
  const pkgConfig = await getPkgConfig(pkgDir)
  const pkgAnalysis = analyzePkgConfig(pkgConfig)
  const { entryPoints, entryPointTypes, globalEntryPoints, dependencyNames } = pkgAnalysis

  const configs = globalEntryPoints.map((globalEntryPoint) => ({
    input: path.join(pkgDir, globalEntryPoint),
    external: dependencyNames,
    output: buildGlobalOutputConfig(pkgDir),
    watch: watchOptions,
    plugins: buildPlugins(watch),
  }))

  if (entryPoints.length) {
    configs.push({
      input: entryPoints.map((f) => path.join(pkgDir, f)),
      external: dependencyNames,
      output: [
        buildOutputConfig(pkgDir, 'es', '.mjs', true),
        buildOutputConfig(pkgDir, 'cjs', '.cjs', true),
      ],
      watch: watchOptions,
      plugins: buildPlugins(watch),
    })
  }

  if (entryPointTypes.length && !watch) {
    configs.push({
      input: createTypeInputHash(entryPointTypes.map((f) => path.join(pkgDir, f))),
      external: dependencyNames,
      output: buildOutputConfig(pkgDir, 'es', '.d.ts', false),
      plugins: [dts(), typePreparing(pkgDir)],
    })
  }

  return configs
}

// Output config
// -------------------------------------------------------------------------------------------------

function buildOutputConfig(pkgDir, format, extension, sourcemap) {
  return {
    format,
    dir: path.join(pkgDir, 'dist'),
    entryFileNames: '[name]' + extension,
    chunkFileNames: 'common-[hash]' + extension,
    sourcemap,
    sourcemapExcludeSources: true,
  }
}

function buildGlobalOutputConfig(pkgDir) {
  return {
    format: 'iife',
    dir: path.join(pkgDir, 'dist'),
    // no code splitting
    sourcemap: true,
    sourcemapExcludeSources: true,
  }
}

// Rollup plugins
// -------------------------------------------------------------------------------------------------

function buildPlugins(watch) {
  return [
    resolve({
      extensions: ['.js', '.ts'],
    }),
    sucrase({ // NOTE: rollup-plugin-esbuild didn't generate sourcemaps correctly
      transforms: ['typescript'],
      disableESTransforms: true,
    }),
    tsFileOverriding('.build.ts'),
    // NOTE: rollup-plugin-terser didn't generate sourcemaps correctly
  ]
}

// a Rollup plugin
function tsFileOverriding(forcedExtension) {
  return {
    async load(id) {
      const match = id.match(/^(.*)\.ts$/)
      if (match) {
        const altPath = match[1] + forcedExtension
        try {
          const contents = await fs.readFile(altPath, 'utf8')
          this.addWatchFile(altPath) // watch the alt file
          return contents
        } catch (err) {}
      }
      return null
    },
  }
}
