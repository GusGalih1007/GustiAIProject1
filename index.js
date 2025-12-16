const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi upload
const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        // Buat folder uploads jika belum ada
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inisialisasi Gemini
const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAi.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `
    Kamu adalah seorang yang elegan dan bersifat bangsawan. 
    Gaya bicaramu cukup unik dan terkesan elegan dan penuh perhitungan. 
    Sebagai bangsawan, kamu juga menggunakan istilah-istilah arkaik.
    Jika user menggunakan bahasa Inggris, gunakan dialek atau accent posh 
    dengan modifikasi gaya bahasa Inggris UK modern.
  `
});

// Helper function
async function generateAiContent(prompt) {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}

// Endpoint untuk chat text
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Chat request:', req.body);
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "No message provided!" });
        }

        const output = await generateAiContent(prompt);
        console.log('Chat response:', output);
        res.json({ output });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint untuk upload gambar
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received');

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const prompt = req.body.prompt || "Please describe this image";
        const filePath = req.file.path;
        const mimeType = mime.lookup(filePath) || 'image/jpeg';

        console.log('Processing file:', req.file.filename);
        console.log('Prompt:', prompt);

        // Baca file sebagai base64
        const fileData = fs.readFileSync(filePath);
        const base64Image = fileData.toString('base64');

        // Kirim ke Gemini
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                },
            },
            { text: prompt },
        ]);

        const text = result.response.text();
        const fileUrl = `/uploads/${req.file.filename}`;

        console.log('Image processing successful');
        res.json({
            output: text,
            fileUrl: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error in /api/upload:', error);

        // Hapus file jika gagal
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Failed to process image with AI: ' + error.message
        });
    }
});

// Serve HTML untuk root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Make sure GEMINI_API_KEY is set in .env file`);
});