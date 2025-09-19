// const http = require("http")

// const server = http.createServer((req, res) => {
    //     res.write("Hello, this is Node.Js server")
    //     res.end();
    // });
const ollama = require("ollama");
const express = require('express');
// const cors = require("cors")
const dotenv = require('dotenv');
const { GoogleGenerativeAI } =  require ('@google/generative-ai');
const multer = require('multer');
const path = require("path")
const app = express();
const port = process.env.PORT || 3000;
const fs = require('fs');
// const mime = require('mime');
const mime = require('mime-types');
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '/upload'))
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: diskStorage });


dotenv.config();
// app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/upload', express.static(path.join(__dirname, '/upload')));


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
// Endpoint
// app.post('/ask-query', async (req, res) => {
//   const { prompt } = req.body;

//   try {
//     const response = await ollama.chat({
//       model: 'hr.co/Qwen/Qwen3-8b-GGUF:Q4_K_M',
//       messages: [{ role: 'user', content: prompt }],
//     });

//     res.json({ reply: response.message.content });
//   } catch (error) {
//     res.status(500).send({ error: 'Error interacting with the model' });
//   }
// });

app.post('/api/chat', async (req, res) => {
    console.log('REQ BODY:', req.body);
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "No Messege Provided!"});
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

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const prompt = req.body.prompt;

    if (!file || !prompt) {
      return res.status(400).json({ error: 'File and prompt are required' });
    }

    // Read image as base64
    const fileData = fs.readFileSync(file.path);
    const mimeType = mime.lookup(file.path);
    const base64Image = fileData.toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
      { text: prompt },
    ]);

    const text = result.response.text();

    res.json({ output: text, fileUrl: `/upload/${file.filename}` });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ error: 'Failed to process image with AI' });
  }
});

// app.get ('/', (req, res) => {
//     res.send("Hello From Express.Js");
// });

// app.get("/muryadi", (req, res) => {
//     res.send("Nama Bapak Saya Muryadi (eh tapi bo'ong)")
// });

// app.post("/hello", (req, res) => {
//     const Name = req.body.name;
//     res.send(`Hello, my name is ${Name}!`);
// });

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000")
});