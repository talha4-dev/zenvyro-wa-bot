const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ✅ Environment Variables (from Render)
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const PORT = process.env.PORT || 3000;

// ==============================
// 🔐 Webhook Verification (Meta requires this)
// ==============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Verification failed");
    res.sendStatus(403);
  }
});

// ==============================
// 📩 Receive Messages
// ==============================
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      body.object &&
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const msgText = message.text?.body?.toLowerCase();

      console.log("📩 Message received:", msgText);

      // Auto reply when user types "menu"
      if (msgText === "menu") {
        await sendMessage(from, 
          "👋 Welcome to Zenvyro Labs!\n\n" +
          "1️⃣ Web Development\n" +
          "2️⃣ App Development\n" +
          "3️⃣ AI Automation\n\n" +
          "Reply with a number to continue."
        );
      } else {
        await sendMessage(from, "🤖 Type *menu* to see available options.");
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ==============================
// 📤 Send WhatsApp Message
// ==============================
async function sendMessage(to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Message sent");
  } catch (error) {
    console.error("❌ Send error:", error.response?.data || error.message);
  }
}

// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
