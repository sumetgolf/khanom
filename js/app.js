let qty = {};
MENU.forEach(m => qty[m.id] = 0);
let cart = {}; // id -> quantity added to cart

const fmt = n => n.toLocaleString('th-TH');

function renderMenu(){
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = MENU.map(m => `
    <div class="card">
      <div class="card-icon" style="background:${m.color}22">
        <svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">${m.icon}</svg>
      </div>
      <h3>${m.name}</h3>
      <div class="unit">${m.unit}</div>
      <div class="price">${fmt(m.price)} บาท / หน่วย</div>
      <div class="qty-row">
        <div class="stepper">
          <button onclick="changeQty('${m.id}', -1)" aria-label="ลดจำนวน">−</button>
          <span id="qty-${m.id}">${qty[m.id]}</span>
          <button onclick="changeQty('${m.id}', 1)" aria-label="เพิ่มจำนวน">+</button>
        </div>
        <button class="add-btn" id="add-${m.id}" ${qty[m.id]===0 ? 'disabled':''} onclick="addToCart('${m.id}')">เพิ่มลงตะกร้า</button>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta){
  qty[id] = Math.max(0, qty[id] + delta);
  document.getElementById('qty-'+id).textContent = qty[id];
  const addBtn = document.getElementById('add-'+id);
  addBtn.disabled = qty[id] === 0;
}

function addToCart(id){
  if(qty[id] === 0) return;
  cart[id] = (cart[id] || 0) + qty[id];
  qty[id] = 0;
  document.getElementById('qty-'+id).textContent = 0;
  document.getElementById('add-'+id).disabled = true;
  updateCartCount();
  renderDrawer();
  openCart();
}

function removeFromCart(id){
  delete cart[id];
  updateCartCount();
  renderDrawer();
}

function updateCartCount(){
  const total = Object.values(cart).reduce((a,b)=>a+b,0);
  document.getElementById('cartCount').textContent = total;
}

function cartTotal(){
  return Object.entries(cart).reduce((sum,[id,q]) => {
    const item = MENU.find(m=>m.id===id);
    return sum + item.price * q;
  }, 0);
}

function renderDrawer(){
  const body = document.getElementById('drawerBody');
  const foot = document.getElementById('drawerFoot');
  document.getElementById('drawerTitle').textContent = 'ตะกร้าของฉัน';
  const entries = Object.entries(cart);

  if(entries.length === 0){
    body.innerHTML = `<div class="empty-cart">ยังไม่มีรายการในตะกร้า<br>เลือกขนมจากเมนูด้านบนได้เลย</div>`;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = entries.map(([id,q]) => {
    const item = MENU.find(m=>m.id===id);
    return `<div class="cart-item">
      <div>
        <div class="ci-name">${item.name}</div>
        <div class="ci-sub">${q} × ${item.unit} · ${fmt(item.price*q)} บาท</div>
      </div>
      <button class="ci-remove" onclick="removeFromCart('${id}')">ลบ</button>
    </div>`;
  }).join('');

  foot.innerHTML = `
    <div class="total-row"><span>ยอดรวม</span><span>${fmt(cartTotal())} บาท</span></div>
    <div class="field">
      <label for="custName">ชื่อผู้จอง</label>
      <input type="text" id="custName" placeholder="เช่น คุณสมศรี">
    </div>
    <div class="field">
      <label for="custPhone">เบอร์โทร</label>
      <input type="tel" id="custPhone" placeholder="08x-xxx-xxxx">
    </div>
    <div class="field">
      <label for="pickupDate">วันที่ต้องการรับ</label>
      <input type="date" id="pickupDate">
    </div>
    <div class="field">
      <label for="custNote">หมายเหตุ (ถ้ามี)</label>
      <textarea id="custNote" placeholder="เช่น ขอไม่หวานมาก / รับที่ไหน"></textarea>
    </div>
    <div class="err" id="formErr">กรุณากรอกชื่อ เบอร์โทร และวันที่ต้องการรับให้ครบ</div>
    <button class="submit-btn" id="submitOrder">ยืนยันการจอง</button>
  `;
  document.getElementById('submitOrder').addEventListener('click', submitOrder);
}

async function submitOrder(){
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const date = document.getElementById('pickupDate').value;
  const note = document.getElementById('custNote').value.trim();
  const errEl = document.getElementById('formErr');

  if(!name || !phone || !date){
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const btn = document.getElementById('submitOrder');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  const orderCode = 'KN' + Date.now().toString().slice(-6);
  const order = {
    code: orderCode,
    name, phone, date, note,
    items: Object.entries(cart).map(([id,q]) => {
      const item = MENU.find(m=>m.id===id);
      return {name:item.name, qty:q, unit:item.unit, subtotal:item.price*q};
    }),
    total: cartTotal(),
    createdAt: new Date().toISOString(),
  };

  try{
    await Storage.set('order:'+orderCode, JSON.stringify(order), true);

    // แจ้งเตือนเข้า LINE OA ของป้า (ไม่บล็อกลูกค้าถ้าส่งไม่สำเร็จ ออร์เดอร์ก็ยังบันทึกไว้แล้ว)
    fetch('/.netlify/functions/notify-order', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(order),
    }).catch((e) => console.warn('แจ้งเตือน LINE ไม่สำเร็จ (ออร์เดอร์บันทึกแล้วปกติ):', e));

    renderConfirmation(order);
    cart = {};
    updateCartCount();
  }catch(e){
    btn.disabled = false;
    btn.textContent = 'ยืนยันการจอง';
    errEl.textContent = 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
    errEl.style.display = 'block';
  }
}

function renderConfirmation(order){
  const body = document.getElementById('drawerBody');
  const foot = document.getElementById('drawerFoot');
  document.getElementById('drawerTitle').textContent = 'จองสำเร็จ';
  body.innerHTML = `
    <div class="confirm">
      <div class="badge">✓</div>
      <h3>ขอบคุณที่จองนะคะ คุณ${order.name}</h3>
      <div class="code">รหัสการจอง ${order.code}</div>
      <p>รายการ: ${order.items.map(i=>`${i.name} ×${i.qty}`).join(', ')}<br>
      ยอดรวม ${fmt(order.total)} บาท · วันที่ต้องการรับ ${order.date}</p>
      <p>ป้าจะติดต่อกลับที่เบอร์ ${order.phone} เพื่อยืนยันอีกครั้ง</p>
    </div>
  `;
  foot.innerHTML = `<button class="btn btn-ghost" style="width:100%" onclick="closeCart()">ปิดหน้าต่างนี้</button>`;
}

function openCart(){
  document.getElementById('drawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeCart(){
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

document.getElementById('openCartBtn').addEventListener('click', openCart);
document.getElementById('closeCartBtn').addEventListener('click', closeCart);
document.getElementById('overlay').addEventListener('click', closeCart);

// ===== Admin panel =====
const adminPanel = document.getElementById('adminPanel');
document.getElementById('adminToggle').addEventListener('click', () => {
  adminPanel.classList.toggle('open');
  if(adminPanel.classList.contains('open')) loadOrders();
});
document.getElementById('refreshOrders').addEventListener('click', loadOrders);

async function loadOrders(){
  const list = document.getElementById('ordersList');
  list.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">กำลังโหลด...</p>';
  try{
    const res = await Storage.list('order:', true);
    const keys = (res && res.keys) || [];
    if(keys.length === 0){
      list.innerHTML = '<p style="color:var(--ink-soft);font-size:13.5px;">ยังไม่มีออร์เดอร์เข้ามา</p>';
      return;
    }
    const orders = [];
    for(const k of keys){
      try{
        const r = await Storage.get(k, true);
        if(r && r.value) orders.push(JSON.parse(r.value));
      }catch(e){}
    }
    orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    list.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="top">
          <span class="code">#${o.code}</span>
          <span class="when">${new Date(o.createdAt).toLocaleString('th-TH')}</span>
        </div>
        <div class="customer">${o.name} · ${o.phone}</div>
        <div class="meta">รับวันที่ ${o.date} · ยอดรวม ${fmt(o.total)} บาท</div>
        <ul>${o.items.map(i=>`<li>${i.name} × ${i.qty} (${i.unit}) — ${fmt(i.subtotal)} บาท</li>`).join('')}</ul>
        ${o.note ? `<div class="note">หมายเหตุ: ${o.note}</div>` : ''}
      </div>
    `).join('');
  }catch(e){
    list.innerHTML = '<p style="color:var(--clay);font-size:13.5px;">โหลดรายการไม่สำเร็จ</p>';
  }
}

renderMenu();
renderDrawer();
