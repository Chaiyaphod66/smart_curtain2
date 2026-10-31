# แผนที่โค้ดสำหรับอธิบายในรายงาน

อัปเดต: 31 ตุลาคม 2569

โครงการแบ่งเป็นสองส่วนที่อยู่คนละโฟลเดอร์: `smart_curtain2` คือเว็บ Next.js และ `smart_curtain_esp32` คือ Firmware PlatformIO การจัดระเบียบรอบนี้เพิ่มแผนที่และเอกสาร ไม่ย้ายไฟล์โค้ดเดิมที่ระบบใช้งานอยู่

| หัวข้อในรายงาน | ไฟล์หลัก | หน้าที่ |
| --- | --- | --- |
| หน้าใช้งานทั่วไป | `app/(user)/`, `components/user/` | แสดงสถานะ, เลือก Manual/Auto, ส่งคำสั่ง, แจ้งสถานะ Safety |
| หน้าเครื่องมือพัฒนา | `app/dev/`, `components/dashboard/` | ตรวจเซ็นเซอร์, Encoder, ลิมิต, Calibration, Motion Log และสถานะ Auto |
| สถานะและคำสั่งฝั่งเว็บ | `hooks/useDeviceStatus.ts`, `hooks/useCurtainControl.ts` | Poll สถานะ ESP32 และเก็บสถานะการส่งคำสั่ง/การเคลื่อนที่ |
| การเชื่อมต่อ ESP32 | `lib/curtain/esp32-curtain-client.ts`, `app/api/` | HTTP command ฝั่งเบราว์เซอร์ และ API อ่านสถานะ/เซ็นเซอร์ |
| Logic Auto | `lib/curtain/`, `types/auto-preset.ts` | Preset, Preview, Model A และชนิดข้อมูลที่ใช้ร่วมกัน |
| Firmware และฮาร์ดแวร์ | `../smart_curtain_esp32/src/main.cpp`, `../smart_curtain_esp32/platformio.ini` | GPIO, PWM, FC-33, Encoder, Sensor, HTTP และ Auto ที่ทำงานบน ESP32 |
| การตรวจสอบ | `lib/curtain/*.test.mjs`, `docs/05-hardware-safety-and-validation.md` | Unit test ฝั่งเว็บและแผนวัดผลชุดฮาร์ดแวร์จริง |

เส้นทางคำสั่ง: ปุ่มเว็บ → `useCurtainControl` → ESP32 HTTP endpoint → Firmware ตรวจเงื่อนไข → L298N → มอเตอร์ ข้อมูลย้อนกลับ: FC-33/Encoder/เซ็นเซอร์ → ESP32 `/status`/`/sensors` → hooks → หน้าจอ

ข้อสำคัญสำหรับรายงาน: การล็อกปุ่มในหน้า User เป็นการลดคำสั่งผิดพลาด ไม่ใช่ชั้น Safety หลัก เพราะหน้าเว็บอาจออฟไลน์หรือถูกข้ามได้ การตัดสินใจหยุดมอเตอร์ต้องอยู่ที่ Firmware และการตัดกำลังอิสระทางฮาร์ดแวร์สำหรับงานใช้งานจริง

สถานะการตรวจ: `npm test` ผ่าน 72 รายการ, ESLint, `npm run build` และ `platformio run` ผ่าน พร้อมอัปโหลด Firmware 0.12.2 และทำ Calibration ระยะจริงใหม่แล้ว
