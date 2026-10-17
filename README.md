# Smart Curtain Prototype

เว็บแอปต้นแบบสำหรับควบคุมม่านอัจฉริยะหนึ่งชุด พัฒนาด้วย Next.js และ TypeScript และเชื่อมต่อกับ ESP32 เพื่ออ่านค่าเซ็นเซอร์ ควบคุมมอเตอร์ ตรวจ Encoder และตรวจลิมิตสวิตช์

> สถานะปัจจุบัน: ระบบ Manual และเครื่องมือทดสอบฮาร์ดแวร์ใช้งานกับ ESP32 จริงได้แล้ว ส่วน Auto Preset ยังเป็นโหมด Preview และทดสอบส่งคำสั่งครั้งเดียว ยังไม่ได้เปิด Auto ต่อเนื่อง

## ความสามารถปัจจุบัน

### หน้าสำหรับผู้ใช้

- `/` ภาพรวมสถานะม่าน อุปกรณ์ และสภาพแวดล้อม
- `/control` เปิด ปิด หยุด และเลือกตำแหน่งม่านเมื่อ Encoder พร้อมใช้งาน
- `/environment` แสดงอุณหภูมิ ความชื้น และความเข้มแสง
- รองรับหน้าจอคอมพิวเตอร์และโทรศัพท์

### หน้า Developer

หน้า `/dev` รวมเครื่องมือสำหรับพัฒนาและตรวจระบบ ได้แก่

- สถานะ ESP32 และเครือข่าย
- ข้อมูลเซ็นเซอร์จริงหรือข้อมูลจำลอง
- ควบคุมมอเตอร์และตำแหน่งม่าน
- ทดสอบ Encoder A/B
- ทดสอบลิมิตด้านเปิดและด้านปิด
- ตั้งจุดอ้างอิงปิด–เปิดสำหรับคำนวณตำแหน่ง 0–100%
- บันทึกผลการเคลื่อนที่และส่งออก Motion Log
- ออกแบบและทดลอง Auto Preset

### Auto Preset

- มี Preset เริ่มต้น: กันความร้อน, รับแสงธรรมชาติ, สมดุล และกำหนดเอง
- เลือกใช้อุณหภูมิ แสง หรือทั้งสองอย่างได้
- แบ่งช่วงแสงได้ 2–5 ช่วง พร้อมกำหนดตำแหน่งม่านของแต่ละช่วง
- ตั้งจำนวนค่าที่ต้องยืนยันติดต่อกัน 1–10 ครั้ง
- ตั้ง Cooldown หลังมอเตอร์หยุดได้ 0–3600 วินาที
- ไม่ส่งคำสั่งเมื่อ ESP32 ออฟไลน์, Encoder ยังไม่พร้อม, ลิมิตขัดแย้ง, มอเตอร์กำลังทำงาน หรือมี Motor Fault
- การทดสอบจริงต้องยืนยันความปลอดภัยและกดส่งคำสั่งด้วยผู้ใช้

## เทคโนโลยี

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- CSS Modules
- Node.js 20.9.0 ขึ้นไป
- Node.js Test Runner และ ESLint

โปรเจกต์นี้ยังไม่ใช้ฐานข้อมูล ประวัติการเคลื่อนที่และเวลา Cooldown เก็บใน `localStorage` ของเบราว์เซอร์

## เริ่มต้นใช้งาน

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่าแหล่งข้อมูล

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์

ใช้ ESP32 จริง:

```env
SENSOR_SOURCE=esp32
ESP32_BASE_URL=http://192.168.1.123
NEXT_PUBLIC_ESP32_BASE_URL=http://192.168.1.123
```

เปลี่ยน IP ให้ตรงกับ IP ของ ESP32 ในเครือข่ายเดียวกัน

- `ESP32_BASE_URL` ใช้โดย Next.js API สำหรับอ่านสถานะและเซ็นเซอร์
- `NEXT_PUBLIC_ESP32_BASE_URL` ใช้โดยเบราว์เซอร์สำหรับส่งคำสั่งควบคุมไปยัง ESP32 โดยตรง
- ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะถูกส่งไปฝั่งเบราว์เซอร์ จึงห้ามใส่รหัสผ่านหรือข้อมูลลับ

ใช้ข้อมูลจำลองโดยไม่ต้องต่อ ESP32:

```env
SENSOR_SOURCE=mock
```

### 3. เปิด Development Server

```bash
npm run dev
```

จากนั้นเปิด:

