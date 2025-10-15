import fetch from "node-fetch";

export default async function handler(req, res) {
  const { file_path } = req.query;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!file_path) {
    return res.status(400).send("Missing file_path");
  }
 
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${encodeURI(file_path)}`;
  console.log("Proxying Telegram file:", fileUrl);

  try {
    const tgRes = await fetch(fileUrl);

    if (!tgRes.ok) {
      const errorBody = await tgRes.text();
      console.error("Telegram error:", tgRes.status, errorBody);
      return res.status(tgRes.status).send(errorBody);
    }

    res.setHeader("Content-Type", tgRes.headers.get("content-type") || "application/octet-stream");
    tgRes.body.pipe(res);
  } catch (err) {
    console.error("Stream error:", err);
    res.status(500).send(`Error fetching from Telegram: ${err.message}`);
  }
}
