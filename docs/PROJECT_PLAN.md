# แผนพัฒนา Smart Curtain Web App

อัปเดตล่าสุด: 6 กันยายน 2026

เอกสารนี้เป็นแผนกลางสำหรับพัฒนาเว็บควบคุมม่านอัจฉริยะต้นแบบ โดยเริ่มจากม่านหนึ่งชุด ใช้งานผ่านเว็บบนคอมพิวเตอร์และ iPhone และออกแบบโครงสร้างให้เชื่อมต่อ ESP32 ได้ในอนาคต

---

## 1. เป้าหมายของโปรเจกต์

สร้าง Responsive Web App สำหรับม่านอัจฉริยะหนึ่งชุด สามารถ:

- แสดงอุณหภูมิจาก DHT22
- แสดงความชื้นจาก DHT22
- แสดงความเข้มแสงจาก LDR
- แสดงสถานะและตำแหน่งของม่าน 0-100%
- ควบคุมเปิด หยุด และปิดม่านด้วยตนเอง
- เลือกโหมด Manual หรือ Automatic
- ตั้งค่าเกณฑ์อุณหภูมิและแสงสำหรับโหมด Automatic
- แสดงสถานะการเชื่อมต่อ ESP32
- ใช้ข้อมูลจำลองได้เมื่อยังไม่มีอุปกรณ์
- เปิดใช้งานบน Safari และเพิ่มลง Home Screen ของ iPhone ได้ในรูปแบบ PWA

## 2. ขอบเขตเวอร์ชันแรก

เวอร์ชันแรกจะรองรับม่านเพียงหนึ่งชุดเท่านั้น

### ต้องมี

- หน้า Dashboard หนึ่งหน้า
- ข้อมูลเซ็นเซอร์ 3 ค่า
- สถานะม่าน
- ปุ่มควบคุม Manual
- โหมด Automatic แบบตั้ง Threshold
- สถานะ Online, Offline และ Error
- Mock mode และ ESP32 mode
- Responsive สำหรับคอมพิวเตอร์และมือถือ
- PWA Manifest และไอคอน

### ยังไม่ทำในช่วงแรก

- ระบบสมาชิกและเข้าสู่ระบบ
- รองรับหลายบ้าน หลายห้อง หรือหลายม่าน
- App Store และ Native iOS app
- คำสั่งเสียง
- กราฟสถิติขนาดใหญ่
- การควบคุมผ่าน Cloud จากภายนอกบ้าน
- ระบบแจ้งเตือน Push Notification
- Machine Learning

ฟังก์ชันเหล่านี้สามารถเพิ่มภายหลังได้โดยไม่ต้องรื้อโครงสร้างหลัก

---

## 3. ภาพรวมสถาปัตยกรรม

### ระหว่างพัฒนาโดยใช้ข้อมูลจำลอง

```text
React Dashboard
      |
      v
Next.js API Routes
      |
      v
Mock Sensor / Mock Curtain Controller
```

### เมื่อต่อฮาร์ดแวร์จริงในเครือข่ายเดียวกัน

```text
iPhone หรือคอมพิวเตอร์
          |
          v
    Next.js Web App
          |
          v
       ESP32 API
       /       \
 DHT22 + LDR   Motor Driver
                    |
                    v
               DC Gear Motor
```

### เส้นทางข้อมูลเซ็นเซอร์

```text
Sensor -> ESP32 -> Next.js API -> React Hook -> Sensor Card
```

### เส้นทางคำสั่งควบคุม

```text
Button -> React Hook -> Next.js API -> ESP32 -> Motor Driver -> Motor
```

หน้าเว็บจะไม่ติดต่อ ESP32 โดยตรง แต่ติดต่อผ่าน Next.js API เพื่อให้ตรวจสอบข้อมูล จัดการข้อผิดพลาด และเปลี่ยนระหว่าง Mock/ESP32 ได้ง่าย

---

