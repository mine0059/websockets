import http from 'http';
import express from 'express';
import { matchRouter } from './routes/matches.routes.js';
import { attachWebSocketServer } from './ws/server.js';

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

// This enable us to read Json objects/data
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from Express server!');
});

app.use('/matches', matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ?  `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running on ${baseUrl}`);
    console.log(`Websocket server is running on ${baseUrl.replace('http', 'ws')}/ws`);
});