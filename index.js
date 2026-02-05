var http = require('http');
var https = require('https');
var url = require('url');
var path = require('path');

// Configuration
var PORT = 3000;
var CACHE = {};
var CACHE_MAX_AGE = 3600000; // 1 hour in milliseconds

// Allowed CDN domains (whitelist)
var ALLOWED_DOMAINS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'code.jquery.com',
    'stackpath.bootstrapcdn.com',
    'maxcdn.bootstrapcdn.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

// Content type mapping
var CONTENT_TYPES = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// Helper function to get content type
function getContentType(filePath) {
    var ext = path.extname(filePath).toLowerCase();
    return CONTENT_TYPES[ext] || 'application/octet-stream';
}

// Helper function to check if domain is allowed
function isDomainAllowed(hostname) {
    for (var i = 0; i < ALLOWED_DOMAINS.length; i++) {
        if (hostname === ALLOWED_DOMAINS[i]) {
            return true;
        }
    }
    return false;
}

// Helper function to clean old cache entries
function cleanCache() {
    var now = Date.now();
    var keys = Object.keys(CACHE);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (CACHE[key] && CACHE[key].timestamp) {
            if (now - CACHE[key].timestamp > CACHE_MAX_AGE) {
                delete CACHE[key];
                console.log('Removed expired cache entry: ' + key);
            }
        }
    }
}

// Function to fetch resource from CDN
function fetchFromCDN(targetUrl, response) {
    var parsedUrl = url.parse(targetUrl);
    var protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    var options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path,
        method: 'GET',
        headers: {
            'User-Agent': 'CDN-Proxy-Server/1.0'
        }
    };
    
    console.log('Fetching from CDN: ' + targetUrl);
    
    var proxyRequest = protocol.request(options, function(proxyResponse) {
        var data = [];
        var statusCode = proxyResponse.statusCode;
        
        proxyResponse.on('data', function(chunk) {
            data.push(chunk);
        });
        
        proxyResponse.on('end', function() {
            var buffer = Buffer.concat(data);
            
            // Cache the response if successful
            if (statusCode === 200) {
                CACHE[targetUrl] = {
                    data: buffer,
                    contentType: proxyResponse.headers['content-type'] || getContentType(parsedUrl.pathname),
                    timestamp: Date.now()
                };
                console.log('Cached: ' + targetUrl);
            }
            
            // Send response to client
            response.writeHead(statusCode, {
                'Content-Type': proxyResponse.headers['content-type'] || getContentType(parsedUrl.pathname),
                'Content-Length': buffer.length,
                'X-Proxy-Cache': 'MISS',
                'Access-Control-Allow-Origin': '*'
            });
            response.end(buffer);
        });
    });
    
    proxyRequest.on('error', function(error) {
        console.error('Error fetching from CDN: ' + error.message);
        response.writeHead(502, { 'Content-Type': 'text/plain' });
        response.end('Bad Gateway: Unable to fetch resource from CDN\n' + error.message);
    });
    
    proxyRequest.end();
}

// Create HTTP server
var server = http.createServer(function(request, response) {
    var requestUrl = url.parse(request.url, true);
    var targetUrl = requestUrl.query.url;
    
    console.log('Request received: ' + request.url);
    
    // Handle root path with usage instructions
    if (requestUrl.pathname === '/' && !targetUrl) {
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.end(
            '<html>' +
            '<head><title>CDN Proxy Server</title></head>' +
            '<body>' +
            '<h1>CDN Proxy Server</h1>' +
            '<p>Usage: <code>http://localhost:' + PORT + '/?url=CDN_URL</code></p>' +
            '<h2>Examples:</h2>' +
            '<ul>' +
            '<li><a href="/?url=https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js">jQuery from jsDelivr</a></li>' +
            '<li><a href="/?url=https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js">Lodash from Cloudflare</a></li>' +
            '</ul>' +
            '<h2>Allowed CDN Domains:</h2>' +
            '<ul>' +
            ALLOWED_DOMAINS.map(function(domain) { return '<li>' + domain + '</li>'; }).join('') +
            '</ul>' +
            '<p>Cache entries: ' + Object.keys(CACHE).length + '</p>' +
            '</body>' +
            '</html>'
        );
        return;
    }
    
    // Validate target URL
    if (!targetUrl) {
        response.writeHead(400, { 'Content-Type': 'text/plain' });
        response.end('Bad Request: Missing "url" parameter\nUsage: /?url=CDN_URL');
        return;
    }
    
    // Parse and validate the target URL
    var parsedTarget = url.parse(targetUrl);
    
    if (!parsedTarget.hostname) {
        response.writeHead(400, { 'Content-Type': 'text/plain' });
        response.end('Bad Request: Invalid URL format');
        return;
    }
    
    // Check if domain is allowed
    if (!isDomainAllowed(parsedTarget.hostname)) {
        response.writeHead(403, { 'Content-Type': 'text/plain' });
        response.end('Forbidden: Domain not allowed\nAllowed domains: ' + ALLOWED_DOMAINS.join(', '));
        return;
    }
    
    // Check cache first
    if (CACHE[targetUrl]) {
        var cacheEntry = CACHE[targetUrl];
        var age = Date.now() - cacheEntry.timestamp;
        
        if (age < CACHE_MAX_AGE) {
            console.log('Serving from cache: ' + targetUrl);
            response.writeHead(200, {
                'Content-Type': cacheEntry.contentType,
                'Content-Length': cacheEntry.data.length,
                'X-Proxy-Cache': 'HIT',
                'X-Cache-Age': Math.floor(age / 1000) + 's',
                'Access-Control-Allow-Origin': '*'
            });
            response.end(cacheEntry.data);
            return;
        } else {
            // Cache expired, remove it
            delete CACHE[targetUrl];
        }
    }
    
    // Fetch from CDN
    fetchFromCDN(targetUrl, response);
});

// Clean cache periodically (every 10 minutes)
setInterval(cleanCache, 600000);

// Start server
server.listen(PORT, function() {
    console.log('=================================');
    console.log('CDN Proxy Server is running!');
    console.log('Server URL: http://localhost:' + PORT);
    console.log('=================================');
    console.log('Usage: http://localhost:' + PORT + '/?url=CDN_URL');
    console.log('Example: http://localhost:' + PORT + '/?url=https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js');
    console.log('=================================');
    console.log('Allowed CDN domains:');
    for (var i = 0; i < ALLOWED_DOMAINS.length; i++) {
        console.log('  - ' + ALLOWED_DOMAINS[i]);
    }
    console.log('=================================');
});

// Handle server errors
server.on('error', function(error) {
    if (error.code === 'EADDRINUSE') {
        console.error('Error: Port ' + PORT + ' is already in use');
    } else {
        console.error('Server error: ' + error.message);
    }
});

// Graceful shutdown
process.on('SIGINT', function() {
    console.log('\nShutting down server...');
    server.close(function() {
        console.log('Server closed');
        process.exit(0);
    });
});
