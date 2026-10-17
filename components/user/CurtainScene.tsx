import styles from "./CurtainScene.module.css";

type CurtainSceneProps = {
  positionPercent: number | null;
  compact?: boolean;
};

export default function CurtainScene({
  positionPercent,
  compact = false,
}: CurtainSceneProps) {
  const safePosition = Math.max(0, Math.min(100, positionPercent ?? 0));
  const panelWidth = 50 - safePosition * 0.44;

  return (
    <div className={`${styles.scene} ${compact ? styles.compact : ""}`}>
      <div className={styles.rod} aria-hidden="true" />
      <div className={styles.window} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hillBack} />
        <span className={styles.hillFront} />
        <span className={styles.frameVertical} />
        <span className={styles.frameHorizontal} />
        <span
          className={`${styles.curtain} ${styles.left}`}
          style={{ width: `${panelWidth}%` }}
        />
        <span
          className={`${styles.curtain} ${styles.right}`}
          style={{ width: `${panelWidth}%` }}
        />
      </div>
      <div className={styles.sill} aria-hidden="true" />
    </div>
  );
}
