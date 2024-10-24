const { createServer } = require("http");
const { WebSocketServer } = require("ws");

const express = require("express");

const { Session } = require("./Session.js");

const OpCodes = require("./OpCodes.js");
const UserStatus = require("./UserStatus");

const PORT = process.env.PORT;

const app = express();
const router = express.Router();

app.use("/", router);

const server = app.listen(PORT, () => console.log(`[irc] listening on port ${PORT}`));
const wss = new WebSocketServer({ server });

wss.on("connection", (socket, req) => {
  
  const ip = req.connection.remoteAddress;
  console.log(`[irc] connection from ${ip}`);
  
  const broadcast = (msg) => 
    wss.clients.forEach(
      (client) => client.send(
        JSON.stringify({ op: OpCodes.MESSAGE_RECEIVE, d: msg })));
  
  socket.on("message", (data) => {
    try {      
      const json = JSON.parse(data.toString());
      if (!json) {
        socket.send(JSON.stringify({ op: OpCodes.INVALID, d: "Invalid JSON data provided." }));
        return;
      }
                        
      if ("op" in json && "d" in json) {
        const opCode = parseInt(json["op"]);
        switch (opCode) {
          case OpCodes.CONNECT: {
            
            let username = json["d"];
            
            if (username.toLowerCase() === "system") {
              username = "User" + Math.random().toString(16).substring(2);
            }
                  
            if (!socket.session) {
              socket.session = new Session(username, socket);
              
              socket.send(JSON.stringify({ op: OpCodes.ID, d: socket.session.key }));
              
              // set an interval every 20 seconds to send a ping
              socket.session.startPing();
              
              //broadcast(`\u00A7dSystem\u00A7r: Welcome ${username} to the chat`);
            }
            
            else {
              socket.send(JSON.stringify({ op: OpCodes.INVALID, d: "Session already in use." }));
            }
            
            break;
          }
            
          case OpCodes.MESSAGE_SEND: {
                        
            if (socket.session) {
              const time = socket.session.lastMessageSent;
              if (time === 0) {
                socket.session.lastMessageSent = Date.now();
              }
              
              else {
                
                // force a 5 second message delay
                if (Date.now() - socket.session.lastMessageSent <= 5000) {
                  break;
                }
              }
              
              let message = json["d"];
              if (!message) {
                break;
              }
              
              // fuck you
              message = message.substring(0, 256);
              
              // reset timer
              socket.session.lastMessageSent = Date.now();
              
              let nameColor = "\u00A7r";
              if (socket.session.admin) {
                nameColor = "\u00A7b";
              }
                
              switch (socket.session.status) {
                case UserStatus.RANDROID:
                  nameColor = "\u00A78";
                  break;
                    
                case UserStatus.BETA:
                  nameColor = "\u00A76"
                  break;
                    
                case UserStatus.DEVELOPER:
                  nameColor = "\u00A7c";
                  break;
              }
              
              broadcast(`${nameColor}${socket.session.username}\u00A7r: ${message}`);
            }
            
            break;
          }
            
          case OpCodes.PING: {
 
            // TODO
            
            break;
          }
            
          case NaN: {
            
            socket.send(JSON.stringify({ op: OpCodes.INVALID, d: "Invalid operation code provided." }));
            
            break;
          }
        }
      }
    } catch (error) {
      console.error(error);
      console.log("[irc] retard sent invalid data");
    }
  });
  
  socket.on("close", () => {
    console.log(`[irc] ${ip} disconnected`);
  });
  
});