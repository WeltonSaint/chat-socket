angular.module("app", [])
.controller('MainCtrl', function($scope, $document) {

    // Output to the log so we know when our controller is loaded.
     console.log('MainCtrl loaded.');

    // Define the URL for our server. As we are only running it locally, we will
    // use localhost.
    var host = location.origin.replace(/^http/, 'ws')
    var ws;

    // Below we set the "showNameInput" and "showChatScreen" scope variables,
    // which allow us to toggle the screens so we can show the name input
    // in the beginning, and then the chat input once they have entered their
    // name.
    // Note:
    $scope.showNameInput = true;
    $scope.showChatScreen = false;
    $scope.showLogout = false;

    // Set the message lod and the name input to blank.
    $scope.messageLog = '';
    $scope.userName = '';

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

        ws.onclose = handleDisconnect;

    }

    /**
        This is the function that is called when the WebSocket receives
        a message.
    */
    function handleMessageReceived(message) {
        // try to parse JSON message. Because we know that the server always returns
        // JSON this should work without any problem but we should make sure that
        // the massage is not chunked or otherwise damaged.
        try {
            var json = JSON.parse(message.data);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON: ', message.data);
            return;
        }

        // NOTE: if you're not sure about the JSON structure
        // check the server source code above
        if (json.type === 'color') { // first response from the server with user's color
            myColor = json.data;
            $scope.$apply(function() {
                $scope.userName.css('color', myColor);;
            });
            // from now user can start sending messages
        } else if (json.type === 'message') { // it's a single message
            addMessage(json.data.author, json.data.text,
                       json.data.color, new Date(json.data.time));
        } else {
            console.log('Hmm..., I\'ve never seen JSON like this: ', json);
        }
    }

    /**
        This is the function that is called when the WebSocket connects
        to the server.
    */
    function handleConnected(data) {        
        toggleScreens();
        // Toggle the screens (hide the name input, show the chat screen)
        swal("Connected", "", "success");
        
    }

    /**
        This is the function that is called when an error occurs with our
        WebSocket.
    */
    function handleError(err) {
        // Print the error to the console so we can debug it.
        console.log("Error: ", err);
        swal("Oops...", "Error: " + err, "error");
    }

     function handleDisconnect(data) {
        $scope.$apply(function() {
            $scope.messageLog = "";
            $scope.userName = "";
        });
        toggleScreens();
    }

    /** This function adds a message to the message log. */
    function logMessage(msg) {
        // $apply() ensures that the elements on the page are updated
        // with the new message.
        $scope.$apply(function() {
            //Append out new message to our message log. The \n means new line.
            $scope.messageLog = $scope.messageLog + msg + "\n";
            // Update the scrolling (defined below).
            updateScrolling();
        });
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

    function addMessage(author, message, color, dt) {
        $scope.$apply(function() {
            //Append out new message to our message log. The \n means new line.
            $scope.content = $scope.content + '<p><span style="color:' + color + '">' + author + '</span> @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + ': ' + message + '</p>';
            // Update the scrolling (defined below).
            updateScrolling();
        });
    }

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
    };

    /** This is the scope function that is called when a users hits send. */
    $scope.sendMessage = function sendMessage(msg) {
        if (!msg) {
            return;
        }
        // send the message as an ordinary text
        ws.send(msg);
        // disable the input field to make the user wait until server
        // sends back response

        // we know that the first message sent from a user their name
        if ($scope.userName === false) {
            $scope.userName = msg;
        }
    };

    $scope.logout = function logout() {
        ws.close()
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

