import { env } from "../config/env.js";

const money = (n) => `${Number(n).toLocaleString("ru-RU").replace(/,/g, " ")} so‘m`;

// .env da TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID to'ldirilgan bo'lsa,
// har bir yangi buyurtma haqida do'kon egasiga xabar yuboradi.
export async function notifyNewOrder(order) {
  const { token, chatId } = env.telegram;
  if (!token || !chatId) return;

  const lines = [
    `🛍 Yangi buyurtma #${order.id}`,
    "",
    `👤 ${order.customer_name}`,
    `📞 ${order.phone}`,
    order.delivery === "pickup"
      ? "🏬 Do‘kondan olib ketadi"
      : `🚚 ${[order.region, order.address].filter(Boolean).join(", ")}`,
    order.comment ? `💬 ${order.comment}` : null,
    "",
    ...order.items.map((i) => `• ${i.title} — ${i.size === "—" ? "razmer kelishiladi" : i.size} × ${i.quantity} — ${money(i.price * i.quantity)}`),
    "",
    `💰 Jami: ${money(order.total)}`,
  ].filter((l) => l !== null);

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error("Telegram xabari yuborilmadi:", err.message);
  }
}
