const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const isBinary = require('isbinaryfile')
const mergeDeps = require('./util/mergeDeps')
const { getPluginLink, toShortPluginId } = require('../../cli-shared-utils')

const isString = val => typeof val === 'string'
const isFunction = val => typeof val === 'function'
const isObject = val => val && typeof val === 'object'

class GeneratorAPI {
  /**
   * @param {string} id - Id of the owner plugin
   * @param {Generator} generator - The invoking Generator instance
   * @param {object} options - generator options passed to this plugin
   * @param {object} rootOptions - root options (the entire preset)
   */
  constructor (id, generator, options, rootOptions) {
    this.id = id
    this.generator = generator
    this.options = options
    this.rootOptions = rootOptions

    this.pluginsData = generator.plugins
      .filter(({ id }) => id !== `@vue/cli-service`)
      .map(({ id }) => ({
        name: id, //toShortPluginId(id),
        link: id // getPluginLink(id)
      }))

    // this._entryFile = undefined
  }

  /**
   * Extend the package.json of the project.
   * Nested fields are deep-merged unless `{ merge: false }` is passed.
   * Also resolves dependency conflicts between plugins.
   * Tool configuration fields may be extracted into standalone files before
   * files are written to disk.
   *
   * @param {object | () => object} fields - Fields to merge.
   */
  extendPackage (fields) {
    const pkg = this.generator.pkg
    const toMerge = isFunction(fields) ? fields(pkg) : fields
    for (const key in toMerge) {
      const value = toMerge[key]
      const existing = pkg[key]
      if (isObject(value) && (key === 'dependencies' || key === 'devDependencies')) {
        // use special version resolution merge
        pkg[key] = mergeDeps(
          this.id,
          existing || {},
          value,
          this.generator.depSources
        )
      } else if (!(key in pkg)) {
        pkg[key] = value
      } else if (Array.isArray(value) && Array.isArray(existing)) {
        pkg[key] = mergeArrayWithDedupe(existing, value)
      } else if (isObject(value) && isObject(existing)) {
        pkg[key] = merge(existing, value, { arrayMerge: mergeArrayWithDedupe })
      } else {
        pkg[key] = value
      }
    }
  }

   /**
   * Inject a file processing middleware.
   *
   * @private
   * @param {FileMiddleware} middleware - A middleware function that receives the
   *   virtual files tree object, and an ejs render function. Can be async.
   */
  _injectFileMiddleware (middleware) {
    this.generator.fileMiddlewares.push(middleware)
  }

  /**
   * Check if the project has a given plugin.
   *
   * @param {string} id - Plugin id, can omit the (@vue/|vue-|@scope/vue)-cli-plugin- prefix
   * @return {boolean}
   */
  hasPlugin (id) {
    return ['babel'].indexOf(id) > -1
  }

  /**
   * Resolves the data when rendering templates.
   *
   * @private
   */
  _resolveData (additionalData) {
    return Object.assign({
      options: this.options,
      rootOptions: this.rootOptions,
      plugins: this.pluginsData
    }, additionalData)
  }

  /**
   * Render template files into the virtual files tree object.
   *
   * @param {string | object | FileMiddleware} source -
   *   Can be one of:
   *   - relative path to a directory;
   *   - Object hash of { sourceTemplate: targetFile } mappings;
   *   - a custom file middleware function.
   * @param {object} [additionalData] - additional data available to templates.
   * @param {object} [ejsOptions] - options for ejs.
   */
  render (source, additionalData = {}, ejsOptions = {}) {
    const baseDir = extractCallDir()
    if (isString(source)) {
      source = path.resolve(baseDir, source)
      this._injectFileMiddleware(async (files) => {
        const data = this._resolveData(additionalData)
        const globby = require('globby')
        const _files = await globby(['**/*'], { cwd: source })
        for (const rawPath of _files) {
          const targetPath = rawPath.split('/').map(filename => {
            // dotfiles are ignored when published to npm, therefore in templates
            // we need to use underscore instead (e.g. "_gitignore")
            if (filename.charAt(0) === '_' && filename.charAt(1) !== '_') {
              return `.${filename.slice(1)}`
            }
            if (filename.charAt(0) === '_' && filename.charAt(1) === '_') {
              return `${filename.slice(1)}`
            }
            return filename
          }).join('/')
          const sourcePath = path.resolve(source, rawPath)
          const content = renderFile(sourcePath, data, ejsOptions)
          // only set file if it's not all whitespace, or is a Buffer (binary files)
          if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
            files[targetPath] = content
          }
        }
      })
    }
  }
}

function extractCallDir () {
  // extract api.render() callsite file location using error stack
  const obj = {}
  Error.captureStackTrace(obj)
  const callSite = obj.stack.split('\n')[3]
  const fileName = callSite.match(/\s\((.*):\d+:\d+\)$/)[1]
  return path.dirname(fileName)
}


const replaceBlockRE = /<%# REPLACE %>([^]*?)<%# END_REPLACE %>/g

function renderFile (name, data, ejsOptions) {
  if (isBinary.isBinaryFileSync(name)) {
    return fs.readFileSync(name) // return buffer
  }
  const template = fs.readFileSync(name, 'utf-8')

  // custom template inheritance via yaml front matter.
  // ---
  // extend: 'source-file'
  // replace: !!js/regexp /some-regex/
  // OR
  // replace:
  //   - !!js/regexp /foo/
  //   - !!js/regexp /bar/
  // ---
  const yaml = require('yaml-front-matter')
  const parsed = yaml.loadFront(template)
  const content = parsed.__content
  let finalTemplate = content.trim() + `\n`
  if (parsed.extend) {
    const extendPath = path.isAbsolute(parsed.extend)
      ? parsed.extend
      : resolve.sync(parsed.extend, { basedir: path.dirname(name) })
    finalTemplate = fs.readFileSync(extendPath, 'utf-8')
    if (parsed.replace) {
      if (Array.isArray(parsed.replace)) {
        const replaceMatch = content.match(replaceBlockRE)
        if (replaceMatch) {
          const replaces = replaceMatch.map(m => {
            return m.replace(replaceBlockRE, '$1').trim()
          })
          parsed.replace.forEach((r, i) => {
            finalTemplate = finalTemplate.replace(r, replaces[i])
          })
        }
      } else {
        finalTemplate = finalTemplate.replace(parsed.replace, content.trim())
      }
    }
    if (parsed.when) {
      finalTemplate = (
        `<%_ if (${parsed.when}) { _%>` +
          finalTemplate +
        `<%_ } _%>`
      )
    }
  }

  return ejs.render(finalTemplate, data, ejsOptions)
}


module.exports = GeneratorAPI