## 4. โครงสร้างไฟล์เป้าหมาย

```text
smart_curtain2/
|
|-- app/
|   |-- api/
|   |   |-- sensors/
|   |   |   `-- route.ts
|   |   |-- curtain/
|   |   |   `-- route.ts
|   |   |-- settings/
|   |   |   `-- route.ts
|   |   `-- health/
|   |       `-- route.ts
|   |-- manifest.ts
|   |-- layout.tsx
|   |-- page.tsx
|   |-- page.module.css
|   `-- globals.css
|
|-- components/
|   |-- dashboard/
|   |   |-- SensorPanel.tsx
|   |   |-- SensorCard.tsx
|   |   |-- CurtainStatus.tsx
|   |   |-- CurtainControls.tsx
|   |   `-- ConnectionStatus.tsx
|   `-- common/
|       |-- Button.tsx
|       |-- LoadingState.tsx
|       `-- ErrorMessage.tsx
|
|-- hooks/
|   |-- useSensorData.ts
|   `-- useCurtainState.ts
|
|-- lib/
|   |-- sensors/
|   |   |-- sensor-source.ts
|   |   |-- mock-sensor-source.ts
|   |   |-- esp32-sensor-source.ts
|   |   `-- get-sensor-source.ts
|   |-- curtain/
|   |   |-- curtain-controller.ts
|   |   |-- mock-curtain-controller.ts
|   |   `-- esp32-curtain-controller.ts
|   `-- validation/
|       |-- sensor.ts
|       `-- curtain.ts
|
|-- types/
|   |-- sensor.ts
|   |-- curtain.ts
|   `-- api.ts
|
|-- public/
|   |-- icon-192.png
|   |-- icon-512.png
|   `-- apple-touch-icon.png
|
|-- docs/
|   `-- PROJECT_PLAN.md
|
|-- .env.example
|-- package.json
`-- README.md
```

ไม่จำเป็นต้องสร้างทุกไฟล์พร้อมกัน ให้สร้างเมื่อเริ่มใช้งานจริงในแต่ละขั้น

---

## 5. รูปแบบข้อมูลกลาง

### SensorReading

```ts
type SensorReading = {
  temperatureCelsius: number;
  humidityPercent: number;
  lightLux: number;
  recordedAt: string;
};
```

### CurtainState

```ts
type CurtainState = {
  positionPercent: number;
  mode: "manual" | "automatic";
  movement: "opening" | "closing" | "stopped";
  connected: boolean;
  updatedAt: string;
};
```

### CurtainCommand

```ts
type CurtainCommand = {
  action: "open" | "close" | "stop" | "set-position";
  positionPercent?: number;
};
```

ชื่อ Field และหน่วยต้องเหมือนกันทั้ง Mock, Next.js และ ESP32

---

## 6. API ที่วางแผนไว้

| Method | URL | หน้าที่ |
|---|---|---|
| `GET` | `/api/sensors` | อ่านอุณหภูมิ ความชื้น และแสง |
| `GET` | `/api/curtain` | อ่านสถานะและตำแหน่งม่าน |
| `POST` | `/api/curtain` | ส่งคำสั่งเปิด หยุด ปิด หรือตั้งตำแหน่ง |
| `GET` | `/api/settings` | อ่านค่าตั้งของโหมด Automatic |
| `PUT` | `/api/settings` | บันทึก Threshold และ Logic |
| `GET` | `/api/health` | ตรวจสอบว่าเว็บและ ESP32 ยังเชื่อมต่ออยู่หรือไม่ |

### ตัวอย่างผลลัพธ์ `/api/sensors`

```json
{
  "source": "mock",
  "data": {
    "temperatureCelsius": 28,
    "humidityPercent": 65,
    "lightLux": 720,
    "recordedAt": "2026-09-06T10:00:00.000Z"
  }
}
```

### ตัวอย่างคำสั่งควบคุมม่าน

```json
{
  "action": "set-position",
  "positionPercent": 50
}
```

