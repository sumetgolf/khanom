// netlify/functions/line-webhook.js
//
// ใช้สำหรับ "ครั้งแรกตอน setup" เท่านั้น: ให้ป้าทักแชทมาที่ LINE OA อะไรก็ได้ 1 ข้อความ
// ระบบจะตอบกลับ LINE user ID ของป้ามาให้ในแชททันที ให้ก็อปไปใส่ค่า LINE_ADMIN_USER_ID
//
// ตั้งค่า Webhook URL ใน LINE Developers Console (แท็บ Messaging API) เป็น:
//   https://<ชื่อไซต์>.netlify.app/.netlify/functions/line-webhook
// แล้วเปิด toggle "Use webhook" ให้เป็นสีเขียว

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 200, body: 'ok' };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 200, body: 'ok' };
  }

  const events = body.events || [];

  await Promise.allSettled(
    events.map(async (ev) => {
      if (ev.type === 'message' && ev.replyToken) {
        const userId = (ev.source && ev.source.userId) || 'ไม่พบ userId (อาจเป็นแชทกลุ่ม)';
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            replyToken: ev.replyToken,
            messages: [
              {
                type: 'text',
                text: `LINE user ID ของคุณคือ:\n${userId}\n\nเอาไปใส่ในค่า LINE_ADMIN_USER_ID บน Netlify ได้เลยค่ะ`,
              },
            ],
          }),
        });
      }
    })
  );

  return { statusCode: 200, body: 'ok' };
};
