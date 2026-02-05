# CDN-Proxy-Server-in-Node.js-
CDN Proxy Server in Node.js 

# CDN Proxy Server

A simple CDN proxy server built with traditional Node.js JavaScript (no modern syntax, no external dependencies).

## Features

- ✅ Caches CDN resources for 1 hour
- ✅ Whitelist of allowed CDN domains for security
- ✅ Automatic cache cleanup
- ✅ CORS enabled
- ✅ Traditional JavaScript (var, function declarations)
- ✅ No external dependencies (only built-in Node.js modules)

## Installation

No installation required! Just Node.js.

## Usage

1. Start the server:
```bash
node cdn-proxy-server.js
```

2. Access CDN resources through the proxy:
```
http://localhost:3000/?url=CDN_URL
```

## Examples

### jQuery from jsDelivr
```
http://localhost:3000/?url=https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
```

### Lodash from Cloudflare
```
http://localhost:3000/?url=https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js
```

### Bootstrap CSS
```
http://localhost:3000/?url=https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css
```

## Allowed CDN Domains

- cdn.jsdelivr.net
- cdnjs.cloudflare.com
- unpkg.com
- code.jquery.com
- stackpath.bootstrapcdn.com
- maxcdn.bootstrapcdn.com
- fonts.googleapis.com
- fonts.gstatic.com

## Configuration

You can modify these variables in the code:

- `PORT`: Server port (default: 3000)
- `CACHE_MAX_AGE`: Cache duration in milliseconds (default: 3600000 = 1 hour)
- `ALLOWED_DOMAINS`: Array of whitelisted CDN domains

## Cache Headers

The proxy adds these headers to responses:

- `X-Proxy-Cache`: Either "HIT" (served from cache) or "MISS" (fetched from CDN)
- `X-Cache-Age`: Age of cached content in seconds (only for cache hits)
- `Access-Control-Allow-Origin`: Set to "*" for CORS support

## Stopping the Server

Press `Ctrl+C` to gracefully shutdown the server.

## Technical Details

- Built with Node.js core modules: http, https, url, path
- No arrow functions
- Uses `var` instead of `const`/`let`
- Traditional function declarations
- In-memory caching
- Automatic cache expiration

