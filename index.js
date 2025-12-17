/**
 * ================================
 * IMPORT DEPENDENCIES
 * ================================
 */
const express = require('express');              // Framework backend Node.js
const dotenv = require('dotenv');                // Membaca environment variable dari file .env
const { GoogleGenerativeAI } = require('@google/generative-ai'); // SDK Gemini AI
const multer = require('multer');                // Middleware upload file
const path = require('path');                    // Utility path file/folder
const fs = require('fs');                        // File system Node.js
const mime = require('mime-types');               // Deteksi MIME type file

// Load environment variable
dotenv.config();

/**
 * ================================
 * INISIALISASI EXPRESS APP
 * ================================
 */
const app = express();
const port = process.env.PORT || 3000;

/**
 * ================================
 * KONFIGURASI UPLOAD FILE (MULTER)
 * ================================
 */
const diskStorage = multer.diskStorage({
    // Tentukan folder tujuan upload
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');

        // Buat folder uploads jika belum ada
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },

    // Penamaan file agar unik
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(
            null,
            file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
        );
    }
});

// Inisialisasi multer + batas ukuran file (10MB)
const upload = multer({
    storage: diskStorage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

/**
 * ================================
 * MIDDLEWARE GLOBAL
 * ================================
 */
app.use(express.json()); // Parsing JSON body
app.use(express.static(path.join(__dirname, 'public'))); // Akses file public
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Akses file upload

/**
 * ================================
 * INISIALISASI GEMINI AI
 * ================================
 */
const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Ambil model Gemini + system instruction
const model = genAi.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: `
    Kamu adalah seorang yang elegan dan bersifat bangsawan.
    Gaya bicaramu cukup unik dan terkesan elegan dan penuh perhitungan.
    Sebagai bangsawan, kamu juga menggunakan istilah-istilah arkaik.
    Jika user menggunakan bahasa Inggris, gunakan dialek posh 
    dengan gaya Inggris UK modern.
  `
});

/**
 * ================================
 * HELPER FUNCTION AI
 * ================================
 */
async function generateAiContent(prompt) {
    try {
        // Kirim prompt ke Gemini
        const result = await model.generateContent(prompt);

        // Ambil hasil text
        return result.response.text().trim();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`Gemini API Error: ${error.message}`);
    }
}

/**
 * ================================
 * API CHAT (TEXT ONLY)
 * ================================
 */
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Chat request:', req.body);

        const { prompt } = req.body;

        // Validasi input
        if (!prompt) {
            return res.status(400).json({ error: "No message provided!" });
        }

        // Generate jawaban AI
        const output = await generateAiContent(prompt);

        console.log('Chat response:', output);

        res.json({ output });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * ================================
 * API UPLOAD GAMBAR + AI VISION
 * ================================
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received');

        // Validasi file
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const prompt = req.body.prompt || "Please describe this image";
        const filePath = req.file.path;

        // Deteksi MIME type gambar
        const mimeType = mime.lookup(filePath) || 'image/jpeg';

        console.log('Processing file:', req.file.filename);
        console.log('Prompt:', prompt);

        // Baca file lalu encode ke base64
        const fileData = fs.readFileSync(filePath);
        const base64Image = fileData.toString('base64');

        // Kirim gambar + prompt ke Gemini Vision
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

        // Hapus file jika proses gagal
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            error: 'Failed to process image with AI: ' + error.message
        });
    }
});

/**
 * ================================
 * ROUTE ROOT (INDEX.HTML)
 * ================================
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * ================================
 * GLOBAL ERROR HANDLER
 * ================================
 */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

/**
 * ================================
 * START SERVER
 * ================================
 */
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Make sure GEMINI_API_KEY is set in .env file`);
});
