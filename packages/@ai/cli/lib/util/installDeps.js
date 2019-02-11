const execa = require('execa')
const registries = require('./registries')
const taobaoDistURL = 'https://npm.taobao.org/dist'

async function addRegistryToArgs (command, args, cliRegistry) {
  const altRegistry = registries.taobao

  if (altRegistry) {
    args.push(`--registry=${altRegistry}`)
    if (altRegistry === registries.taobao) {
      args.push(`--disturl=${taobaoDistURL}`)
    }
  }
}

function executeCommand (command, args, targetDir) {
  return new Promise((resolve, reject) => {
    const child = execa(command, args, {
      cwd: targetDir,
      stdio: ['inherit', 'inherit', 'pipe']
    })
  })
}

exports.installDeps = async function installDeps (targetDir, command, cliRegistry) {
  const args = []

  await addRegistryToArgs(command, args, cliRegistry)

  await executeCommand(command, args, targetDir)
  
}
