const OpCodes = require("./OpCodes");
const UserStatus = require("./UserStatus");

const { beta, developers, admins } = require("./status.json");

module.exports.Session = class Session {
  constructor(username, socket) {
    this.key = Math.random().toString(32).substring(2);
    this.username = username;
    
    this.admin = false;
    this.status = UserStatus.RANDROID;
    
    this.latency = 0;
    this.lastPing = 0;
    
    this.lastMessageSent = 0;
    
    this.socket = socket;
    
    console.log(`[irc] new session | ${username} (${this.key})`);
  }
  
  sendMessage(op, content) {
    const json = {};
    
    json["op"] = op;
    json["d"] = content;
    
    this.socket.send(JSON.stringify(json));
  }
  
  disconnect(reason) {
    if (!reason || reason === null) {
      reason = "No reason specified.";
    }
    
    console.log(`[irc] disconnecting user ${this.username} for reason ${reason}`);
    
    this.sendMessage(OpCodes.DISCONNECTED, reason);
    this.socket.close();
    
    // memory go brrrrr
    clearInterval(this.interval);
  }
  
  startPing() {
    
    // do not start two intervals
    if (this.interval) {
      return;
    }
    
    this.interval = setInterval(() => {
      // if (this.lastPing !== 0 && Date.now() - this.lastPing >= 30000) {
      //   this.disconnect("No ping data recieved in past 20 seconds.");
      //   return;
      // }

      this.lastPing = Date.now();
      this.sendMessage(OpCodes.PING, "");
    }, 20 * 1000);
  }
  
  ping() {
    if (this.lastPing !== 0 && Date.now() - this.lastPing >= 20000) {
      this.disconnect("No ping data recieved.");
      return;
    }
    
    this.lastPing = Date.now();
  }
  
  recievePing() {
    this.latency = Date.now() - this.lastPing;
    this.lastPing = Date.now();
  }
  
  updateStatus() {
    if (admins.contains(this.username)) {
      this.admin = true;
    }
    
    if (beta.contains(this.username)) {
      this.status = UserStatus.BETA;
    }
    
    if (developers.contains(this.username)) {
      this.status = UserStatus.DEVELOPER;
    }
    
    console.log(`[irc] ${this.username} updated status to ${this.status} (${this.admin})`);
  }
}