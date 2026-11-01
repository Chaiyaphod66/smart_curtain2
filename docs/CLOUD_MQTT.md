# Smart Curtain Cloud (MQTT, no Supabase)

ระบบ Cloud รุ่นนี้ไม่ใช้ Supabase เว็บ Next.js และ ESP32 ติดต่อกันผ่าน Managed MQTT Broker โดย Browser ไม่ได้รับ Username/Password ของ MQTT

## สิ่งที่ยังทำงานใน ESP32

- อ่าน DHT22, BH1750, Encoder และ Limit Sensor
- ควบคุมมอเตอร์ เบรก Homing และ Calibration
- ตรวจ timeout, fault และเงื่อนไขความปลอดภัยทั้งหมด
- ประมวลผล Auto preset และ Model A ต่อเนื่อง
- เก็บ Motion/Fault log แบบจำกัดขนาดไว้ใน Flash ของบอร์ด

Cloud มีหน้าที่ส่งคำสั่งและส่งต่อสถานะเท่านั้น จึงไม่สามารถสั่งข้าม Limit Sensor หรือ Fault ของ ESP32 ได้

## Topic

เมื่อ `MQTT_TOPIC_PREFIX=smart-curtain` และ `MQTT_DEVICE_ID=smart-curtain-esp32`:

| Topic | Retain | หน้าที่ |
| --- | --- | --- |
| `smart-curtain/smart-curtain-esp32/availability` | yes | `online`/`offline` จาก Last Will |
| `smart-curtain/smart-curtain-esp32/status` | yes | สถานะล่าสุดจาก `/status` |
| `smart-curtain/smart-curtain-esp32/sensors` | yes | ค่าเซ็นเซอร์ล่าสุด |
| `smart-curtain/smart-curtain-esp32/command` | no | คำสั่งอายุสั้นจากเว็บ |
| `smart-curtain/smart-curtain-esp32/command-result` | no | ผลรับหรือปฏิเสธคำสั่ง |
| `smart-curtain/smart-curtain-esp32/event` | no | เหตุการณ์หยุด/fault สำหรับระบบภายนอกในอนาคต |

คำสั่งไม่ใช้ retained message เพื่อไม่ให้คำสั่งเก่าทำงานหลัง ESP32 กลับมาออนไลน์ และ ESP32 ตรวจ `expiresAt` ก่อนรับคำสั่งทุกครั้ง

## การตั้งค่า Broker

1. สร้าง EMQX Cloud Serverless deployment ที่รองรับ TLS (แนะนำสำหรับต้นแบบและมี Free quota)
2. สร้าง Credential แยกสองชุด: `esp32-device` และ `web-server`
3. ตั้ง Authentication/Authorization ให้ Credential เข้าถึงเฉพาะ Topic ด้านบนเท่าที่ Broker รองรับ
4. ใส่ค่าอุปกรณ์ใน `include/secrets.h` ของโปรเจกต์เฟิร์มแวร์
5. ใส่ค่าฝั่งเว็บตาม `.env.example` โดยตั้ง `DEVICE_TRANSPORT=mqtt`
6. อัปโหลด Firmware แล้วตรวจ Serial ว่า MQTT connected
7. Deploy เว็บและตั้ง Environment Variables ชุดเดียวกันใน Hosting

ตั้ง `NEXT_PUBLIC_DEVICE_TRANSPORT=mqtt` ด้วยเพื่อให้หน้าเว็บลดความถี่การอ่านสถานะให้เหมาะกับ Cloud ส่วน `CLOUD_DASHBOARD_USER` และ `CLOUD_DASHBOARD_PASSWORD` ใช้เปิด HTTP Basic Auth สำหรับต้นแบบที่มีผู้ใช้ชุดเดียว

ห้ามตั้งตัวแปร MQTT เป็น `NEXT_PUBLIC_*` เพราะค่าดังกล่าวจะถูกส่งไปยัง Browser

## การสลับกลับ Local

ตั้ง `DEVICE_TRANSPORT=local`, `SENSOR_SOURCE=esp32` และ `ESP32_BASE_URL` เป็น IP ของบอร์ด แล้ว restart Next.js ไม่ต้องแก้โค้ดหรืออัปโหลด Firmware ใหม่ MQTT สามารถเปิดอยู่บนบอร์ดพร้อมกับ HTTP ใน LAN ได้

## ขอบเขตของ Log บนบอร์ด

บอร์ดเก็บเฉพาะเหตุการณ์การเคลื่อนที่และ Fault ล่าสุดแบบจำกัดขนาด เหมาะกับต้นแบบหนึ่งอุปกรณ์ แต่ไม่ใช่ฐานข้อมูลวิเคราะห์ระยะยาว หากภายหลังต้องการกราฟหลายเดือน ผู้ใช้หลายคน หรือแจ้งเตือนย้อนหลัง ค่อยเพิ่มฐานข้อมูล Cloud โดย subscribe Topic `event` ได้โดยไม่เปลี่ยนระบบควบคุมมอเตอร์

- ใน LAN อ่านได้จาก `http://<ESP32-IP>/logs?limit=20`
- ผ่านเว็บอ่านได้จาก `/api/device-logs?limit=20` ทั้ง Local และ MQTT mode
- ไฟล์ปัจจุบันมีขนาดสูงสุด 48 KB แล้วหมุนเป็นไฟล์เก่าหนึ่งชุด เพื่อไม่ให้ Flash เต็ม
