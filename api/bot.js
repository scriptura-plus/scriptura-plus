const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function POST(req) {
  try {
    const body = await req.json();
    const msg = body.message;

    if (!msg || !msg.text) {
      return new Response(JSON.stringify({ ok: true }));
    }

    const text = msg.text.trim();
    const chatId = msg.chat.id.toString();
    const senderId = msg.from.id.toString();
    const senderName = msg.from.first_name || 'Пользователь';

    // === Обработка /start ===
    if (text === '/start') {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '👋 Добро пожаловать! Отправьте мне библейский стих, например «Иоанна 3:16», и я подготовлю для вас карточку с исследованием.',
        }),
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    // === ADMIN MODE ===
    if (senderId === ADMIN_CHAT_ID && text.startsWith('/send')) {
      const parts = text.split('|');
      if (parts.length < 3) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: '❌ Ошибка: неверный формат. Нужно: /send <ID> <ссылка> [название]',
          }),
        });
        return new Response(JSON.stringify({ ok: true }));
      }

      const targetChatId = parts[1].trim();
      const messageLink = parts[2].trim();
      const optionalTitle = parts.slice(3).join('|').trim();

      const finalMessage = `✅ Ваше исследование${optionalTitle ? `: *${optionalTitle}*` : ''}\n\n📎 ${messageLink}`;

      // Отправка пользователю
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: finalMessage.trim(),
          parse_mode: 'Markdown',
        }),
      });

      // Подтверждение админу
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: '✅ Ссылка успешно отправлена!',
        }),
      });

      return new Response(JSON.stringify({ ok: true }));
    }

    // === Обычный запрос от пользователя ===
    const autoReplyText = `👋 Спасибо, ${senderName}! Ваш запрос на разбор стиха «${text}» получен.\n\nНаш ассистент уже обрабатывает его. В течение 24 часов вы получите готовую карточку с исследованием.`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: autoReplyText,
      }),
    });

    const notifyText = `📣 Новый запрос!\n\nПользователь: ${senderName} (${senderId})\nID чата: ${chatId}\n\nЗапрос: ${text}`;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: notifyText,
      }),
    });

    return new Response(JSON.stringify({ ok: true }));
  } catch (error) {
    console.error('Ошибка:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }));
  }
}
