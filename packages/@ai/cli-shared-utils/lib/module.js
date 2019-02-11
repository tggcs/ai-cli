exports.resolveModule = function (request, context) {
  let resolvedPath
  try {
    resolvedPath = require.resolve(request, {
      paths: [context]
    })
  } catch (e) {}
  return resolvedPath
}


exports.loadModule = function (request, context, force = false) {
  const resolvedPath = exports.resolveModule(request, context)
  if (resolvedPath) {
    if (force) {
      // clearRequireCache(resolvedPath)
    }
    return require(resolvedPath)
  }
}