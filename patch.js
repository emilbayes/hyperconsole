module.exports = function (instance) {
  var G = window != null ? window : (global != null ? global : null)

  if (G == null) return 'Unable to patch'

  ;['log', 'error', 'warn', 'info'].forEach(function (m) {
    var orig = console[m]
    G.console[m] = function () {
      orig.apply(this, arguments)
      instance[m].apply(instance, arguments)
    }
  })

  try {
    G.addEventListener('error', function (ev) {
      instance.error(ev.error, {
        timestamp: ev.timestamp,
        message: ev.message,
        lineno: ev.lineno,
        colno: ev.colno,
        filename: ev.filename,
        type: ev.type
      })
    })
  } catch (ex) {}
}
