// Load the http module to create an http server.
var http = require('http');
var port = process.argv[2] ? process.argv[2] : 8080;

// The function to call actual server
function send_request(method, url, headers, payload, fn) {
//    data = data || {};
//    var payload = JSON.stringify(data);
    var parse_u = require('url').parse(url, true);
    var isHttp = parse_u.protocol == 'http:';
    var options = {
        host: parse_u.hostname,
        port: parse_u.port || (isHttp ? 80 : 443),
        path: parse_u.path,
        method: method,
        headers: headers
    };
    var req = require(isHttp ? 'http' : 'https').request(options, function (res) {
        var _data = '';
        res.on('data', function (chunk) {
            _data += chunk;
        });
        res.on('end', function () {
            if (fn) {
                fn(res.statusCode, res.headers, _data);
            }
        });
    });
    if (payload && method == 'POST') {
        req.write(payload);
    }
    req.end();
}

// The proxy function
function proxy(req, res, payload) {
    console.log('original request:')
    console.log(req.method);
    console.log(req.url.substring(1));
    console.log(req.headers);
    console.log(payload);
    // Pre-flight request, reply 200 OK
    if (req.method == 'OPTIONS') {
        var headers = {'Access-Control-Allow-Origin': '*'};
        if (req.headers['access-control-request-headers']) {
            headers['access-control-allow-headers'] = req.headers['access-control-request-headers'];
        }
        if (req.headers['access-control-request-method']) {
            headers['access-control-allow-methods'] = req.headers['access-control-request-method'];
        }
        res.writeHead(200, headers);
        res.end();
    } else {
        delete req.headers['host'];
        delete req.headers['accept-encoding'];
        delete req.headers['accept-language'];
        // proxy GET or POST request
        send_request(req.method, req.url.substring(1), req.headers, payload, function (statusCode, headers, data) {
            headers['Access-Control-Allow-Origin'] = '*';
            console.log('server response:');
            console.log(statusCode);
            console.log(headers);
            console.log(data);
            res.writeHead(statusCode, headers);
            res.end(data);
        });
    }
}

// The client side server
var server = http.createServer(function (req, res) {
    if (req.method == 'POST') {
        var payload = '';
        req.on('data', function (data) {
            payload += data;
        });
        req.on('end', function () {
            proxy(req, res, payload);
        });
    } else {
        // send GET request
        proxy(req, res);
    }
});

// Listen on port, IP defaults to 127.0.0.1
server.listen(port);

// Put a friendly message on the terminal
console.log("Proxy server started. Please send request to http://127.0.0.1:" + port + "/https://www.cross-domain.com");
