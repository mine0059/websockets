import express from 'express';
import { matchRouter } from './routes/matches.routes.js';

const app = express();
const PORT = 8080;

// This enable us to read Json objects/data
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from Express server!');
});

app.use('/matches', matchRouter)

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});