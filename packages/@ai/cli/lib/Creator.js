const chalk = require('chalk')

const {
  defaults
} = require('./options')

const {
  logWithSpinner
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

    var s = 1
  }

  async promptAndResolvePreset (answers = null) {

  }

  async resolvePreset (name, clone) {

  }
}