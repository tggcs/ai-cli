const chalk = require('chalk')
const Generator = require('./Generator')
const writeFileTree = require('./util/writeFileTree')
const { installDeps } = require('./util/installDeps')
// const sortObject = require('./util/sortObject')


const {
  defaults
} = require('./options')

const {
  logWithSpinner,
  stopSpinner,
  loadModule
} = require('../../cli-shared-utils')

module.exports = class Creator {
  constructor (name, context) {
    this.name = name
    this.context = context

  }

  async create (cliOptions = {}, preset = null) {
    const { run, name, context, createCompleteCbs} = this

    preset = defaults.presets.default

    // inject core service
    preset.plugins['@vue/cli-service'] = Object.assign({
      projectName: name
    }, preset, {
      bare: cliOptions.bare
    })

    const packageManager = "yarn"
    logWithSpinner(`✨`, `Creating project in ${chalk.yellow(context)}.`)

    // Let me write it dead for now
    const latest = "3.4.0"

    const pkg = {
      name,
      version: '0.1.0',
      private: true,
      devDependencies: {}
    }
    const deps = Object.keys(preset.plugins)
    deps.forEach(dep => {
      pkg.devDependencies[dep] = `^${latest}`
    })

    // write package.json
    await writeFileTree(context, {
      'package.json': JSON.stringify(pkg, null, 2)
    })

    stopSpinner()
    console.log(`⚙  Installing CLI plugins. This might take a while...`)

    // await installDeps(context, packageManager, cliOptions.registry)

    const plugins = await this.resolvePlugins(preset.plugins)
    
    // run generator
    const generator = new Generator(context, {
      pkg,
      plugins,
      completeCbs: createCompleteCbs
    })
    await generator.generate({
      extractConfigFiles: preset.useConfigFiles
    })
    var s = 1
  }

  async resolvePlugins (rawPlugins) {
    const plugins = []
    for (const id of Object.keys(rawPlugins)) {
      const apply = loadModule(`${id}/generator`, this.context) || (() => {})
      let options = rawPlugins[id] || {}
      plugins.push({ id, apply, options })
    }
    return plugins
  }

  async promptAndResolvePreset (answers = null) {

  }

  async resolvePreset (name, clone) {

  }
}