---

## 7. แผนพัฒนาทีละระยะ

### ระยะที่ 0: วางรากฐานโปรเจกต์

สถานะ: เสร็จแล้ว

- [x] สร้าง Next.js Project ด้วย TypeScript
- [x] ใช้ App Router
- [x] ตั้งค่า ESLint
- [x] สร้างรูปแบบ `SensorReading`
- [x] สร้าง Mock Sensor Source
- [x] เตรียม ESP32 Sensor Source
- [x] สร้าง `GET /api/sensors`
- [x] เพิ่ม `.env.example`
- [x] ทดสอบ Lint และ Production Build

เกณฑ์ผ่าน:

- `npm run dev` เปิดเว็บได้
- `/api/sensors` ส่ง JSON ได้
- `npm run lint` ผ่าน
- `npm run build` ผ่าน

### ระยะที่ 1: แสดงข้อมูลเซ็นเซอร์บนหน้าเว็บ

- [ ] สร้าง `SensorCard.tsx`
- [ ] สร้าง `SensorPanel.tsx`
- [ ] แสดงอุณหภูมิ
- [ ] แสดงความชื้น
- [ ] แสดงความเข้มแสง
- [ ] แสดง Loading state
- [ ] แสดง Error state
- [ ] ปรับหน้าจอให้รองรับมือถือ

เกณฑ์ผ่าน:

- หน้าเว็บอ่านข้อมูลจาก `/api/sensors` จริง
- ไม่มีการเขียนค่าจำลองซ้ำใน Component
- เปิดบนหน้าจอมือถือแล้วข้อความไม่ล้น
- เมื่อ API ล้มเหลว ผู้ใช้เห็นข้อความที่เข้าใจได้

### ระยะที่ 2: อัปเดตเซ็นเซอร์อัตโนมัติ

- [ ] สร้าง `useSensorData.ts`
- [ ] โหลดข้อมูลใหม่ทุก 5 วินาที
- [ ] แสดงเวลาที่อัปเดตล่าสุด
- [ ] เพิ่มปุ่มรีเฟรชด้วยตนเอง
- [ ] ยกเลิก Request เมื่อออกจากหน้า
- [ ] แสดง Online และ Offline

เกณฑ์ผ่าน:

- ค่าอัปเดตโดยไม่ต้อง Refresh หน้าเว็บ
- ไม่มี Request ซ้อนโดยไม่จำเป็น
- ระบบแสดง Offline เมื่ออ่านข้อมูลไม่ได้
- กลับมา Online ได้เมื่อ API ทำงานอีกครั้ง

### ระยะที่ 3: สถานะม่านจำลอง

- [ ] ปรับ `CurtainState` ให้ครบตามรูปแบบข้อมูล
- [ ] สร้าง `CurtainController` interface
- [ ] สร้าง `MockCurtainController`
- [ ] สร้าง `GET /api/curtain`
- [ ] สร้าง `CurtainStatus.tsx`
- [ ] แสดงตำแหน่งม่าน 0-100%
- [ ] แสดง Opening, Closing และ Stopped

เกณฑ์ผ่าน:

- หน้าเว็บแสดงสถานะจาก API ไม่ใช่ค่าที่เขียนไว้ใน Component
- ค่าเปอร์เซ็นต์อยู่ระหว่าง 0-100 เท่านั้น
- Mock mode เปลี่ยนสถานะได้โดยไม่ต้องมีอุปกรณ์จริง

### ระยะที่ 4: ควบคุมม่านแบบ Manual

- [ ] สร้าง `POST /api/curtain`
- [ ] เพิ่มปุ่มเปิดม่าน
- [ ] เพิ่มปุ่มหยุด
- [ ] เพิ่มปุ่มปิดม่าน
- [ ] เพิ่ม Slider ตำแหน่ง 0-100%
- [ ] ป้องกันการกดคำสั่งซ้ำขณะมอเตอร์ทำงาน
- [ ] แสดงผลสำเร็จและข้อผิดพลาด

