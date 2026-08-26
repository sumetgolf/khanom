# ขนมป้า — เว็บสั่งจองขนมไทย

## โครงสร้างไฟล์
```
khanom-project/
├── index.html        โครงหน้าเว็บทั้งหมด (nav, hero, เมนู, cart drawer, admin panel)
├── css/
│   └── style.css      สไตล์ทั้งหมด (สี, ฟอนต์, layout, responsive)
└── js/
    ├── data.js         ข้อมูลเมนูขนม (ชื่อ, หน่วย, ราคา, ไอคอน SVG) — แก้/เพิ่ม/ลบเมนูที่ไฟล์นี้ที่เดียว
    └── app.js          ลอจิกทั้งหมด: ตะกร้า, ฟอร์มจอง, บันทึก/อ่านออร์เดอร์, หน้าหลังบ้าน
```

## วิธีแก้ไขเมนู/ราคา
เปิด `js/data.js` แล้วแก้ array `MENU` แต่ละรายการมี:
- `id` — รหัสไม่ซ้ำ (ห้ามมีเว้นวรรค)
- `name`, `unit`, `price`, `color`
- `icon` — โค้ด SVG เล็กๆ แสดงในการ์ดเมนู

เพิ่มรายการใหม่ก็ copy object เดิมมาแก้ค่าได้เลย ไม่ต้องแตะไฟล์อื่น

## ⚠️ เรื่องสำคัญ: การบันทึกออร์เดอร์ (js/storage-adapter.js)
โค้ดใน `js/app.js` เรียกใช้ `Storage.set/get/list` (ตัวแปร `Storage` มาจาก `js/storage-adapter.js`) ซึ่งทำงาน 2 โหมดอัตโนมัติ:

1. **เปิดเป็น Artifact ในแชท Claude.ai** — จะมี `window.storage` ให้อยู่แล้ว adapter จะเรียกใช้ตัวนั้นตรงๆ (ข้อมูล sync ให้ทุกคนที่เปิดลิงก์เดียวกันเห็น)
2. **รันนอกแชท Claude** (double-click, Live Server, `python http.server`, หรือขึ้นโฮสติ้งจริงอย่าง Netlify/Vercel) — จะไม่มี `window.storage` adapter จะ **fallback ไปเก็บใน `localStorage` ของเบราว์เซอร์แทนโดยอัตโนมัติ** ฟอร์มจองจะใช้งานได้ปกติ ไม่ error แล้ว

**ข้อจำกัดของโหมด fallback (localStorage):** ข้อมูลออร์เดอร์เก็บอยู่ในเบราว์เซอร์เครื่องนั้นเครื่องเดียวเท่านั้น ถ้าเปิดจากมือถือคนละเครื่อง หรือล้าง cache เบราว์เซอร์ ข้อมูลจะไม่ sync กัน — **เหมาะสำหรับทดสอบตอนพัฒนาเท่านั้น** ไม่เหมาะกับใช้งานจริงที่ต้องการให้ป้าเห็นออร์เดอร์จากลูกค้าหลายคน

ทางเลือกเมื่อจะ deploy จริง (ให้ลูกค้าหลายคนสั่งพร้อมกันแล้วป้าเห็นครบทุกออร์เดอร์):
1. **ใช้ Google Form / LINE OA** แทนการเก็บออร์เดอร์เอง (ง่ายสุด ไม่ต้องเขียนแบ็กเอนด์)
2. **ต่อฐานข้อมูลจริง** เช่น Firebase, Supabase, Google Sheets API แล้วแก้ฟังก์ชัน `submitOrder()` และ `loadOrders()` ใน `js/app.js` ให้เรียก API นั้นแทน `window.storage`
3. ถ้ายังอยากทดสอบ/ให้คนในบ้านสั่งจองผ่านแชท Claude ต่อไปก่อน ให้ใช้ไฟล์เดี่ยว `khanom-order.html` (อีกไฟล์ที่ให้ไปก่อนหน้านี้) เปิดเป็น artifact ในแชทได้เลย ใช้งานได้ทันทีไม่ต้อง setup อะไรเพิ่ม

