//Server
const WebSocket = require('ws');
const server = new WebSocket.Server({ host: '0.0.0.0', port: 5000 }, function() {
    console.log("Listening on port 5000...");
});
server.on('connection', ws => {
    new Player(ws);
    
    ws.on('message', message => {
        var objPlayer = Player.find(ws);
        objPlayer.process(message);
    });
    
    ws.on('close', () => {
        Player.remove(ws);
    });
});

//Players
class Player {
    
    constructor(socket) {
        this.authenticated = false;
        this.id = Player.all.length;
        this.justCreated = true;
        this.socket = socket;
        Player.all.push(this);
        console.log(`Player ${this.id} - created`);
        
        //Player needs to be authenticated within 2 seconds
        this.authTimer = setTimeout(() => {
            if (!this.authenticated) {
                console.log(`Player ${this.id} - authentication failed`);
                this.socket.close();
            }
        },2000);
    }
    
    static find(socket) {
        return(Player.all.find(x => x.socket === socket));        
    }  
    
    seeAll() {
        for (var objPlayer of Player.all) {
            if (objPlayer.id !== this.id) {
                //Get details from all other players
                this.socket.send(objPlayer.transformJSON());
            }
        };                        
    }
    
    process(message) {
        var json = JSON.parse(message);
        switch(json.command) {
            case "username":
                //Player is authenticated
                this.username = json.data;
                this.authenticated = true;
                console.log(`Player ${this.id} - authenticaton passed`);
                this.socket.send('{"command":"auth","data":"true"}');
                clearTimeout(this.authTimer);
                this.seeAll();
                break;
            case "transform":
                //Player moved
                var transform = json.data;
                this.x = transform.x;
                this.y = transform.y;
                this.z = transform.z;
                this.rotation = transform.rotation;
                this.sendToEveryoneElse(this.transformJSON());
                if (this.justCreated) {
                    this.justCreated = false;
                    this.seeAll();
                }
                break;
        }
    }   
    
    static remove(socket) {
        //Tell all other players that we've gone
        var objPlayer = Player.all.find(x => x.socket === socket);
        var json = `{"command":"playerGone","data":${objPlayer.id}}`;
        objPlayer.sendToEveryoneElse(json);
        console.log(`Player ${objPlayer.id} - gone`);
        
        //Remove me from list of all players
        Player.all = Player.all.filter(function(obj) {
            return obj.socket !== socket;
        });           
    }  
    
    //Send message to all other players
    sendToEveryoneElse(json) {
        var _this = this;
        for (var objPlayer of Player.all) {
            if (objPlayer.socket !== _this.socket) {
                objPlayer.socket.send(json);
            }
        };        
    }
    
    //Position and rotation details
    transformJSON() {
        var json = `{"command":"playerMoved","data":{"id":${this.id},"username":"${this.username}","x":${this.x},"y":${this.y},"z":${this.z},"rotation":${this.rotation}}}`; 
        return json;
    }
}

Player.all = new Array();