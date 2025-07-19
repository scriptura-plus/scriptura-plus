export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const body = req.body;
    const msg = body.message;

    if (!msg || !msg.text) {
      return res.status(200).json({ ok: true });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
    const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    const text = msg.text.trim();
    const chatId = msg.chat.id.toString();
    const senderId = msg.from.id.toString();
    const senderName = msg.from.first_name || 'Пользователь';

    if (text === '/start') {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '👋 Добро пожаловать! Отправьте мне библейский стих, например «Иоанна 3:16», и я подготовлю для вас карточку с исследованием.',
        }),
      });
      return res.status(200).json({ ok: true });
    }

    // ADMIN MODE (Обновленная версия)
    if (senderId === ADMIN_CHAT_ID && text.startsWith('/send')) {
      const parts = text.split('|');
      // Теперь формат /send <ID> | <текст сообщения>
      // Значит, должно быть как минимум 2 части
      if (parts.length < 2) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: '❌ Ошибка: неверный формат. Нужно: /send <ID> | <текст сообщения>',
          }),
        });
        return res.status(200).json({ ok: true });
      }

      const targetChatId = parts[0].replace('/send', '').trim();
      const messageToSend = parts.slice(1).join('|').trim();

      if (!targetChatId || !messageToSend) {
        await fetch(`${TELEGRAM_API}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: ADMIN_CHAT_ID,
            text: '❌ Ошибка: не указан ID или текст сообщения.',
          }),
        });
        return res.status(200).json({ ok: true });
      }


      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: messageToSend,
          parse_mode: 'Markdown', // Эта строка позволяет использовать **жирный** и [ссылки](url)
          disable_web_page_preview: true, // Отключаем превью ссылок для чистоты сообщения
        }),
      });

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: '✅ Сообщение успешно отправлено!',
        }),
      });

      return res.status(200).json({ ok: true });
    }

    // Стандартный ответ
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

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Ошибка:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
