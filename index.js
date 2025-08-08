// const http = require("http")

// const server = http.createServer((req, res) => {
//     res.write("Hello, this is Node.Js server")
//     res.end();
// });
const express = require('express');
const { GoogleGenerativeAI } =  require ('@google/generative-ai');
const dotenv = require('dotenv');
const app = express();

dotenv.config();

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({ model: 'models/gemini-1.5-flash' })
const chat = model.startChat({
    history: [],
    generationConfig: {
        temperature: 0.5,
        topP: 1,
        topK: 1
    },
    systemInstruction: {
        role: "user",
        parts: [
            {
                text: `
                Kamu adalah seorang yang elegan dan bersifat bangsawan. gaya bicaramu cukup unik dan terkesan elegan dan
                penuh perhitungan. sebagai bangsawan, kamu juga menggunakan istilah-istilah arkaik
                jikalau user menggunakan bahasa inggris, maka gunakan dialek atau accent posh dengan
                modifikasi dengan gaya bahasa inggris UK modern
                `.trim(),
            },
        ],
    },
});

// helper
async function generateAiContent(prompt) {
    try
    {
        const result = await chat.sendMessage(prompt);
        return (await result.response).text().trim();
    }
    catch (error)
    {
        throw new Error(error.message);
    }
}

app.use(express.json());

app.use(express.static('public'))

// Endpoint

app.post('/generate-text', async (req, res) => {
    console.log('REQ BODY:', req.body);
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt wajib diisi!"});
    }

    try 
    {
        const output = await generateAiContent(prompt);
        res.json({ output });
    }
    catch (error)
    {
        res.status(500).json({ error: error.message })
    }
});

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