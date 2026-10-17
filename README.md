# Smart Curtain Prototype

โปรเจกต์ต้นแบบสำหรับม่านหนึ่งชุด พัฒนาด้วย Next.js และ TypeScript

แผนการพัฒนาแบบละเอียดอยู่ที่ [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md)

## โครงสร้างที่ใช้ตอนนี้

```text
app/
  api/sensors/route.ts       API กลางสำหรับอ่านค่าเซ็นเซอร์
  layout.tsx                 โครงหลักของเว็บไซต์
  page.tsx                   หน้าเว็บหลักเพียงหน้าเดียว
lib/
  sensors/
    sensor-source.ts         ข้อตกลงของแหล่งข้อมูลเซ็นเซอร์
    mock-sensor-source.ts    ข้อมูลจำลองระหว่างพัฒนา
    esp32-sensor-source.ts   จุดเชื่อมต่อ ESP32 ในอนาคต
    get-sensor-source.ts     เลือกว่าจะใช้ Mock หรือ ESP32
types/
  sensor.ts                  รูปแบบข้อมูลเซ็นเซอร์
  curtain.ts                 รูปแบบสถานะม่าน
```

## วิธีรัน

```bash
npm run dev
```

เปิด `http://localhost:3000` สำหรับหน้าเว็บ และ `http://localhost:3000/api/sensors` สำหรับดูข้อมูลเซ็นเซอร์จำลอง

## การเชื่อม ESP32 ในอนาคต

คัดลอก `.env.example` เป็น `.env.local` แล้วแก้เป็น:

```env
SENSOR_SOURCE=esp32
ESP32_BASE_URL=http://IP-ADDRESS-OF-ESP32
```

ESP32 ต้องตอบข้อมูลจาก `GET /sensors` ให้ตรงกับรูปแบบใน `types/sensor.ts`
