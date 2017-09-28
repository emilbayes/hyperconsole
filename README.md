# `hyperconsole`

> Console logging over hypercore

Still WIP

## Usage

```js
var hyperconsole = require('hyperconsole')

var logger = hyperconsole('ws://hypercored.cloud', 'my-private-seed')
require('hyperconsole/patch')(logger) // Patch console.{log,info,warn,error} and global error event
```

## API

### `var instance = hyperconsole(wsUrl, [keypairSeed])`

## Install

```sh
npm install hyperconsole
```

## License

[ISC](LICENSE)
