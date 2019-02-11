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
    child.stderr.on('data', buf => {
      const str = buf.toString()
      if (/warning/.test(str)) {
        return
      }
  
      // // progress bar
      // const progressBarMatch = str.match(/\[.*\] (\d+)\/(\d+)/)
      // if (progressBarMatch) {
      //   // since yarn is in a child process, it's unable to get the width of
      //   // the terminal. reimplement the progress bar ourselves!
      //   renderProgressBar(progressBarMatch[1], progressBarMatch[2])
      //   return
      // }
  
      process.stderr.write(buf)
    })

    child.on('close', code => {
      if (code !== 0) {
        reject(`command failed: ${command} ${args.join(' ')}`)
        return
      }
      resolve()
    })
  })
}

exports.installDeps = async function installDeps (targetDir, command, cliRegistry) {
  const args = []

  await addRegistryToArgs(command, args, cliRegistry)

  await executeCommand(command, args, targetDir)
  
}
