import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const message = req.body.message;
  console.log("📩 Incoming Telegram update:", JSON.stringify(message, null, 2));

  if (!message) return res.sendStatus(200);
 
  const chatId = message.chat.id;
  const text = message.text || "No text";

  // Log any media
  if (message.video) console.log("🎥 video.file_id:", message.video.file_id);
  if (message.document) console.log("📄 document.file_id:", message.document.file_id);
  if (message.photo) {
    const last = message.photo.at(-1);
    console.log("🖼 photo.file_id:", last.file_id);
  }

  // Optional auto-reply
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `You said: ${text}`,
    }),
  });

  res.sendStatus(200);
}
