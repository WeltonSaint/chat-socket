const CONNECT_MESSAGE = 0;
const DISCONNECT_MESSAGE = 1;
const SIMPLE_MESSAGE = 2;
const PRIVATE_MESSAGE = 3;
const POLLING = 4;
const CONNECTION_ACCEPTED = 5;
const CONNECTION_REFUSED = 6;

angular.module("app", [])
.controller('MainCtrl', function($scope, $document) {
    var host = location.origin.replace(/^http/, 'ws')
    var ws;

    $scope.messages = [];
    $scope.privateMessages = []
    $scope.userList = [];
    $scope.connected = false;  
    $('#modal-connect').modal({
        dismissible: false, // Modal can be dismissed by clicking outside of the modal
        opacity: .5, // Opacity of modal background
        inDuration: 300, // Transition in duration
        outDuration: 200, // Transition out duration
        startingTop: '34%', // Starting top style attribute
        endingTop: '40%', // Ending top style attribute                
    });
    $('#modal-connect').modal('open');
    $('ul.tabs').tabs();
    $('.button-collapse').sideNav({
        menuWidth: 300, // Default is 300
        edge: 'left', // Choose the horizontal origin
        closeOnClick: true, 
        draggable: true // Choose whether you can drag to open on touch screens
    });
    console.log('MainCtrl loaded.');

    $scope.userName = '';
    $scope.color = false;   
   
    $scope.connectChat =function connectChat() {
        ws = new WebSocket(host);
        ws.onmessage = $scope.handleMessageReceived;
        ws.onopen = $scope.handleConnected;
        ws.onerror = $scope.handleError;
        ws.onclose = function(event) {
            if($scope.connected){
                $scope.connected = false;         
                $scope.messages = [];
                $scope.userList = [];
                $scope.userName = '';
                $('#modal-connect').modal('open');
                $('select').material_select(); 
                $scope.$apply();    
                swal({
                  title: "Warning",
                  text: "Disconnected from WebSocket!",
                  type: "warning",
                  confirmButtonColor: "#4db6ac",
                });
            }                  
        };
    }

    $scope.handleMessageReceived = function handleMessageReceived(data) {        
        try {
            var json = JSON.parse(data.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', data.data);
            return;
        }
        switch(json.type){
            case CONNECTION_ACCEPTED:
                $scope.color = json.data;
                $scope.populateUserList(json.listUsers); 
                break;
            case CONNECTION_REFUSED:
                ws.close();       
                $scope.connected = false;          
                $scope.messages = [];
                $scope.userList = [];
                $scope.userName = '';
                
                $('#modal-connect').modal('open');
                console.log("open");      
                $scope.$apply();           
                $('select').material_select();                 
                break;
            case CONNECT_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, new Date(json.data.time));
                $scope.addUser(json.data.id, json.data.author);
                break;
            case DISCONNECT_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, new Date(json.data.time));
                $scope.removeUser(json.data.id);
                break;
            case SIMPLE_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, new Date(json.data.time));
                break;
            case PRIVATE_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, new Date(json.data.time));
                break;
            case POLLING : 
                break;
            default:
                console.log('Hmm..., I\'ve never seen JSON like this: ', json);
                break;               
        }
    }

    $scope.handleConnected = function handleConnected(data) {
        $scope.connected = true;   
        ws.send(JSON.stringify({
            type: CONNECT_MESSAGE,
            userName: $scope.userName
        }));
    }

    $scope.handleError = function handleError(err) {
        console.log("Error: ", err);
    }

    $scope.logMessage = function logMessage(author, message, color, dt) {
        var time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
        + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
        $scope.messages.push({
            author : author,
            color: color,
            content : message,
            time : time
        });
        $scope.$apply();
        updateScrolling();
    }

    function updateScrolling() {
        var msgLog = $document[0].querySelector('#main-chat main');
        msgLog.scrollTop = msgLog.scrollHeight;
    }

    $scope.populateUserList = function populateUserList(stringList) {
        var json = JSON.parse(stringList);
        for (var i=0;i<json.length;i++){
            var idUser = json[i].id;            
            if(json[i].name.localeCompare($scope.userName) != 0){
                $scope.userList.push({
                    userID: idUser,
                    userName: json[i].name 
                });
            }
        }
        $scope.$apply();        
        $('select').material_select();                    
    }

    $scope.removeUser = function removeUser(id) {                
        for (let user of $scope.userList) {
            if (id === user.userID) {
                $scope.userList.splice($scope.userList.indexOf(user), 1);
                break;
            }
        }    
        $scope.$apply()        
        $('select').material_select();
    }

    $scope.addUser = function addUser(id,name) {        
        $scope.userList.push({
            userID: id,
            userName: name 
        });
        $scope.$apply()        
        $('select').material_select();
    }

    $scope.logout = function(){
        ws.close();       
        $scope.connected = false;          
        $scope.messages = [];
        $scope.userList = [];
        $scope.userName = '';
        
        $('#modal-connect').modal('open');       
        $scope.$apply();           
        $('select').material_select();
    };
    
    $scope.connect = function connect(name) {
        if (!name) {
            $('.modal-content input').addClass("invalid");
            $('.modal-content input').prop("aria-invalid", "true");
            return;
        }        
        $('.modal').modal('close');
        console.log("close");
        $('.modal-content input').removeClass("invalid");
        $('.modal-content input').prop("aria-invalid", "false");
        $scope.userName = name;
        $scope.connectChat();
    };

    $scope.chattingWith = function chattingWith(name) {
        $('ul.tabs').tabs('select_tab', 'private-chat');      
        $('.card div .select-wrapper select').val(name);
        $('.card div .select-wrapper select').material_select();
    }

    $scope.sendMessage = function sendMessage(msg) {
        if (!msg) {
            return;
        }
        ws.send(JSON.stringify({
            type: SIMPLE_MESSAGE,
            message: msg
        }));
    };

    $scope.sendMessagePrivate = function sendMessagePrivate(msg) {    
        let to = $("#messagePrivateTo").val();
        console.log(to, msg);    
        if (!msg || to == null) {            
            return;
        }
        ws.send(JSON.stringify({
            type: PRIVATE_MESSAGE,
            to: to,
            message: msg
        }));
        $scope.messagePrivate = "";
    };

    setInterval(function() {
        if($scope.connected){
            ws.send(JSON.stringify({type: POLLING}));
        }
    }, 30000);

})
.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
});

