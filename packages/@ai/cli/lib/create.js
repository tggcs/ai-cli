const path = require('path')
const Creator = require('./Creator')

async function create (projectName, options) {
  const cwd = process.cwd()
  const targetDir = path.resolve(cwd, projectName || '.')
  const creator = new Creator(projectName, targetDir)
  await creator.create(options)
}

module.exports = (...args) => {
  return create(...args)
}