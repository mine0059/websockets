import { WebSocket, WebSocketServer } from "ws"
import { wsArcjet } from "../config/arcjet.js";

// helper functions
function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}


/**
 *  this function will recieve the http server instance created by express
 *  and we are passing it into into webSocket so that it can attach is self to same 
 *  underlying server the http server will listen on that port and handle normal rest request
 *  while the websocket uses the same server to listen for upgrade request
 *  this avoid running a separate port for web socket.
 */
export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({ 
        server, 
        path: '/ws',
        maxPayload: 1024 *1024, // 1MB
     });

     wss.on('connection', async (socket, req) => {
        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);
                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1000;
                    const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Access denied';
                    
                    socket.close(code, reason);
                }
            } catch (err) {
                console.error('WS connection error', err);
                socket.close(1011, 'Server security error');
                return;
            }
        }

        socket.isAlive = true;
        socket.on('pong', () => { socket.isAlive = true; });

        sendJson(socket, { type: 'Welcome' });

        socket.on('error', console.error);
     });

     const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
     }, 30000);

     wss.on('close', () => clearInterval(interval));

     function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
     }

     return { broadcastMatchCreated }
}