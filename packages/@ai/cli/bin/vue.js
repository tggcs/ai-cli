const program = require('commander')

program
  .version(require('../package').version)
  .usage('<command> [options]')

program
  .command('create <app-name>')
  .description('create a new project powered by ai-cli-service')
  .action((name, cmd) => {
    const options = {}

    require('../lib/create')(name, options)
  })


program.parse(process.argv)