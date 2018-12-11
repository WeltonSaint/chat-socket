const CONNECT_MESSAGE = 0;
const DISCONNECT_MESSAGE = 1;
const SIMPLE_MESSAGE = 2;
const PRIVATE_MESSAGE = 3;
const POLLING = 4;
const CONNECTION_ACCEPTED = 5;
const CONNECTION_REFUSED = 6;

angular.module("app", ['angular-nicescroll'])
.controller('MainCtrl', function($scope, $document) {

    var host = location.origin.replace(/^http/, 'ws')
    var ws;
    var fileSelect = document.createElement('input'), 
        fileSelectPrivate = document.createElement('input');;    
    
    $scope.scrollToBottomShowing = false;
    $scope.lastStateScrollToBottomShowing = false;
    $scope.scrollToBottomPrivateShowing = false;
    $scope.lastStateScrollToBottomPrivateShowing = false;
    $scope.messages = [];
    $scope.privateMessages = [[]];
    $scope.userList = [];
    $scope.connected = false;     
    $scope.userName = '';
    $scope.color = false;
    $scope.connectionID = -1;
    $scope.chattingWithUser = -1;  
    fileSelect.type = 'file';
    fileSelect.accept= 'image/*';
    fileSelectPrivate.type = 'file';
    fileSelectPrivate.accept= 'image/*';

    $('#modal-connect').modal({
        dismissible : false, // Modal can be dismissed by clicking outside of the modal
        opacity     : .5, // Opacity of modal background
        inDuration  : 300, // Transition in duration
        outDuration : 200, // Transition out duration
        startingTop : '34%', // Starting top style attribute
        endingTop   : '40%', // Ending top style attribute                
    });
    $('#modal-connect').modal('open');
    $('ul.tabs').tabs();
    $('.button-collapse').sideNav({
        menuWidth    : 300, // Default is 300
        edge         : 'left', // Choose the horizontal origin
        closeOnClick : true, 
        draggable    : true // Choose whether you can drag to open on touch screens
    });
    $('.materialboxed').materialbox();
    console.log('MainCtrl loaded.');
   
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
                $scope.privateMessages = [[]];
                $scope.color = false;
                $scope.connectionID = -1;  
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
                $scope.connectionID = json.id;
                $scope.populateUserList(json.listUsers); 
                break;
            case CONNECTION_REFUSED:
                ws.close();       
                $scope.connected = false;          
                $scope.messages = [];
                $scope.userList = [];
                $scope.privateMessages = [[]];

                swal({
                    title: "Error",
                    text: "Exists a user with name \""+$scope.userName+"\"!",
                    type: "error",
                    confirmButtonColor: "#4db6ac",
                }); 
                 
                $scope.userName = ''; 
                $scope.color = false;
                $scope.connectionID = -1;

                setTimeout(function(){ 
                    $scope.$apply();  
                    $('#modal-connect').modal('open');
                    $('select').material_select(); 
                }, 1000);
                                        
                break;
            case CONNECT_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, "", new Date(json.data.time));
                $scope.addUser(json.data.id, json.data.author);
                break;
            case DISCONNECT_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, "", new Date(json.data.time));
                $scope.removeUser(json.data.id);
                break;
            case SIMPLE_MESSAGE:
                $scope.logMessage(json.data.author, json.data.text,
                    json.data.color, json.data.image, new Date(json.data.time));
                break;
            case PRIVATE_MESSAGE:
                $scope.logMessagePrivate(json.data.id, json.data.author, 
                    json.data.to, json.data.text, json.data.color, 
                    json.data.image, new Date(json.data.time));
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
            type     : CONNECT_MESSAGE,
            userName : $scope.userName
        }));
    }

    $scope.handleError = function handleError(err) {
        console.log("Error: ", err);
    }

    $scope.logMessage = function logMessage(author, message, color, image, dt) {
        var time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) 
        + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
        
        $scope.messages.push({
            author  : author,
            color   : color,
            image   : image,
            content : message,
            time    : time
        });

        $scope.$apply();
        updateScrolling();
    }

    $scope.logMessagePrivate = function logMessagePrivate(id, author, to, 
                                                message, color, image, dt) {
        var time = (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) 
        + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes());
        var idAnotherUser = (id != $scope.connectionID) ? id : to;

        if(!$scope.privateMessages[idAnotherUser])
            $scope.privateMessages[idAnotherUser] = new Array();

        $scope.privateMessages[idAnotherUser].push({
            author  : author,
            color   : color,
            image   : image,
            content : message,
            time    : time
        });

        $scope.$apply();
        updateScrollingPrivate();
    }

    $("#messagePrivateTo").on('change', function (e) {
        $scope.chattingWithUser = e.target.value;
        $scope.$apply();
    }); 
    
    $(".content-messages .messages").scroll(function() {
        if($(this).scrollTop() + $(this).innerHeight() == $(this)[0].scrollHeight) { 
            $('.scroll-bottom').addClass("fadeOutDown animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                $('.scroll-bottom').hide();                
                $scope.lastStateScrollToBottomShowing = false;
                $scope.scrollToBottomShowing = false;
                $(this).removeClass("fadeOutDown animated");
            }); 
        } else {
            $('.scroll-bottom').show();
            $scope.lastStateScrollToBottomShowing = true;
            if($scope.scrollToBottomShowing != $scope.lastStateScrollToBottomShowing){
                $scope.scrollToBottomShowing = $scope.lastStateScrollToBottomShowing;         
                $('.scroll-bottom').addClass("fadeInUp animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                    $(this).removeClass("fadeInUp animated");
                });    
            }
        }
    });

    $(".content-messages-private .messages:not(.ng-hide)").on("scroll", function(e) {alert("scrolled visible");});
    $(".content-messages-private .messages").on("scroll", function(e) {alert("scrolled");});

    $(".content-messages-private .messages:not(.ng-hide)").scroll(function() {
        console.log("teste");   
        if($(this).scrollTop() + $(this).innerHeight() == $(this)[0].scrollHeight) { 
            $('.scroll-bottom-private').addClass("fadeOutDown animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                $('.scroll-bottom-private').hide();                
                $scope.lastStateScrollToBottomPrivateShowing= false;
                $scope.scrollToBottomPrivateShowing = false;
                $(this).removeClass("fadeOutDown animated");
            }); 
        } else {
            $('.scroll-bottom-private').show();
            $scope.lastStateScrollToBottomPrivateShowing = true;
            if($scope.scrollToBottomPrivateShowing != $scope.lastStateScrollToBottomPrivateShowing){
                $scope.scrollToBottomPrivateShowing = $scope.lastStateScrollToBottomPrivateShowing;         
                $('.scroll-bottom-private').addClass("fadeInUp animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                    $(this).removeClass("fadeInUp animated");
                });    
            }
        }
    });

    $scope.sendImage = function sendImage() {
        fileSelect.click();
    }

    fileSelect.onchange = function() {
        var f = fileSelect.files[0], r = new FileReader();
        r.onloadend = function(e) {
            if(e.target.result)
                ws.send(JSON.stringify({
                    type  : SIMPLE_MESSAGE,
                    image : e.target.result
                }));      
        }
        r.readAsDataURL(f);
    };

    $scope.sendImagePrivate = function sendImagePrivate() {
        if($("#messagePrivateTo").val() != null)
            fileSelectPrivate.click();
    }

    fileSelectPrivate.onchange = function() {
        var f = fileSelectPrivate.files[0], r = new FileReader();
        r.onloadend = function(e) {
            if(e.target.result)
                ws.send(JSON.stringify({
                    type  : PRIVATE_MESSAGE,
                    to    : $("#messagePrivateTo").val(),
                    image : e.target.result
                }));       
        }

        r.readAsDataURL(f);
    };

    function updateScrolling() {
        if(!$scope.scrollToBottomShowing){
            var msgLog = $document[0].querySelector('.content-messages .messages');
            msgLog.scrollTop = msgLog.scrollHeight;
        }
    }

    function updateScrollingPrivate() {
        if(!$scope.scrollToBottomPrivateShowing){
            var msgLog = $document[0].querySelector('.content-messages-private .messages');
            msgLog.scrollTop = msgLog.scrollHeight;
        }
    }

    $scope.scrollToBottom = function scrollToBottom(){
        var msgLog = $document[0].querySelector('.content-messages .messages');
        msgLog.scrollTop = msgLog.scrollHeight;
    };

    $scope.scrollToBottomPrivate = function scrollToBottomPrivate(){
        var msgLog = $document[0].querySelector('.content-messages-private .messages');
        msgLog.scrollTop = msgLog.scrollHeight;
    };

    $scope.populateUserList = function populateUserList(stringList) {
        var json = JSON.parse(stringList);

        for (var i=0;i<json.length;i++){
            var idUser = json[i].id;            
            if(json[i].name.localeCompare($scope.userName) != 0){
                $scope.userList.push({
                    userID   : idUser,
                    userName : json[i].name 
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
        
        $scope.privateMessages.splice(id, 1);
        $scope.$apply()        
        $('select').material_select();

        if($scope.chattingWithUser != -1 && $scope.chattingWithUser != id)
            $("#messagePrivateTo").val($scope.chattingWithUser);
        
        $('select').material_select();
    }

    $scope.addUser = function addUser(id,name) {        
        $scope.userList.push({
            userID: id,
            userName: name 
        });

        $scope.$apply()
        if($scope.chattingWithUser != -1)
            $("#messagePrivateTo").val($scope.chattingWithUser);
        
        $('select').material_select();
    }

    $scope.logout = function(){
        $scope.connected = false;          
        ws.close();
        $scope.messages = [];
        $scope.userList = [];
        $scope.privateMessages = [[]];
        $scope.userName = '';
        $scope.color = false;
        $scope.connectionID = -1; 
        
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
        $('.modal-content input').removeClass("invalid");
        $('.modal-content input').prop("aria-invalid", "false");
        $scope.userName = name;
        $scope.connectChat();
    };

    $scope.chattingWith = function chattingWith(name) {
        $scope.chattingWithUser = name;
        $('ul.tabs').tabs('select_tab', 'private-chat');      
        $("#messagePrivateTo").val(name);
        $("#messagePrivateTo").material_select();
    }

    $scope.sendMessage = function sendMessage(msg) {
        if (!msg) {
            return;
        }

        ws.send(JSON.stringify({
            type    : SIMPLE_MESSAGE,
            message : msg
        }));
    };

    $scope.sendMessagePrivate = function sendMessagePrivate(msg) {    
        let to = $("#messagePrivateTo").val();    
        if (!msg || to == null) {            
            return;
        }

        ws.send(JSON.stringify({
            type    : PRIVATE_MESSAGE,
            to      : to,
            message : msg
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

