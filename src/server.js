import express from 'express';

const app = express();
const PORT = 8080;

// This enable us to read Json objects
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello from Express server!');
})

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});