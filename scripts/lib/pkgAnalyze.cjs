const path = require('path')
const fs = require('fs/promises')
const minimatch = require('minimatch')

module.exports = {
  getPkgConfig,
  analyzePkgConfig,
}

async function getPkgConfig(dir) {
  const rawData = await fs.readFile(path.join(dir, 'package.json'))
  return JSON.parse(rawData)
}

function analyzePkgConfig(pkgConfig) {
  const pkgName = pkgConfig.name

  if (pkgConfig.type !== 'module') {
    throw new Error(`[${pkgName}] Must specify "type":"module"`)
  }
  ['main', 'module', 'types'].forEach((prop) => {
    if (!pkgConfig[prop]) {
      throw new Error(`[${pkgName}] Must specify "${prop}"`)
    }
  })

  const exportsHash = normalizeExportsHash(pkgConfig.exports || {})
  const defaultExport = exportsHash['.']

  if (typeof defaultExport !== 'object' || !defaultExport) {
    throw new Error(`[${pkgName}] Must specify default "." export`)
  }
  if (defaultExport.import !== pkgConfig.module) {
    throw new Error(`[${pkgName}] default export must be consistent with pkg.module`)
  }
  if (defaultExport.require !== pkgConfig.main) {
    throw new Error(`[${pkgName}] default export must be consistent with pkg.main`)
  }

  const sideEffectsArray = Array.isArray(pkgConfig.sideEffects) ? pkgConfig.sideEffects : []
  const entryPoints = []
  const entryPointTypes = []
  const globalEntryPoints = [] // need this anymore?

  for (const exportId in exportsHash) {
    const exportPaths = exportsHash[exportId]
    const importPath = exportPaths.import || ''
    const requirePath = exportPaths.require || ''
    const importPathNoExt = importPath.replace(/\.mjs$/, '')
    const requirePathNoExt = requirePath.replace(/\.cjs$/, '')

    if (importPathNoExt !== requirePathNoExt) {
      throw new Error(`[${pkgName}] Inconsistent "import" and "require"`)
    }

    const match = importPathNoExt.match(/\.\/dist\/(.*)$/)
    if (match) {
      const entryPoint = './src/' + match[1] + '.ts'
      entryPoints.push(entryPoint)
      entryPointTypes.push(importPathNoExt + '.d.ts')

      for (const sideEffectsGlob of sideEffectsArray) {
        if (minimatch(importPath, sideEffectsGlob)) {
          globalEntryPoints.push(entryPoint)
          break
        }
      }
    }
  }

  // is there building? check the package.json's "files" array
  if (entryPoints.length) {
    const fileGlobs = pkgConfig.files || []
    const hasTypesHackFiles = fileGlobs.includes('/*.d.ts')
    const hasMultExports = Object.keys(exportsHash).length > 1

    ;['/dist', '/src'].forEach((glob) => {
      if (!fileGlobs.includes(glob)) {
        throw new Error(`Must include "${glob}" in "files" array`)
      }
    })

    if (hasTypesHackFiles !== hasMultExports) {
      throw new Error(
        (hasMultExports ? 'Must have' : 'Must NOT have') +
        '"/*.d.ts" included in the "files" array',
      )
    }
  }

  return {
    entryPoints, // in src
    entryPointTypes, // in dist
    globalEntryPoints,
    dependencyNames: Object.keys(pkgConfig.dependencies || {}),
  }
}

/*
The package.json "exports" hash can take two forms:
1. { require, import }
2. { ".": { require, import } }
Normalize to the 2nd
*/
function normalizeExportsHash(obj) {
  let hasPaths = false

  for (const key in obj) {
    if (key.match(/^\./)) {
      hasPaths = true
      break
    }
  }

  if (hasPaths) {
    return obj
  }

  return { '.': obj }
}
