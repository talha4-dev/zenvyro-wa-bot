const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = "zenvyro_verify_token";
const ACCESS_TOKEN = "EAAShTZCjEmiABQyw6U48Ods0vES0KOAyOTLvOAkVveNNJGjuFn7HHy6NCPTBotOPfwl45G2hqJ4bcQWSrxGz06XXCAyC8z2In6ZBGw1p62NKBVDVjAz1PaMGufVyQphQsuxfg7CeZCPW9K3Oj5yy5oIxcyn9wFcWLftRqxJru7HlXWyb12gQYjUEGANpCTJSRDy4JMalcwVVQoHPGPav91KyzZBhZB3XFOWt3K1wGN1aYgLIZBNk3uugJ88ZCVuA6VZCoTuBqZAkm0Jq3uSBHfcBuuQZDZD";
const PHONE_NUMBER_ID = "954365301100871";

// Webhook verification (required by Meta)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.entry) {
    const message = body.entry[0].changes[0].value.messages?.[0];

    if (message && message.text) {
      const from = message.from;
      const text = message.text.body.toLowerCase();

      if (text === "menu") {
        await axios.post(
          `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: from,
            text: {
              body: "🦖 Zenvyro Labs Menu\n\n🍔 Classic – 499\n🍔 Zilla – 699\n🍟 Fries – 299\n\nType order + item name"
            }
          },
          {
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );
      }
    }
  }

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Bot running on port 3000"));