- หน้าใช้งาน: [http://localhost:3000](http://localhost:3000)
- หน้า Developer: [http://localhost:3000/dev](http://localhost:3000/dev)
- Sensor API: [http://localhost:3000/api/sensors](http://localhost:3000/api/sensors)
- Device Status API: [http://localhost:3000/api/device-status](http://localhost:3000/api/device-status)

## คำสั่งที่ใช้บ่อย

```bash
npm run dev      # เปิดเซิร์ฟเวอร์สำหรับพัฒนา
npm test         # รัน Unit Test ของ Auto และ Encoder diagnostics
npm run lint     # ตรวจรูปแบบและข้อผิดพลาดของโค้ด
npm run build    # สร้าง Production build
npm start        # เปิด Production server หลัง build
```

## การเชื่อมต่อ ESP32

เว็บคาดว่า ESP32 จะมี HTTP endpoints ต่อไปนี้:

| Method | Endpoint | หน้าที่ |
| --- | --- | --- |
| `GET` | `/sensors` | อ่านอุณหภูมิ ความชื้น และความเข้มแสง |
| `GET` | `/status` | อ่านสถานะมอเตอร์ เครือข่าย Encoder ลิมิต และ Calibration |
| `POST` | `/motor/open` | ขยับม่านไปทางเปิดแบบ Jog |
| `POST` | `/motor/close` | ขยับม่านไปทางปิดแบบ Jog |
| `POST` | `/motor/stop` | หยุดมอเตอร์ |
| `POST` | `/motor/position?percent=50` | ไปยังตำแหน่งเป้าหมาย 0–100% |
| `POST` | `/motor/open-until-limit` | ทดสอบขยับจนพบลิมิตด้านเปิด |
| `POST` | `/motor/close-until-limit` | ทดสอบขยับจนพบลิมิตด้านปิด |
| `POST` | `/calibration/closed` | บันทึกตำแหน่งปิด |
| `POST` | `/calibration/open` | บันทึกตำแหน่งเปิด |
| `POST` | `/calibration/reset` | ล้างค่า Calibration |

การไหลของข้อมูลโดยย่อ:

```text
Sensor/Status: ESP32 -> Next.js API -> React UI
Motor command: React UI -> ESP32 HTTP API -> Motor driver
Safety status: Limit + Encoder + Motor fault -> ปิดกั้นคำสั่งที่ไม่ปลอดภัย
```

## โครงสร้างโปรเจกต์

```text
app/
  (user)/                 หน้าใช้งานหลัก ภาพรวม ควบคุม และสภาพแวดล้อม
  api/                    API กลางสำหรับเซ็นเซอร์และสถานะอุปกรณ์
  dev/                    หน้าเครื่องมือสำหรับ Developer
components/
  user/                   UI สำหรับผู้ใช้ทั่วไป
  dashboard/              แผงควบคุมและเครื่องมือทดสอบฮาร์ดแวร์
hooks/                    State, polling, คำสั่งม่าน และประวัติการทำงาน
lib/
  curtain/                Logic ม่าน Auto Preset, Auto Runtime และ ESP32 client
  sensors/                แหล่งข้อมูล Mock และ ESP32
types/                    TypeScript types ของข้อมูลระบบ
docs/PROJECT_PLAN.md      แผนพัฒนาโครงการ
```

Firmware ของ ESP32 เป็นอีกโปรเจกต์หนึ่งและไม่ได้อยู่ใน repository เว็บนี้

## การตรวจสอบก่อนใช้งานกับมอเตอร์จริง

1. ตรวจแหล่งจ่ายไฟและต่อกราวด์ร่วมระหว่าง ESP32 กับ Motor Driver
2. เตรียมปุ่ม STOP และเริ่มด้วยความเร็วมอเตอร์ต่ำ
3. ตรวจลิมิตด้านเปิดและด้านปิดให้ทำงานถูกทิศ
4. ตั้ง Calibration ใหม่เมื่อเปลี่ยนตำแหน่งม่านหรือชุดส่งกำลัง
5. ทดสอบคำสั่งทีละขั้นจากหน้า `/dev` ก่อนใช้หน้า User หรือ Auto Preset

ระบบปัจจุบันออกแบบสำหรับทดสอบในเครือข่ายภายใน ยังไม่มีระบบบัญชีผู้ใช้ การยืนยันตัวตน Cloud API หรือ Auto ต่อเนื่อง จึงไม่ควรเปิด ESP32 API ให้อินเทอร์เน็ตเข้าถึงโดยตรง

## แผนพัฒนา

ดูแผนโดยละเอียดได้ที่ [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md)