## รันดูตอนพัฒนา (local)
```bash
cd khanom-project
python3 -m http.server 8000
# เปิด http://localhost:8000
```
(ตอนรัน local แบบนี้ ฟังก์ชันแจ้งเตือน LINE จะยังไม่ทำงานเพราะไม่มี Netlify Functions รันอยู่ — ปกติ ไม่ต้องแก้อะไร แค่ดู UI/เมนู/ตะกร้าได้ตามปกติ)

---

## แจ้งเตือนออร์เดอร์เข้า LINE ของป้า (LINE OA + Messaging API)

LINE Notify (ตัวที่หลายคนคุ้นเคย) ปิดให้บริการไปแล้วตั้งแต่ 31 มี.ค. 2568 วิธีที่ใช้ได้ตอนนี้คือ LINE Official Account (OA) + Messaging API แทน — ไฟล์ `netlify/functions/notify-order.js` และ `netlify/functions/line-webhook.js` ทำหน้าที่นี้ให้แล้ว เหลือแค่ตั้งค่าตามขั้นตอนนี้:

### 1. สร้าง LINE Official Account (ถ้ายังไม่มี)
ไปที่ https://www.linebiz.com/th/entry/ สมัครฟรี จะได้ LINE OA 1 บัญชี พร้อม QR code ให้เพื่อนเพิ่มเป็นเพื่อน

### 2. เปิดใช้ Messaging API
เข้า LINE Official Account Manager > ตั้งค่า > Messaging API > กด "เปิดใช้งาน Messaging API" ระบบจะพาไปสร้าง Provider/Channel ใน LINE Developers Console ให้อัตโนมัติ

### 3. คัดลอก Channel Access Token
ใน LINE Developers Console เข้า Channel ที่สร้าง > แท็บ Messaging API > เลื่อนลงไปหา "Channel access token" กด Issue แล้วคัดลอกค่าไว้ (ยาวๆ)

### 4. Deploy โปรเจกต์ขึ้น Netlify
ลาก-วางโฟลเดอร์ `khanom-project` ทั้งหมดที่ https://app.netlify.com/drop (หรือเชื่อม GitHub repo ก็ได้) จากนั้นไปที่ Site settings > Environment variables เพิ่ม:
- `LINE_CHANNEL_ACCESS_TOKEN` = ค่าที่คัดลอกจากข้อ 3
- `LINE_ADMIN_USER_ID` = ใส่ไปก่อนว่างๆ ก็ได้ ค่อยกลับมาใส่ทีหลัง

### 5. ตั้งค่า Webhook URL
กลับไป LINE Developers Console > Messaging API > Webhook settings ใส่:
```
https://<ชื่อไซต์ที่ Netlify ตั้งให้>.netlify.app/.netlify/functions/line-webhook
```
กด Verify แล้วเปิด toggle "Use webhook" ให้เป็นสีเขียว

### 6. ปิดข้อความตอบกลับอัตโนมัติของ OA
กลับไป LINE Official Account Manager > ตั้งค่า > การตอบกลับ ปิด "ข้อความต้อนรับ" และ "ตอบกลับอัตโนมัติ" เพื่อไม่ให้ชนกับ webhook ของเรา

### 7. หา LINE user ID ของป้า
ให้ป้าสแกน QR เพิ่มเพื่อน OA แล้วพิมพ์อะไรก็ได้ส่งไป 1 ข้อความ — ระบบ (`line-webhook.js`) จะตอบกลับ user ID มาในแชททันที คัดลอกไปใส่ค่า `LINE_ADMIN_USER_ID` ใน Netlify env vars แล้ว deploy ใหม่อีกรอบ

### 8. ทดสอบ
ลองสั่งจองจริงจากหน้าเว็บ 1 ออร์เดอร์ ป้าควรได้ข้อความสรุปออร์เดอร์เข้าแชท LINE ทันที

**หลังตั้งค่าเสร็จ:** แชท LINE ของป้าจะกลายเป็นทั้งตัวแจ้งเตือนแบบเรียลไทม์ และเป็นประวัติออร์เดอร์ย้อนหลังในตัว (เลื่อนดูแชทเก่าได้) ส่วนหน้า "หลังบ้าน" ในเว็บยังใช้ดูได้แต่จะไม่ครบทุกออร์เดอร์ถ้าลูกค้าเปิดจากคนละเบราว์เซอร์ เพราะยังพึ่ง localStorage อยู่ (ดูหัวข้อด้านบน) — ให้ยึด LINE เป็นแหล่งข้อมูลหลักแทน
