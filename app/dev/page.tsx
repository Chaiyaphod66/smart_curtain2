import Link from "next/link";
import Dashboard from "@/components/dashboard/Dashboard";
import styles from "./dev.module.css";

export default function DeveloperPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.topbar}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandMark} aria-hidden="true">
              <i />
              <i />
            </span>
            <span>
              <strong>Smart Curtain</strong>
              <small>Engineering Console</small>
            </span>
          </Link>

          <nav className={styles.headerActions} aria-label="เครื่องมือเสริม">
            <span className={styles.devStatus}>
              <i aria-hidden="true" />
              Local development
            </span>
            <Link href="/">กลับหน้าผู้ใช้</Link>
          </nav>
        </div>

        <div className={styles.heroContent}>
          <div>
            <p className={styles.eyebrow}>SMART CURTAIN · DEV WORKSPACE</p>
            <h1>ศูนย์ควบคุมและทดสอบระบบ</h1>
            <p className={styles.description}>
              ตรวจสุขภาพอุปกรณ์ ควบคุมม่าน ทดสอบ Auto และไล่ปัญหาจากข้อมูลจริงในพื้นที่เดียว
            </p>
          </div>

          <div className={styles.quickLinks}>
            <span>ข้อมูลดิบ</span>
            <a href="/api/device-status" target="_blank" rel="noreferrer">
              Device status ↗
            </a>
            <a href="/api/sensors" target="_blank" rel="noreferrer">
              Sensor data ↗
            </a>
          </div>
        </div>
      </header>

      <Dashboard />
    </main>
  );
}
