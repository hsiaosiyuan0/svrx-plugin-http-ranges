## svrx-plugin-http-ranges

[![svrx](https://img.shields.io/badge/svrx-plugin-%23ff69b4?style=flat-square)](https://svrx.io/)
[![npm](https://img.shields.io/npm/v/svrx-plugin-http-ranges.svg?style=flat-square)](https://www.npmjs.com/package/svrx-plugin-http-ranges)

A [Server-X](https://github.com/svrxjs/svrx) plugin to demonstrate how to handle HTTP range requests, more specifically it's used as the server to develop your custom [Media Source Extension](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API) strategy.

## Usage

> Please make sure that you have installed [svrx](https://svrx.io/) already.

### Via CLI

```bash
svrx -p http-ranges
```

### Via API

```js
const svrx = require("@svrx/svrx");

svrx({ plugins: ["http-ranges"] }).start();
```

## Options

1. just put the `.mp4` files under any of those directories your current running svrx instance has permission to access to, eg. `process.cwd()/videos/1.mp4`

2. check if the service is standing by:
   
   `curl http://localhost:8000/videos/1.mp4 -i -H "Range: bytes=0-50, 100-150"`

## License

MIT
