// netlify/functions/notify-order.js
//
// รับข้อมูลออร์เดอร์จากหน้าเว็บ แล้ว push ข้อความสรุปเข้า LINE OA ของป้าโดยอัตโนมัติ
// เรียกจาก js/app.js หลัง Storage.set สำเร็จ
//
// ต้องตั้งค่า Environment Variables ใน Netlify (Site settings > Environment variables):
//   LINE_CHANNEL_ACCESS_TOKEN  -> Channel access token (long-lived) จาก LINE Developers Console
//   LINE_ADMIN_USER_ID         -> LINE user ID ของป้า (วิธีหาดู README.md)
//                                  ใส่ได้หลายคน คั่นด้วย , เช่น "Uabc...,Udef..."

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const adminIds = (process.env.LINE_ADMIN_USER_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!token || adminIds.length === 0) {
    console.warn('[notify-order] ยังไม่ได้ตั้งค่า LINE env vars ข้ามการแจ้งเตือน');
    // ไม่ error กลับไป เพราะไม่อยากให้ออร์เดอร์ที่บันทึกแล้วดูเหมือนล้มเหลว
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  let order;
  try {
    order = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const itemsText = (order.items || [])
    .map((i) => `• ${i.name} x${i.qty} (${i.unit}) = ${i.subtotal} บาท`)
    .join('\n');

  const messageText = [
    `🧡 มีออร์เดอร์ใหม่ #${order.code}`,
    `ชื่อ: ${order.name}`,
    `เบอร์: ${order.phone}`,
    `วันที่ต้องการรับ: ${order.date}`,
    '',
    itemsText,
    '',
    `ยอดรวม: ${order.total} บาท`,
    order.note ? `หมายเหตุ: ${order.note}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const results = await Promise.allSettled(
    adminIds.map((userId) =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text: messageText }],
        }),
      })
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.error('[notify-order] ส่งไม่สำเร็จบางรายการ:', failed);
  }

  return { statusCode: 200, body: JSON.stringify({ sent: results.length, failed: failed.length }) };
};
