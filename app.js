const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const request = require('request');
const app = express();

const PAGE_ACCESS_TOKEN = 'EAAKZBGydvZBNoBO9BfZA2VIsvxZBccpuXJQoUW5thYP9MX9YBfSvanhzf2ZAtDpbR7lLwcY7KV2m8nfj5JIjJZBnSWzJKDPVjVEHsE6S84N4X1jXfh4i7G4PzXrxwBE5VP3BxCZCVgc92SiaIaYoUzAdH6mY4QR7mSMtsd0AUpARthoNxY9CF1TyRvSrSpjAZB7sBpWbFeX8ksFGL4Iu';

app.use(bodyParser.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('Hello World!');
    console.log('Hello World page');
});

// Redirect /policy to the policy.html file
app.get('/policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'policy.html'));
    console.log('polcy page');
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
    console.log('webhook get calling');
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "MY_LOCAL_TESTING";
    
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);      
            console.log('error');

        }
    }
});

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
    let body = req.body;
    console.log('webhook post');
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
        console.log('worked');

        body.entry.forEach(function(entry) {
            // Gets the message. entry.messaging is an array, but 
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);        
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
        console.log('404');
    }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
    let response;
    
    // Check if the message contains text
    if (received_message.text) {    
        // Check the validity of the phone number
        const phoneNumber = received_message.text.match(/\d+/g)?.join('');
        if (phoneNumber && (phoneNumber.length === 10 || phoneNumber.length === 11)) {
            response = {
                "text": `Your number is good`
            }
        } else {
            response = {
                "text": `Your number is not good`
            }
        }
    } 

    // Sends the response message
    callSendAPI(sender_psid, response);    
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v13.0/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('Message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    }); 
}

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));
