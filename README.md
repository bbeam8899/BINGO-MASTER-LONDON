# 🌸 BINGO MASTER LONDON (JJAZ x VCT MASTER LONDON 2026) 🌸

ระบบบิงโกออนไลน์สุดน่ารักสไตล์ Anime สำหรับกิจกรรม **JJAZ x VCT Master London 2026** ที่พัฒนาด้วย **Vanilla JS (HTML5/CSS3)** ไร้ Dependency และได้รับการปรับปรุงอย่างสมบูรณ์แบบเพื่อรันแบบ Serverless บน **Cloudflare Workers** ร่วมกับฐานข้อมูลประสิทธิภาพสูง **Cloudflare KV Namespace**

---

## ✨ คุณสมบัติเด่น (Features)
- 🎨 **Anime Web Design**: ดีไซน์พรีเมียม สวยสะกดตา มีเอฟเฟกต์ดวงดาวลอยละล่อง ละอองเวทมนตร์ และอนิเมชันตอนชนะระดับ SSR
- 🎮 **Spectator Role (คนดู)**: เข้าลุ้นรางวัลอย่างเดียว หน้าจอจะกากบาทให้อัตโนมัติแบบ Real-time ทันทีที่แอดมินกดประกาศเหตุการณ์
- 🛡️ **Master Dashboard (แอดมิน)**: แผงควบคุมบอร์ดขนาด 5x5 สุ่มคำศัพท์ที่กดกากบาทเพื่ออัปเดตคนดูพร้อมกันทั้งห้อง และอนุมัติผู้ชนะ (Approve Winner) ป้องกันการสแปมบิงโกปลอม
- ⚡ **Ultimate Serverless**: พอร์ตระบบเข้าสู่ **Cloudflare Workers** อย่างเต็มตัว รวดเร็ว แรง ทำงานได้ทั่วโลกผ่าน Edge Network

---

## 🗄️ การตั้งค่าระบบฐานข้อมูล (Cloudflare Workers KV)

เนื่องจากระบบทำงานแบบ Serverless ไร้รัฐ (Stateless) ข้อมูลทั้งหมดของห้องสตรีมบิงโกและผู้เข้าร่วมแข่งขันจะถูกบันทึกไว้อย่างปลอดภัยใน **Cloudflare KV**

### 1. วิธีสร้าง KV Namespace
คุณสามารถสร้างได้ 2 วิธี ดังนี้:

#### วิธีที่ A: ผ่าน Cloudflare Dashboard
1. เข้าสู่หน้าเว็บ **Cloudflare Dashboard**
2. ไปที่เมนู **Workers & Pages** -> **KV** จากแถบเมนูด้านซ้าย
3. คลิกปุ่ม **Create a namespace**
4. ตั้งชื่อ Namespace ว่า `BINGO_KV` แล้วคลิก **Add**
5. ระบบจะแสดง **ID** ของ Namespace (เช่น `82a4d7c0f1624cfa81216d2f97aef731`) ให้คัดลอก ID นี้เก็บไว้

#### วิธีที่ B: ผ่าน Wrangler CLI (Command Line)
หากมีโปรเจกต์อยู่ในเครื่อง ให้เปิด Terminal และรันคำสั่ง:
```bash
npx wrangler kv:namespace create BINGO_KV
```
ระบบจะสร้าง Namespace ให้และส่งโค้ดการ Binding มาให้ ตัวอย่างเช่น:
```toml
[[kv_namespaces]]
binding = "BINGO_KV"
id = "82a4d7c0f1624cfa81216d2f97aef731"
```

---

## ⚙️ การตั้งค่า `wrangler.toml`

เปิดไฟล์ `wrangler.toml` ที่อยู่บริเวณ Root ของโฟลเดอร์โปรเจกต์ และแทนที่ ID ด้วย ID ที่คุณสร้างจากขั้นตอนด้านบน:

```toml
#:schema node_modules/wrangler/config-schema.json
name = "bingo-master-london"
main = "worker.js"
compatibility_date = "2024-03-01"

# 🌸 บริการไฟล์ Static (HTML, CSS, รูปภาพ) อัตโนมัติ
[assets]
directory = "./public"

# 🗄️ เชื่อมต่อฐานข้อมูล KV
[[kv_namespaces]]
binding = "BINGO_KV"
id = "ใส่_KV_NAMESPACE_ID_ของคุณที่นี่"
```

---

## 🚀 วิธีการทดสอบและ Deploy บน Cloudflare

### 1. วิธีรันทดสอบบนเครื่อง Local
คุณสามารถรันระบบจำลอง Cloudflare Workers และหน้าเว็บในเครื่องของคุณด้วยคำสั่ง:
```bash
npx wrangler dev
```
ระบบจะเปิดเซิร์ฟเวอร์จำลองให้คุณเข้าไปเล่นและตั้งค่าได้ที่ `http://localhost:8787`

### 2. วิธี Deploy ขึ้นสู่ระบบ Cloudflare Production
เมื่อพร้อมใช้งานออนไลน์ ให้รันคำสั่ง:
```bash
npx wrangler deploy
```
Wrangler จะทำการอัปโหลดไฟล์ HTML/CSS และ Backend API ไปรันบน Cloudflare Edge Network ทั่วโลกทันที พร้อมแชร์ลิงก์หน้าเว็บหลักให้คุณใช้งาน!

---

## 🛠️ วิธีการรันด้วยระบบดั้งเดิม (Local Node.js)
หากคุณต้องการเปิดระบบชั่วคราวผ่าน Node.js ในเครื่องคอมพิวเตอร์ของคุณตรงๆ (ไม่ต้องเชื่อมฐานข้อมูล Cloudflare):
1. ตรวจสอบให้แน่ใจว่าติดตั้ง Node.js แล้ว
2. รันคำสั่ง:
   ```bash
   npm run dev
   ```
3. เข้าสู่ระบบได้ที่:
   - 🎮 **หน้าจอผู้เล่น**: [http://localhost:8888](http://localhost:8888)
   - 🔒 **หน้าจอแอดมิน**: [http://localhost:8888/admin](http://localhost:8888/admin) (รหัสผ่าน ID: `JJAZ` / Pass: `huatua`)

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)
- `public/` - หน้าเว็บ Frontend (Vanilla HTML, CSS, JS) และ Assets ต่างๆ
  - `index.html` - หน้าจอเข้าเล่นและลุ้นบิงโกของคนดู
  - `admin/index.html` - หน้าแผงควบคุม 5x5 สำหรับแอดมิน
  - `background.jpg` - ภาพพื้นหลังอนิเมะสุดพรีเมียม
  - `logo.png` - โลโก้กิจกรรมสุดเท่
- `worker.js` - โค้ด Backend API สำหรับ Cloudflare Workers
- `wrangler.toml` - การตั้งค่า Deploy และ Bindings บน Cloudflare
- `server.js` - เซิร์ฟเวอร์จำลองสำหรับรันในเครื่องส่วนตัว (Local Server Node.js)
