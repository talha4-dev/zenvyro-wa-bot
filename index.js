const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// ==============================
// 🔐 ENV VARIABLES (Render)
// ==============================
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;

// ==============================
// 🛒 In-memory Cart Storage
// ==============================
const userCarts = {};

// ==============================
// 🍔 Menu Data
// ==============================
const menu = {
  zinger: 450,
  pizza: 899,
  fries: 250,
  shawarma: 300
};

// ==============================
// 🔐 Webhook Verification
// ==============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
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
      const msgText = message.text?.body?.toLowerCase().trim();

      if (!userCarts[from]) {
        userCarts[from] = [];
      }

      console.log("📩 Message:", msgText);

      // ==============================
      // 👋 Greeting
      // ==============================
      if (
        msgText.includes("hi") ||
        msgText.includes("hello") ||
        msgText.includes("salam") ||
        msgText === "menu"
      ) {
        await sendMessage(
          from,
          "🍔 *Welcome to Zenvyro Fast Food!*\n\n" +
            "🔥 Fresh • Hot • Delivered Fast\n\n" +
            "You can order like this:\n" +
            "👉 2 zinger\n" +
            "👉 1 pizza\n" +
            "👉 3 fries\n\n" +
            "Our Menu:\n" +
            "• Zinger - Rs 450\n" +
            "• Pizza - Rs 899\n" +
            "• Fries - Rs 250\n" +
            "• Shawarma - Rs 300\n\n" +
            "What would you like to order?"
        );
      }

      // ==============================
      // 🛒 Add Item Logic
      // ==============================
      else if (Object.keys(menu).some(item => msgText.includes(item))) {
        const quantityMatch = msgText.match(/\d+/);
        const qty = quantityMatch ? parseInt(quantityMatch[0]) : 1;

        const itemName = Object.keys(menu).find(item =>
          msgText.includes(item)
        );

        userCarts[from].push({
          item: itemName,
          qty: qty,
          price: menu[itemName]
        });

        await sendMessage(
          from,
          `✅ ${qty} ${itemName}(s) added to cart.\n\n` +
            `Type MORE to add more items\n` +
            `Type CART to view cart\n` +
            `Type CONFIRM to place order`
        );
      }

      // ==============================
      // 🧾 View Cart
      // ==============================
      else if (msgText === "cart") {
        const cart = userCarts[from];

        if (cart.length === 0) {
          await sendMessage(from, "🛒 Your cart is empty.");
        } else {
          let total = 0;
          let summary = "🧾 *Your Cart:*\n\n";

          cart.forEach(item => {
            const itemTotal = item.qty * item.price;
            total += itemTotal;

            summary += `• ${item.qty} ${item.item} = Rs ${itemTotal}\n`;
          });

          summary += `\n💰 Total: Rs ${total}\n\nType CONFIRM to order`;

          await sendMessage(from, summary);
        }
      }

      // ==============================
      // ✅ Confirm Order
      // ==============================
      else if (msgText === "confirm") {
        const cart = userCarts[from];

        if (cart.length === 0) {
          await sendMessage(from, "🛒 Your cart is empty.");
        } else {
          userCarts[from] = [];

          await sendMessage(
            from,
            "🎉 *Order Confirmed!*\n\n" +
              "📍 Please send your location.\n\n" +
              "Our rider will reach you soon 🚴‍♂️"
          );
        }
      }

      // ==============================
      // ❌ Clear Cart
      // ==============================
      else if (msgText === "clear") {
        userCarts[from] = [];
        await sendMessage(from, "🗑 Cart cleared.");
      }

      // ==============================
      // 🤖 Fallback
      // ==============================
      else {
        await sendMessage(
          from,
          "🤖 I didn’t understand.\n\n" +
            "Try:\n" +
            "👉 2 zinger\n" +
            "👉 1 pizza\n\n" +
            "Or type MENU"
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ==============================
// 📤 Send Message Function
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
  } catch (error) {
    console.error("❌ Send error:", error.response?.data || error.message);
  }
}

// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
