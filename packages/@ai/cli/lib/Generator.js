const ejs = require('ejs')
const GeneratorAPI = require('./GeneratorAPI')
const writeFileTree = require('./util/writeFileTree')

const ensureEOL = str => {
  if (str.charAt(str.length - 1) !== '\n') {
    return str + '\n'
  }
  return str
}


module.exports = class Generator {
  constructor (context, {
    pkg = {},
    plugins = [],
    completeCbs = [],
    files = {},
    invoking = false
  } = {}) {
    this.context = context
    this.plugins = plugins
    this.originalPkg = pkg
    this.pkg = Object.assign({}, pkg)
    this.completeCbs = completeCbs
    this.invoking = invoking
    // virtual file tree
    this.files = files
    this.fileMiddlewares = []
    // for conflict resolution
    this.depSources = {}

    const cliService = plugins.find(p => p.id === '@vue/cli-service')
    const rootOptions = cliService.options
    // apply generators from plugins
    plugins.forEach(({ id, apply, options }) => {
      const api = new GeneratorAPI(id, this, options, rootOptions)
      apply(api, options, rootOptions, invoking)
    })
  }

  async generate ({
    extractConfigFiles = false,
    checkExisting = false
  } = {}) {
    // save the file system before applying plugin for comparison
    const initialFiles = Object.assign({}, this.files)
    // extract configs from package.json into dedicated files.
    this.extractConfigFiles(extractConfigFiles, checkExisting)
    // wait for file resolve
    await this.resolveFiles()
    this.files['package.json'] = JSON.stringify(this.pkg, null, 2) + '\n'
    // write/update file tree to disk
    await writeFileTree(this.context, this.files, initialFiles)
    var s = 1
  }

  extractConfigFiles (extractAll, checkExisting) {
    const configTransforms = Object.assign({},
      this.configTransforms,
    )
    const extract = key => {
      if (key == 'babel') {
        let str = `module.exports = {
                    presets: [
                      '@vue/app'
                    ]
                  }`
        this.files['babel.config.js'] = ensureEOL(str)
        delete this.pkg[key]
      }
    }
    if (extractAll) {
      for (const key in this.pkg) {
        extract(key)
      }
    } else {
      if (!process.env.VUE_CLI_TEST) {
        // by default, always extract vue.config.js
        extract('vue')
      }
      // always extract babel.config.js as this is the only way to apply
      // project-wide configuration even to dependencies.
      // TODO: this can be removed when Babel supports root: true in package.json
      extract('babel')
    }
  }

  async resolveFiles () {
    const files = this.files
    for (const middleware of this.fileMiddlewares) {
      await middleware(files, ejs.render)
    }

    // // normalize file paths on windows
    // // all paths are converted to use / instead of \
    // normalizeFilePaths(files)

    // // handle imports and root option injections
    // Object.keys(files).forEach(file => {
    //   files[file] = injectImportsAndOptions(
    //     files[file],
    //     this.imports[file],
    //     this.rootOptions[file]
    //   )
    // })

    // for (const postProcess of this.postProcessFilesCbs) {
    //   await postProcess(files)
    // }
  }
}