const program = require('commander')

program
  .version(require('../package').version)
  .usage('<command> [options]')

  program
  .command('create <app-name>')
  .description('create a new project powered by ai-cli-service')
  .action((name, cmd) => {
    const options = cleanArgs(cmd)

    require('../lib/create')(name, options)
  })


program.parse(process.argv)

// commander passes the Command object itself as options,
// extract only actual options into a fresh object.
function cleanArgs (cmd) {
  const args = {}
  cmd.options.forEach(o => {
    const key = camelize(o.long.replace(/^--/, ''))
    // if an option is not present and Command has a method with the same name
    // it should not be copied
    if (typeof cmd[key] !== 'function' && typeof cmd[key] !== 'undefined') {
      args[key] = cmd[key]
    }
  })
  return args
}