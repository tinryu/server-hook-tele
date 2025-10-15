import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const BOT_TOKEN = process.env.BOT_TOKEN;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: `You said: ${message.text || "no text"}`,
    }),
  });

  res.sendStatus(200);
}
