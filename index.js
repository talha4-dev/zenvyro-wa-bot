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
        userCarts[from] = {
          items: [],
          stage: "browsing"
        };
      }

      console.log("📩 Message:", msgText);

      // ==============================
      // GREETING
      // ==============================
      if (
        msgText.includes("hi") ||
        msgText.includes("hello") ||
        msgText.includes("salam")
      ) {
        userCarts[from].stage = "browsing";
        await sendMenu(from);
      }

      // ==============================
      // MENU / MORE
      // ==============================
      else if (msgText === "menu" || msgText === "more") {
        await sendMenu(from);
      }

      // ==============================
      // ADD ITEMS (MULTI SUPPORT)
      // ==============================
      else if (containsMenuItem(msgText)) {
        const items = parseOrder(msgText);

        if (items.length === 0) {
          await sendMessage(from, "❌ Could not understand your order.");
        } else {
          items.forEach(item => {
            userCarts[from].items.push(item);
          });

          userCarts[from].stage = "ordering";

          await sendMessage(
            from,
            "✅ Items added to cart!\n\nType CART to view cart\nType CONFIRM to place order"
          );
        }
      }

      // ==============================
      // VIEW CART
      // ==============================
      else if (msgText === "cart") {
        await showCart(from);
      }

      // ==============================
      // CONFIRM ORDER
      // ==============================
      else if (msgText === "confirm") {
        if (userCarts[from].items.length === 0) {
          await sendMessage(from, "🛒 Your cart is empty.");
        } else {
          userCarts[from].stage = "awaiting_address";

          await sendMessage(
            from,
            "🎉 Order confirmed!\n\n📍 Please send your delivery address."
          );
        }
      }

      // ==============================
      // ADDRESS STAGE
      // ==============================
      else if (userCarts[from].stage === "awaiting_address") {

        userCarts[from] = {
          items: [],
          stage: "browsing"
        };

        await sendMessage(
          from,
          "🚚 Your food is being prepared!\n\n⏳ Estimated delivery: 40–50 minutes\n\nThank you for ordering from Zenvyro Fast Food 🍔"
        );
      }

      else {
        await sendMessage(
          from,
          "🤖 I didn’t understand.\n\nType MENU to see food items."
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});// ==============================
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
function sendMenu(to) {
  return sendMessage(
    to,
    "🍔 *Zenvyro Fast Food Menu*\n\n" +
    "• Zinger - Rs 450\n" +
    "• Pizza - Rs 899\n" +
    "• Fries - Rs 250\n" +
    "• Shawarma - Rs 300\n\n" +
    "You can order like:\n" +
    "👉 2 pizza 4 fries"
  );
}

function containsMenuItem(text) {
  return Object.keys(menu).some(item => text.includes(item));
}

function parseOrder(text) {
  const items = [];
  const regex = /(\d+)\s*(zinger|pizza|fries|shawarma)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const qty = parseInt(match[1]);
    const item = match[2];

    items.push({
      item: item,
      qty: qty,
      price: menu[item]
    });
  }

  return items;
}

async function showCart(to) {
  const cart = userCarts[to];

  if (cart.length === 0) {
    return sendMessage(to, "🛒 Your cart is empty.");
  }

  let total = 0;
  let summary = "🧾 *Your Cart:*\n\n";

  cart.forEach(item => {
    const itemTotal = item.qty * item.price;
    total += itemTotal;
    summary += `• ${item.qty} ${item.item} = Rs ${itemTotal}\n`;
  });

  summary += `\n💰 Total: Rs ${total}\n\nType CONFIRM to order`;

  await sendMessage(to, summary);
}
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
