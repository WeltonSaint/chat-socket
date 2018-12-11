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

var colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ];
colors.sort(function(a,b) { return Math.random() > 0.5; } );
app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
server.listen(port);
console.log("http server listening on %d", port);

var wss = new WebSocketServer({server: server});
console.log("websocket server created");

wss.on('connection', function connection(ws) {
    var connectionID;
    var userName = false;
    var userColor = false;

    console.log("%s new user connected.", (new Date()));

    ws.on('message', function (message){
        try {            
            message = JSON.parse(message);

            switch(message.type){
                case CONNECT_MESSAGE:
                    var userExists = users.some(function(user) {
                        return user.name === message.userName;
                    });
                    if(!userExists){
                        connectionID = ++idCounter;
                        userName = message.userName;
                        userColor = colors.shift();

                        users[connectionID] = {
                            'id'     : connectionID,
                            'name'   : userName,
                            'color'  : userColor,
                            'socket' : ws
                        };  

                        ws.send(JSON.stringify({ 
                            type      : CONNECTION_ACCEPTED,
                            id        : connectionID,
                            data      : userColor, 
                            listUsers : getListUser()
                        })); 

                        var obj = {
                            type   : CONNECT_MESSAGE,
                            time   : (new Date()).getTime(),
                            id     : connectionID,
                            text   : " connected.",
                            author : userName,
                            color  : userColor
                        };

                        wss.clients.forEach(function each(client) {
                            if (client !== ws ) {
                                client.send(JSON.stringify({ 
                                    type : CONNECT_MESSAGE, 
                                    data : obj 
                                }));
                            }
                        });

                        console.log("%s User is known as %s with %s color.", (new Date()), 
                                    userName, userColor);
                        console.log("Users online: ", getListUser());
                    } else {
                        console.log("%s connection refused.", (new Date()));
                        ws.send(JSON.stringify({ 
                            type: CONNECTION_REFUSED
                        }));
                    }
                    break;
                case SIMPLE_MESSAGE:
                    if(message.message)          
                        console.log("%s %s: %s", (new Date()), userName, message.message);
                    else    
                        console.log("%s %s send a image", (new Date()), userName);    
                    var obj = {
                        time   : (new Date()).getTime(),
                        id     : connectionID,
                        text   : message.message,
                        image  : message.image,                
                        author : userName,
                        color  : userColor
                    };

                    var json = JSON.stringify({ 
                        type : SIMPLE_MESSAGE,
                        data : obj 
                    });
                    
                    wss.clients.forEach(function each(client) {
                        client.send(json);
                    });
                    break;
                case PRIVATE_MESSAGE:
                    let user = getUser(message.to);
                    if(message.message)                         
                        console.log("%s %s to %s: %s", (new Date()), userName,
                            user.name, message.message);
                    else    
                        console.log("%s %s send a image to %s", (new Date()), 
                            userName, user.name); 
                    
                    var obj = {
                        time   : (new Date()).getTime(),
                        id     : connectionID,
                        to     : message.to,                    
                        image  : message.image, 
                        text   : message.message,                
                        author : userName,
                        color  : userColor
                    };

                    var json = JSON.stringify({ 
                        type: PRIVATE_MESSAGE, 
                        data: obj 
                    });

                    user.socket.send(json);
                    ws.send(json);
                    break;
            }
        } catch (err){
            console.log("Error: %s", err)
        }       
    });

    ws.on("close", function(connection) {
        if (userName !== false) {
            console.log( " Peer %s disconnected.", (new Date()), userName);
            var obj = {
                time   : (new Date()).getTime(),
                id     : connectionID,
                text   : " disconnected.",
                author : userName,
                color  : userColor
            };

            var json = JSON.stringify({ 
                type: DISCONNECT_MESSAGE, 
                data: obj 
            });

            wss.clients.forEach(function each(client) {
                client.send(json);
            });
            
            users = users.filter(function( user ) {
                return user.id !== connectionID;
            });
            console.log("Users online: ", getListUser());
            colors.push(userColor);
        }
    });

    function getUser(userId) { 
        let tempUsers = users.filter(function( user ) {
            return user.id == userId;
        });
        return tempUsers[0];
     }

    function getListUser(){
        var list = '[';
        users.forEach(function (value) {
            list +=  '{"id": "' + value.id + '", "name" :"' + value.name.toString() + '"},';
        });
        if(list.length > 1)
            list = list.substring(0, list.length-1);
        list += ']';
        
        return list;
    }    

});


