const { removeExt } = require('./path.cjs')

/*
A plugin for esbuild
While generating production .cjs files, cjs files that import other local cjs must use
an explicit extension to avoid confusion with the .js files
*/
module.exports = {
  name: 'cjs-path-transform',
  setup(build) {
    // match relative imports like './something'
    build.onResolve({ filter: /\.\/(.*)$/ }, (args) => {
      if (args.kind !== 'entry-point') {
        return { path: removeExt(args.path) + '.cjs', external: true }
      }
    })
  },
}