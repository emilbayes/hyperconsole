var assert = require('nanoassert')
var websocket = require('websocket-stream')
var hypercore = require('hypercore')
var crypto = require('hypercore/lib/crypto')
var ram = require('random-access-memory')
var pump = require('pump')
var EventEmitter = require('events').EventEmitter
var format = require('quick-format-unescaped')

var LOG_VERSION = 1
var LOG_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10
}

module.exports = function (url, seed) {
  if (typeof seed === 'string') {
    buf = Buffer.alloc(32)
    buf.write(seed)
    seed = buf
  }

  assert(seed == null ? true : Buffer.isBuffer(seed), 'seed must be Buffer')
  assert(seed == null ? true : seed.length === 32, 'seed must be 32 bytes')

  var bus = new EventEmitter()
  var kp = crypto.keyPair(seed)
  var log = hypercore(ram, kp.publicKey, {
    secretKey: kp.secretKey,
    sparse: true
  })

  var queue = []

  log.once('remote-update', function () {
    if (log.remoteLength === 0) return drain()

    log.update(function (err) {
      if (err) return bus.emit('error', err)
      drain()
    })
  })

  function drain () {
    while(queue.length) {
      log.append(queue.shift(), onappend)
    }

    queue = null
  }

  var discoveryKey = log.discoveryKey.toString('hex')

  replicate()

  bus.log = write.bind(null, 'debug')
  bus.info = write.bind(null, 'info')
  bus.warn = write.bind(null, 'warn')
  bus.error = write.bind(null, 'error')

  // Non standard
  bus.fatal = write.bind(null, 'fatal')
  bus.debug = write.bind(null, 'debug')
  bus.trace = write.bind(null, 'trace')

  return bus

  function onappend (err, index) {
    if (err) return bus.emit('error', err)
    bus.emit('append', index)
  }

  function write () {
    var args = Array.prototype.slice.call(arguments)
    var levelTag = args.shift()
    var msg = args[0]
    var lvl = LOG_LEVELS[levelTag]
    var o = {key: discoveryKey, time: Date.now(), level: lvl}
    // deliberate, catching objects, arrays
    if (msg !== null && typeof msg === 'object') {
      while(typeof args[0] === 'object') {
        var obj = args.shift()
        var isObj = obj !== undefined && obj !== null
        var isErr = isObj && obj instanceof Error
        if (isErr) {
          Object.assign(o, {error: serialiseErr(obj)})
          continue
        }
        if (isObj) {
          Object.assign(o, obj)
          continue
        }
      }
      msg = args.length ? format(args) : undefined
    } else if (typeof msg === 'string') msg = format(args)
    if (msg !== undefined) o.msg = msg
    append(o)
  }

  function append(obj) {
    var msg = JSON.stringify(obj) + '\n'
    if (queue) queue.push(msg)
    else log.append(msg, onappend)
  }

  function replicate () {
    bus.emit('replicate')
    var ws = websocket(url)
    pump(ws, log.replicate({live: true, download: true}), ws, function (err) {
      if (err) return bus.emit('error', err)
      setTimeout(replicate, 1000)
    })
  }
}

function serialiseErr (err) {
  var obj = {
    type: err.constructor.name,
    message: err.message,
    stack: err.stack
  }
  for (var key in err) {
    if (obj[key] === undefined) {
      obj[key] = err[key]
    }
  }
  return obj
}
