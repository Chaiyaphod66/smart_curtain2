"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppIcon from "./AppIcon";
import styles from "./UserShell.module.css";

const navigation = [
  { href: "/", label: "ภาพรวม", icon: "home" as const },
  { href: "/control", label: "ควบคุม", icon: "curtain" as const },
  {
    href: "/environment",
    label: "สภาพแวดล้อม",
    shortLabel: "เซ็นเซอร์",
    icon: "environment" as const,
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export default function UserShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Smart Curtain หน้าแรก">
            <span className={styles.brandMark} aria-hidden="true">
              <span />
              <span />
            </span>
            <span>
              <strong>Smart Curtain</strong>
              <small>Home comfort, simplified</small>
            </span>
          </Link>

          <nav className={styles.desktopNav} aria-label="เมนูหลัก">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(pathname, item.href) ? styles.active : undefined}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link className={styles.devLink} href="/dev">
            <AppIcon name="developer" size={17} />
            Developer
          </Link>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.mobileNav} aria-label="เมนูหลักสำหรับโทรศัพท์">
        {navigation.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.mobileActive : undefined}
              aria-current={active ? "page" : undefined}
            >
              <AppIcon name={item.icon} size={21} />
              <span>{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