เกณฑ์ผ่าน:

- ทุกคำสั่งผ่าน Next.js API
- API ตรวจสอบ Action และตำแหน่งก่อนส่งต่อ
- ผู้ใช้เห็นว่ามอเตอร์กำลังทำงานหรือหยุด
- ปุ่มถูกปิดใช้งานชั่วคราวเมื่อส่งคำสั่ง

### ระยะที่ 5: โหมด Automatic

- [ ] สร้างส่วนตั้ง Threshold ใน Dashboard เดิม
- [ ] ตั้งค่าอุณหภูมิ
- [ ] ตั้งค่าความเข้มแสง
- [ ] เลือก `AND` หรือ `OR`
- [ ] สลับ Manual/Automatic
- [ ] แสดงเหตุผลเมื่อระบบตัดสินใจ
- [ ] เพิ่ม Countdown และปุ่มยกเลิกถ้าจำเป็น

เกณฑ์ผ่าน:

- Automatic mode ใช้ข้อมูลจากเซ็นเซอร์จริงหรือ Mock ผ่าน Interface เดียวกัน
- Manual mode ไม่ถูก Automatic mode แทรกแซง
- ผู้ใช้เห็น Threshold ที่กำลังใช้งาน
- Limit Switch และการหยุดฉุกเฉินทำงานแยกจากหน้าเว็บ

### ระยะที่ 6: ทำให้เป็น PWA สำหรับ iPhone

- [ ] สร้าง `app/manifest.ts`
- [ ] เพิ่มไอคอน 192x192 และ 512x512
- [ ] เพิ่ม `apple-touch-icon.png`
- [ ] กำหนด `display: "standalone"`
- [ ] กำหนด Theme color และ Background color
- [ ] ตรวจ Responsive บน Safari
- [ ] Deploy ผ่าน HTTPS
- [ ] ทดสอบ Add to Home Screen

เกณฑ์ผ่าน:

- เปิดบน Safari ได้
- เพิ่มลง Home Screen ได้
- เปิดจากไอคอนแล้วแสดงแบบ Standalone
- ปุ่มมีขนาดเหมาะกับการสัมผัส
- หน้าเว็บใช้งานได้ทั้งแนวตั้งและแนวนอน

Offline mode และ Push Notification ยังไม่จำเป็นในระยะนี้

### ระยะที่ 7: เชื่อมต่อ ESP32 จริง

- [ ] ตกลงรูปแบบ JSON กับโปรแกรม ESP32
- [ ] สร้าง `GET /health` บน ESP32
- [ ] สร้าง `GET /sensors` บน ESP32
- [ ] สร้าง `GET /curtain` บน ESP32
- [ ] สร้าง `POST /curtain/command` บน ESP32
- [ ] ตั้ง `SENSOR_SOURCE=esp32`
- [ ] ตั้ง `ESP32_BASE_URL`
- [ ] ทดสอบ Timeout และอุปกรณ์ Offline
- [ ] ทดสอบ Limit Switch

เกณฑ์ผ่าน:

- เปลี่ยนจาก Mock เป็น ESP32 โดยไม่ต้องแก้ Component
- หน้าเว็บแสดง Offline เมื่อถอดไฟ ESP32
- การเปิดและปิดหยุดเมื่อถึง Limit Switch เสมอ
- ESP32 ปฏิเสธคำสั่งที่ไม่ถูกต้อง

### ระยะที่ 8: ประวัติและฐานข้อมูล

เริ่มระยะนี้หลังควบคุมฮาร์ดแวร์ได้เสถียรแล้ว

- [ ] เลือก PostgreSQL และ ORM
- [ ] เก็บค่าเซ็นเซอร์ทุก 5 นาที
- [ ] เก็บประวัติคำสั่ง Manual/Automatic
- [ ] เพิ่ม Event log
- [ ] เพิ่มหน้าประวัติในภายหลัง
- [ ] เพิ่มกราฟเมื่อข้อมูลเพียงพอ

