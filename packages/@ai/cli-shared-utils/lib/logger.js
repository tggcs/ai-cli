function _log (type, tag, message) {
  if (process.env.VUE_CLI_API_MODE && message) {
    exports.events.emit('log', {
      message,
      type,
      tag
    })
  }
}


exports.log = (msg = '', tag = null) => {
  _log('log', tag, msg)
}