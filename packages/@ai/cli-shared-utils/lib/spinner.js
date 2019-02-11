const ora = require('ora')

const spinner = ora()

exports.logWithSpinner = (symbol, msg) => {
  spinner.text = ' ' + msg
  spinner.start()
}

exports.stopSpinner = (persist) => {
  spinner.stop()
}