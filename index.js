// const http = require("http")

// const server = http.createServer((req, res) => {
//     res.write("Hello, this is Node.Js server")
//     res.end();
// });

const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const app = express();

console.log(process.env.GEMINI_API_KEY);

app.use(express.json());

// Endpoint
app.get ('/', (req, res) => {
    res.send("Hello From Express.Js");
});

app.get("/muryadi", (req, res) => {
    res.send("Nama Bapak Saya Muryadi (eh tapi bo'ong)")
});

app.post("/hello", (req, res) => {
    const Name = req.body.name;
    res.send(`Hello, my name is ${Name}!`);
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000")
});