const messages: Record<string, string> = {
  "encoder-no-pulse": "ไม่พบ Pulse จาก Encoder",
  "position-timeout": "ไปไม่ถึงตำแหน่งเป้าหมายภายในเวลาที่กำหนด",
  "closed-limit-timeout": "ไม่พบสวิตช์ปิดสุดภายใน 10 วินาที",
  "open-limit-timeout": "ไม่พบสวิตช์เปิดสุดภายใน 10 วินาที",
  "limit-conflict": "สวิตช์เปิดสุดและปิดสุดทำงานพร้อมกัน",
  "open-limit-active": "สวิตช์เปิดสุดทำงานอยู่ จึงไม่สั่งเปิดต่อ",
  "closed-limit-active": "สวิตช์ปิดสุดทำงานอยู่ จึงไม่สั่งปิดต่อ",
  "departure-direction-unverified": "ยังยืนยันทิศ Encoder ขณะออกจากลิมิตไม่ได้",
  "departure-wrong-direction": "Encoder เปลี่ยนค่าไปผิดทิศขณะออกจากลิมิต",
  "departure-limit-stuck": "สวิตช์ต้นทางไม่คลายภายในระยะหรือเวลาที่กำหนด",
  "departure-encoder-unverified": "Encoder ไม่ยืนยันการถอยออกจากลิมิตทันเวลา",
  "unexpected-source-limit": "สวิตช์ต้นทางกลับมาทำงานระหว่างเคลื่อนที่",
  "motor-direction-unknown": "ระบบไม่ทราบทิศการหมุนของมอเตอร์",
};

export function getMotorFaultMessage(fault: string): string {
  return messages[fault] ?? `ข้อผิดพลาดจาก ESP32: ${fault}`;
}
