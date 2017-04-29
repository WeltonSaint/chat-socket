angular.module("app", [])
.controller('MainCtrl', function($scope, $document) {

    

    // Define the URL for our server. As we are only running it locally, we will
    // use localhost.
    var host = location.origin.replace(/^http/, 'ws')
    var userList = {};
    var ws;

    // Below we set the "showNameInput" and "showChatScreen" scope variables,
    // which allow us to toggle the screens so we can show the name input
    // in the beginning, and then the chat input once they have entered their
    // name.
    // Note:
    $scope.showNameInput = true;
    $scope.showChatScreen = false;
    $scope.showLogout = false;
    // Output to the log so we know when our controller is loaded.
     console.log('MainCtrl loaded.');

    // Set the message lod and the name input to blank.
    $scope.content = '';
    $scope.userName = '';
    $scope.color = false;

    /**
        This function toggles between the screens. It basically just inverts
        the values of the "showNameInput" and "showChatScreen" scope variables.
        This works for our demo, but in a real app you might want to
        use different screens as opposed to showing/hiding elements on one view.
    */
    function toggleScreens() {
        $scope.showNameInput = !$scope.showNameInput;
        $scope.showChatScreen = !$scope.showChatScreen;
    }

    /** This function initiates the connection to the web socket server. */
    function connect() {
        // Create a new WebSocket to the SERVER_URL (defined above). The empty
        // array ([]) is for the protocols, which we are not using for this
        // demo.
        ws = new WebSocket(host);
        // Set the function to be called when a message is received.
        ws.onmessage = handleMessageReceived;
        // Set the function to be called when we have connected to the server.
        ws.onopen = handleConnected;
        // Set the function to be called when an error occurs.
        ws.onerror = handleError;
        ws.onclose = function(event) {
            ws.close();
            $scope.content = '';
            $scope.userName = '';
            $scope.showNameInput = true;
            $scope.showChatScreen = false;
            $scope.showLogout = false;
            sweetAlert("Warning", "Disconnected from WebSocket!", "warning");                    
        };
    }

    /**
        This is the function that is called when the WebSocket receives
        a message.
    */
    function handleMessageReceived(data) {        
        try {
            var json = JSON.parse(data.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', data.data);
            return;
        }
        console.log("json: " + json.type);
        // NOTE: if you're not sure about the JSON structure
        // check the server source code above
        if (json.type === 'color') { // first response from the server with user's color
            $scope.color = json.data;
            populateUserList(json.listUsers);
        } else if (json.type === 'message') {      
            logMessage(json.data.author, json.data.text,
                       json.data.color, new Date(json.data.time));
            if(json.data.text.search('disconnected') != -1){
                removeUser(json.data.id, json.data.author);
            } else if(json.data.text.search('connected') != -1){
                addUser(json.data.id, json.data.author);
            }
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    }

    /**
        This is the function that is called when the WebSocket connects
        to the server.
    */
    function handleConnected(data) {        
        swal("Success","Connected!", "success");
        ws.send($scope.userName);
    }

    /**
        This is the function that is called when an error occurs with our
        WebSocket.
    */
    function handleError(err) {
        // Print the error to the console so we can debug it.
        console.log("Error: ", err);
    }

    /** This function adds a message to the message log. */
    function logMessage(author, message, color, dt) {
        // $apply() ensures that the elements on the page are updated
        // with the new message.
        //Append out new message to our message log. The \n means new line.
        //document.getElementById('content').appendChild(e.firstChild)

        angular.element(
            document.getElementById('content'))
            .append('<p>['
         + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
         + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
         + '] <span style="color:' + color + '">' + author + '</span>: ' + message + '</p>');
        // Update the scrolling (defined below).
        updateScrolling();

    }

    /**
        Updates the scrolling so the latest message is visible.
        NOTE: This is not really best practice... In your rela app, you
        would have this logic in the directive.
    */
    function updateScrolling() {
        // Set the ID of our message log element (textarea) in the HTML.
        var msgLogId = '#content';
        // Get a handle on the element using the querySelector.
        var msgLog = $document[0].querySelector(msgLogId);
        // Set the top of the scroll to the height. This makes the box scroll
        // to the bottom.
        msgLog.scrollTop = msgLog.scrollHeight;
    }


    function populateUserList(stringList) {
        var json = JSON.parse(stringList);
        for (var i=0;i<json.length;i++){
            var idUser = json[i].id;                   
            userList[json[i].name] = idUser;
            angular.element(
                    document.getElementById('listUser'))
                    .append('<a id="userID' + idUser + '" href="#!" class="collection-item avatar"> '
                        +'<i class="material-icons teal lighten-2 circle">face</i>'
                        +'<span class="title">' + json[i].name + '</span></a>');
        }                     
    }

    function removeUser(id, name) {
        delete userList[name];
        document.getElementById("userID" + id).remove();
    }

    function addUser(id,name) {
        userList[name] = id ;
        angular.element(
                    document.getElementById('listUser'))
                    .append('<a id="userID' + id + '" href="#!" class="collection-item avatar"> '
                        +'<i class="material-icons teal lighten-2 circle">face</i>'
                        +'<span class="title">' + name + '</span></a>');
    }

    $scope.sendMessage = function logout(){
        swal("Success","Disconnected!", "success");
        ws.close();
        $scope.content = '';
        $scope.userName = '';
        $scope.showNameInput = true;
        $scope.showChatScreen = false;
        $scope.showLogout = false;
    };

    /** This is our scope function that is called when the user submits their name. */
    $scope.submitName = function submitName(name) {
        // If they left the name blank, then return without doing anything.
        if (!name) {
            return;
        }
        // Set the userName scope variable to the submitted name.
        $scope.userName = name;
        // Call our connect() function.
        connect();
        // Toggle the screens (hide the name input, show the chat screen)
        toggleScreens();
    };

    /** This is the scope function that is called when a users hits send. */
    $scope.sendMessage = function sendMessage(msg) {
        if (!msg) {
            return;
        }
        ws.send(msg);
    };

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