### ระยะที่ 9: ความสามารถเสริม

- [ ] คำสั่งเสียงภาษาไทย
- [ ] Web Push Notification
- [ ] ตั้งตารางเวลาเปิด-ปิด
- [ ] ควบคุมจากภายนอกเครือข่าย
- [ ] รองรับหลายม่าน ถ้าขอบเขตโปรเจกต์เปลี่ยน

---

## 8. การเชื่อมต่อบน iPhone

### ระหว่างพัฒนา

คอมพิวเตอร์และ iPhone ต้องอยู่ใน Wi-Fi เดียวกัน

```powershell
npm run dev -- --hostname 0.0.0.0
```

เปิด Network URL ที่ Next.js แสดง เช่น:

```text
http://192.168.1.20:3000
```

### เมื่อนำไปใช้งานจริง

- เว็บต้อง Deploy ผ่าน HTTPS เพื่อเป็น PWA
- หาก Next.js อยู่บน Cloud จะไม่สามารถเข้าถึง IP ภายในบ้านของ ESP32 โดยตรง
- สำหรับการสาธิต สามารถให้ Next.js รันบนคอมพิวเตอร์ในเครือข่ายเดียวกับ ESP32
- หากต้องควบคุมจากภายนอกบ้าน ควรให้ ESP32 เชื่อม Cloud ผ่าน MQTT หรือ HTTPS ในระยะหลัง

---

## 9. ความปลอดภัยของฮาร์ดแวร์

กฎด้านความปลอดภัยต้องทำงานบน ESP32 ไม่ควรพึ่งหน้าเว็บเพียงอย่างเดียว

- Limit Switch ต้องหยุดมอเตอร์ได้แม้เว็บหลุด
- ต้องมีเวลาสูงสุดที่อนุญาตให้มอเตอร์ทำงาน
- คำสั่ง Stop ต้องมีความสำคัญสูงสุด
- ห้ามตั้งตำแหน่งต่ำกว่า 0% หรือสูงกว่า 100%
- เมื่อเซ็นเซอร์หรือเครือข่ายมีปัญหา ระบบควรเข้าสู่สถานะปลอดภัย
- หน้าเว็บต้องแสดงสถานะจริงจากอุปกรณ์ ไม่ควรเดาจากคำสั่งล่าสุดเท่านั้น

---

## 10. วิธีทำงานในแต่ละขั้น

ทุกระยะให้ใช้ขั้นตอนเดิม:

```text
1. ตกลงข้อมูล Input/Output
2. สร้าง Type
3. สร้าง Mock
4. สร้าง API
5. สร้าง Component
6. ทดลอง Loading/Error
7. รัน Lint และ Build
8. Commit ลง Git
9. ไปขั้นถัดไป
```

คำสั่งตรวจโปรเจกต์:

```powershell
npm run dev
npm run lint
npm run build
```

รูปแบบ Commit ที่แนะนำ:

```text
feat: display sensor readings
feat: add manual curtain controls
feat: add automatic mode settings
fix: handle ESP32 connection timeout
docs: update project plan
```

---

## 11. งานถัดไป

งานถัดไปคือระยะที่ 1: แสดงข้อมูลเซ็นเซอร์บนหน้าเว็บ

ลำดับการทำ:

1. สร้าง `components/dashboard/SensorCard.tsx`
2. สร้าง `components/dashboard/SensorPanel.tsx`
3. เรียก `/api/sensors`
4. แสดงอุณหภูมิ ความชื้น และความเข้มแสง
5. เพิ่ม Loading และ Error state
6. ทดสอบบนหน้าจอมือถือ

หลังจากขั้นนี้ผ่านแล้ว จึงเริ่มทำให้อัปเดตข้อมูลอัตโนมัติทุก 5 วินาที

