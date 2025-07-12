export default async function handler(request, response) {
  // Проверяем, что это POST-запрос от Telegram
  if (request.method !== 'POST') {
    return response.status(405).send('Method Not Allowed');
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  
  const body = request.body;
  const message = body.message;

  // Если в запросе нет сообщения, ничего не делаем
  if (!message) {
    return response.status(200).send('OK');
  }

  const userChatId = message.chat.id;
  const userText = message.text;
  const userName = message.from.first_name || 'Пользователь';

  // URL для отправки запросов к Telegram API
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}`;

  try {
    // 1. Отправляем автоматический ответ пользователю
    const autoReplyText = `👋 Спасибо, ${userName}! Ваш запрос на разбор стиха «${userText}» получен.\n\nНаш ассистент уже обрабатывает его. В течение 24 часов вы получите готовую карточку с исследованием.`;
    await fetch(`${telegramApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: userChatId,
        text: autoReplyText,
      }),
    });

    // 2. Пересылаем запрос администратору (вам)
    const adminNotificationText = `🔔 Новый запрос!\n\nПользователь: ${userName}\nID чата: ${userChatId}\n\nЗапрос: ${userText}`;
    await fetch(`${telegramApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: adminNotificationText,
      }),
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
  }

  // Сообщаем Telegram, что мы всё получили и обработали
  response.status(200).send('OK');
}
