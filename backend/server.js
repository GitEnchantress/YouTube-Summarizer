import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Best Practice: The unified GoogleGenAI SDK reads process.env.GEMINI_API_KEY automatically
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// FIXED: Cleaned and bulletproof YouTube ID regex extraction
function extractVideoId(url) {
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v=|\&v=))([^#\&\?]*)/;
  const match = url.match(regExp);
  return (match && match[1] && match[1].length === 11) ? match[1] : null;
}

app.post('/api/summarize', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL format" });
  }

  // FIXED: Fallback to environment variable or standard 'python3' for team deployment portability
  const pythonPath = '/opt/anaconda3/envs/ai_summarizer/bin/python';
  const pythonProcess = spawn(pythonPath, ['scraper.py', videoId], {
  env: { ...process.env } // This passes your GEMINI_API_KEY into the child process environment
});

  let scriptData = "";
  let errorData = "";

  pythonProcess.stdout.on('data', (data) => {
    scriptData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  // FIXED: Standardize pipeline execution flow when process stream completely flushes
  pythonProcess.on('close', async (code) => {
    // Strip empty whitespace safely
    const cleanError = errorData.trim();
    const cleanScript = scriptData.trim();

    if (cleanError && !cleanScript) {
      return res.status(500).json({ error: `Python Subsystem Error: ${cleanError}` });
    }

    try {
      const parsedResult = JSON.parse(cleanScript);

      if (!parsedResult.success) {
        return res.status(500).json({ error: parsedResult.error });
      }

      // Execute unified Gemini model request properly using modern architecture requirements
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide a quick, 5-bullet-point summary of this transcript:\n\n${parsedResult.transcript}`,
      });

      return res.json({ summary: response.text });

    } catch (err) {
      return res.status(500).json({
        error: "Pipeline Processing Error",
        details: err.message,
        raw_output: cleanScript
      });
    }
  });
});

const PORT = 5005;
// Force binding to global IPv4 pool
app.listen(PORT, '0.0.0.0', () => console.log(`Backend spinning safely on port ${PORT}`));
