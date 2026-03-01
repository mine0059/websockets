import { WebSocketServer, WebSocket } from "ws";

// this websocketServer creats a zombie http server that only exist to listen 
// for that upgrade handshake
const wss = new WebSocketServer({ port: 8080 });

// conection Event 
//note:: 0: CONNECTING,  1: OPEN,  2: CLOSING,  3: CLOSED
wss.on('connection', (socket, request) => {
    const ip = request.socket.remoteAddress;

    socket.on('message', (rawData) => {
        const message = rawData.toString();
        console.log({ rawData });

        wss.clients.forEach((client) => {
            // always make sure you are talking to open clients which is the 1 === OPEN.
            if (client.readyState === WebSocket.OPEN) client.send(`Server Broadcast: ${message}`);
        });
        
    });

    socket.on('error', (err) => {
        console.log(`Error: ${err.message}: ${ip}`);
    });

    socket.on('close', () => {
        console.log('Client disconnected');
    })
});


console.log("Websocket Server is live on ws://localhost:8080");