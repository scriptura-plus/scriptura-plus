import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function POST(req) {
  try {
    const body = await req.json();
    const msg = body.message;

    if (!msg || !msg.text) {
      return NextResponse.json({ ok: true });
    }

    const text = msg.text.trim();
    const chatId = msg.chat.id.toString();
    const senderId = msg.from.id.toString();

    // === ADMIN MODE ===
    if (senderId === ADMIN_CHAT_ID && text.startsWith('/send')) {
      const parts = text.split(' ');

      if (parts.length < 3) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: '❌ Ошибка: неверный формат. Нужно: /send <ID> <ссылка> [название стиха]',
          }),
        });
        return NextResponse.json({ ok: true });
      }

      const targetChatId = parts[1];
      const messageLink = parts[2];
      const optionalTitle = parts.slice(3).join(' ');

      const finalMessage = `✅ Ваше исследование${optionalTitle ? ` стиха «${optionalTitle}»` : ''} готово!\n\n🧾 Ознакомьтесь с карточкой:\n${messageLink}\n\nСпасибо за интерес к Божьему Слову!`;

      // Отправка пользователю
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: finalMessage.trim(),
        }),
      });

      // Подтверждение админу
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: `✅ Ссылка успешно отправлена пользователю ${targetChatId}.`,
        }),
      });

    } else {
      // === USER MODE ===
      const userName = msg.from.first_name || 'друг';

      // Ответ пользователю
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `👋 Спасибо, ${userName}! Ваш запрос на разбор стиха «${text}» получен.\n\nНаш ассистент уже обрабатывает его. В течение 24 часов вы получите готовую карточку с исследованием.`,
        }),
      });

      // Уведомление админу
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: `🔔 Новый запрос!\n\nПользователь: ${userName} (${senderId})\nID чата: ${chatId}\n\nЗапрос: ${text}`,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ok: true });
  }
}
