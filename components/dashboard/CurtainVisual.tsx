import styles from "./CurtainVisual.module.css";

type CurtainVisualProps = {
    positionPercent: number;
};

export default function CurtainVisual({
    positionPercent,
}: CurtainVisualProps) {
    const safePositionPercent = Math.min(
        100,
        Math.max(0, positionPercent),
    );
    // ช่องว่างตรงกลางมีความกว้างเท่ากับเปอร์เซ็นต์เปิดจริง
    const panelWidth = (100 - safePositionPercent) / 2;

    return (
        <div className={styles.preview}>
            <div className={styles.window} aria-hidden="true">
                <div
                   className={`${styles.curtain} ${styles.left}`}
                   style={{ width: `${panelWidth}%` }}
                />
                <div
                     className={`${styles.curtain} ${styles.right}`} 
                     style={{ width: `${panelWidth}%` }}
                />
            </div>
            <p className={styles.caption}>
                เปิดอยู่ {safePositionPercent.toFixed(1)}%
                {" · "}
                ปิดอยู่ {(100 - safePositionPercent).toFixed(1)}%
            </p>
        </div>
    );
}
