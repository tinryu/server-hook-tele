// stream-proxy.js
// Node 18+ recommended
import express from "express";  // npm i express
import serverless from "serverless-http"; // npm i serverless-http
import dotenv from "dotenv";
import fetch from "node-fetch"; // npm i node-fetch@3
import { pipeline } from "stream";
import { promisify } from "util";
dotenv.config();
const pipelineAsync = promisify(pipeline);
const app = express();

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Helper to build Telegram file URL from file_path
const telegramFileUrl = (filePath) =>
  `https://api.telegram.org/file/bot8${BOT_TOKEN}/${filePath}`;

app.post("/webhook", async (req, res) => {
  console.log("Incoming update:", JSON.stringify(req.body, null, 2)); // 👈 Add this

  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text || "No text";

  try {
    await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `You said: ${text}`,
      }),
    });
    console.log("Replied successfully to chat:", chatId);
  } catch (error) {
    console.error("Error sending message:", error);
  }

  res.sendStatus(200);
});

// Example route: /stream?file_path=videos/file_12345.mp4
app.get("/stream", async (req, res) => {
  let upstream;
  try {
    const filePath = req.query.file_path;
    if (!filePath) return res.status(400).send("file_path missing");

    // Add file type validation
    const allowedTypes = ['.mp4', '.mp3', '.wav', '.pdf', '.jpg', '.jpeg', '.png'];
    const fileExt = filePath.toLowerCase().match(/\.[^/.]+$/);
    if (!fileExt || !allowedTypes.includes(fileExt[0])) {
      return res.status(400).send("Invalid file type");
    }

    const tgUrl = telegramFileUrl(filePath);
    const range = req.headers.range;
    const headers = {};
    if (range) headers.range = range;

    upstream = await fetch(tgUrl, { headers });

    if (!upstream.ok) {
      return res.status(502).send("Failed to fetch from Telegram");
    }

    const status = upstream.status;
    const contentType = upstream.headers.get("content-type") || 
      (fileExt[0] === '.mp4' ? 'video/mp4' : 'application/octet-stream');
    const contentLength = upstream.headers.get("content-length");
    const acceptRanges = upstream.headers.get("accept-ranges") || "bytes";

    res.status(status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filePath.split('/').pop()}"`);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Accept-Ranges", acceptRanges);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);

    // Handle client disconnection
    req.on('close', () => {
      if (upstream && upstream.body) {
        upstream.body.destroy();
      }
    });

    // Use pipeline with proper error handling
    await pipelineAsync(
      upstream.body,
      res
    ).catch(err => {
      if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
        console.log('Client disconnected prematurely');
      } else {
        throw err; // Re-throw other errors
      }
    });

  } catch (err) {
    console.error('Stream error:', err);
    if (!res.headersSent) {
      res.status(500).send("Server error");
    }
    // Cleanup
    if (upstream && upstream.body) {
      upstream.body.destroy();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Stream proxy listening on http://localhost:${PORT}`);
});

export default serverless(app);
