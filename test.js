var hyperconsole = require('.')

var logger = hyperconsole('ws://localhost:9000', 'blue')
console.log(require('./patch')(logger))

console.log('Hello world!!')

setTimeout(function () {
  throw new Error('Test error')
}, 5000)
