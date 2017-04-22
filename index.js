var WebSocketServer = require("ws").Server
var http = require("http")
var express = require("express")
var app = express()
var port = process.env.PORT || 5000

app.use(express.static(__dirname + "/"))

var server = http.createServer(app)
server.listen(port)

console.log("http server listening on %d", port)

var wss = new WebSocketServer({server: server})
console.log("websocket server created");

// Create a "broadcast" function on our WebSocketServer object.
// The function will take a "msg" paramter. When called, it will
// loop through all the connected clients and send them the msg.
wss.broadcast = function broadcastMsg(msg) {
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};

// Create a listener function for the "connection" event.
// Each time we get a connection, the following function
// is called.
wss.on('connection', function connection(ws) {

    // Store the remote systems IP address as "remoteIp".
    var remoteIp = ws.upgradeReq.connection.remoteAddress;

    // Print a log with the IP of the client that connected.
    console.log('Connection received: ', remoteIp);

    // Add a listener which listens for the "message" event.
    // When a "message" event is received, take the contents
    // of the message and pass it to the broadcast() function.
    ws.on('message', wss.broadcast);
});
