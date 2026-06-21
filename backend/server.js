const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match.length === 11) ? match : null;
}

app.post('/api/summarize', async (req, res) => {
  const { videoUrl } = req.body;
  const videoId = extractVideoId(videoUrl);

  if (!videoId) {
    return res.status(400).json({ error: "Invalid YouTube URL format" });
  }

  const pythonPath = '/opt/anaconda3/envs/ai_summarizer/bin/python'; 
  const pythonProcess = spawn(pythonPath, ['scraper.py', videoId]);
  let scriptData = "";

  pythonProcess.stdout.on('data', (data) => {
    scriptData += data.toString();
  });

  pythonProcess.on('close', async (code) => {
    try {
      if (!scriptData.trim()) {
        return res.status(500).json({ error: "Python script returned empty data." });
      }

      const parsedResult = JSON.parse(scriptData);
      if (!parsedResult.success) {
        return res.status(500).json({ error: "Could not fetch captions for this video." });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide a quick, 5-bullet-point summary of this transcript:\n\n${parsedResult.transcript}`,
      });

      res.json({ summary: response.text });
    } catch (err) {
      res.status(500).json({ error: "Processing error: " + err.message });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend spinning on port ${PORT}`));
