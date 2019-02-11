exports.getPluginLink = id => {
  if (officialRE.test(id)) {
    return `https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-${
      exports.toShortPluginId(id)
    }`
  }
  let pkg = {}
  try {
    pkg = require(`${id}/package.json`)
  } catch (e) {}
  return (
    pkg.homepage ||
    (pkg.repository && pkg.repository.url) ||
    `https://www.npmjs.com/package/${id.replace(`/`, `%2F`)}`
  )
}