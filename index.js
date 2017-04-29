var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;

const CONNECT_MESSAGE = 0;
const DISCONNECT_MESSAGE = 1;
const SIMPLE_MESSAGE = 2;
const PRIVATE_MESSAGE = 3;

var users = [];
var idCounter = 0;
// Array with some colors
var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
// ... in random order
colors.sort(function(a,b) { return Math.random() > 0.5; } );

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
server.listen(port);

console.log("http server listening on %d", port);

var wss = new WebSocketServer({server: server});
console.log("websocket server created");

// Create a listener function for the "connection" event.
// Each time we get a connection, the following function
// is called.
wss.on('connection', function connection(ws) {
    var connectionID = idCounter++;
    var userName = false;
    var userColor = false;

    console.log((new Date()) + ' Connection accepted.');

    ws.on('message', function (message){
        if (userName === false) { // first message sent by user is their name
            // remember user name
            userName = message;
            // get random color and send it back to the user
            userColor = colors.shift();
            users[connectionID] = {'name': userName, 'color' : userColor };            
            ws.send(JSON.stringify({ type:'color', data: userColor, listUsers: getListUser()}));
            // we want to keep history of all sent messages
            var obj = {
                time: (new Date()).getTime(),
                text: " connected.",
                author: userName,
                color: userColor
            };
            wss.clients.forEach(function each(client) {
                if (client !== ws ) {
                    client.send(JSON.stringify({ type:'message', data: obj }));
                }
            });
            console.log((new Date()) + ' User is known as: ' + userName
                        + ' with ' + userColor + ' color.');

        } else if(message.localeCompare("polling") != 0){
             // log and broadcast the message
            console.log((new Date())+ userName + ': ' + message);
            
            // we want to keep history of all sent messages
            var obj = {
                time: (new Date()).getTime(),
                id : connectionID,
                text: message,                
                author: userName,
                color: userColor
            };
            // broadcast message to all connected clients
            var json = JSON.stringify({ type:'message', data: obj });
            wss.clients.forEach(function each(client) {
                client.send(json);
            });
        }
        
    });

    ws.on('close', function(connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) + " Peer "
                + userName + " disconnected.");
            // remove user from the list of connected clients
            // we want to keep history of all sent messages
            var obj = {
                time: (new Date()).getTime(),
                text: " disconnected.",
                author: userName,
                color: userColor
            };
            // broadcast message to all connected clients
            var json = JSON.stringify({ type:'message', data: obj });
            wss.clients.forEach(function each(client) {
                client.send(json);
            });
            delete users[connectionID];
            // push back user's color to be reused by another user
            colors.push(userColor);
        }
    });

    function getListUser(){
        var list = '[';
        users.forEach(function (value, key) {
            list +=  '{"id": "' + key + '", "name" :"' + value.name.toString() + '"},';
        });
        list = list.substring(0, list.length-1);
        list += ']';
        
        return list;
    }    

});

function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


