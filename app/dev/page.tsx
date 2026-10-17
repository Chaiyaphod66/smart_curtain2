import Dashboard from "@/components/dashboard/Dashboard";
import styles from "./dev.module.css";

export default function DeveloperPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SMART CURTAIN · DEV CONSOLE</p>
          <h1>ศูนย์ทดสอบระบบม่าน</h1>
          <p className={styles.description}>
            ดูข้อมูลจริง ควบคุม และตรวจอุปกรณ์จากหน้าจอเดียว
          </p>
        </div>

        <nav className={styles.headerActions} aria-label="เครื่องมือเสริม">
          <span className={styles.devStatus}>
            <i aria-hidden="true" />
            Development
          </span>
          <a href="/api/sensors" target="_blank" rel="noreferrer">
            Sensor JSON ↗
          </a>
        </nav>
      </header>

      <Dashboard />
    </main>
  );
}
