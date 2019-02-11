const chalk = require('chalk')
const writeFileTree = require('./util/writeFileTree')
const { installDeps } = require('./util/installDeps')
const sortObject = require('./util/sortObject')


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
    const { run, name, context} = this

    preset = defaults.presets.default

    // inject core service
    preset.plugins['@vue/cli-service'] = Object.assign({
      projectName: name
    }, preset, {
      bare: cliOptions.bare
    })

    const packageManager = "yarn"
    logWithSpinner(`✨`, `Creating project in ${chalk.yellow(context)}.`)

    const latest = require(`../package.json`).version
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

    await installDeps(context, packageManager, cliOptions.registry)

    const plugins = await this.resolvePlugins(preset.plugins)
    
    var s = 1
  }

  async resolvePlugins (rawPlugins) {
    // ensure cli-service is invoked first
    rawPlugins = sortObject(rawPlugins, ['@vue/cli-service'], true)
    const plugins = []
    for (const id of Object.keys(rawPlugins)) {
      const apply = loadModule(`${id}/generator`, this.context) || (() => {})
      let options = rawPlugins[id] || {}
      if (options.prompts) {
        const prompts = loadModule(`${id}/prompts`, this.context)
        if (prompts) {
          log()
          log(`${chalk.cyan(options._isPreset ? `Preset options:` : id)}`)
          options = await inquirer.prompt(prompts)
        }
      }
      plugins.push({ id, apply, options })
    }
    return plugins
  }

  async promptAndResolvePreset (answers = null) {

  }

  async resolvePreset (name, clone) {

  }
}