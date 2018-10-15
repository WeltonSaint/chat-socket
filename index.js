var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;

const CONNECT_MESSAGE = 0;
const DISCONNECT_MESSAGE = 1;
const SIMPLE_MESSAGE = 2;
const PRIVATE_MESSAGE = 3;
const POLLING = 4;
const CONNECTION_ACCEPTED = 5;
const CONNECTION_REFUSED = 6;

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

    console.log((new Date()) + ' new user connected.');

    ws.on('message', function (message){
        message = JSON.parse(message);
        switch(message.type){
            case CONNECT_MESSAGE:
                var userExists = false
                for (var i = 0; i < users.length; i++) {
                    console.log("connection", users[i].name, message.userName);
                    if(users[i].name === message.userName){
                        console.log((new Date()) + ' connection refused.');
                        ws.send(JSON.stringify({ type: CONNECTION_REFUSED}));                    
                        userExists = true;
                        break;
                    }
                }
                if(!userExists){
                    userName = message.userName;
                    userColor = colors.shift();
                    users[connectionID] = {
                        'name': userName,
                        'color' : userColor,
                        'socket' : ws
                    };            
                    ws.send(JSON.stringify({ type: CONNECTION_ACCEPTED, data: userColor, listUsers: getListUser()}));            
                    var obj = {
                        type: CONNECT_MESSAGE,
                        time: (new Date()).getTime(),
                        id : connectionID,
                        text: " connected.",
                        author: userName,
                        color: userColor
                    };
                    wss.clients.forEach(function each(client) {
                        if (client !== ws ) {
                            client.send(JSON.stringify({ type: CONNECT_MESSAGE, data: obj }));
                        }
                    });
                    console.log((new Date()) + ' User is known as: ' + userName
                                + ' with ' + userColor + ' color.');
                }
                break;
            case SIMPLE_MESSAGE:            
                console.log((new Date())+ userName + ': ' + message.message);    
                var obj = {
                    time: (new Date()).getTime(),
                    id : connectionID,
                    text: message.message,                
                    author: userName,
                    color: userColor
                };
                // broadcast message to all connected clients
                var json = JSON.stringify({ type: SIMPLE_MESSAGE, data: obj });
                wss.clients.forEach(function each(client) {
                    client.send(json);
                });
                break;
            case PRIVATE_MESSAGE:
                users[message.to].socket.send(JSON.stringify(message));
                break;
        }        
    });

    ws.on('close', function(connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) + " Peer "
                + userName + " disconnected.");
            var obj = {
                time: (new Date()).getTime(),
                id : connectionID,
                text: " disconnected.",
                author: userName,
                color: userColor
            };
            var json = JSON.stringify({ type: DISCONNECT_MESSAGE, data: obj });
            wss.clients.forEach(function each(client) {
                client.send(json);
            });
            console.log(users[connectionID].name);
            users.splice(connectionID, 1);
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


