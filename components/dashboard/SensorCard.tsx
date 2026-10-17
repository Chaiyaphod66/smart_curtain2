import styles from "./SensorCard.module.css";

type SensorCardProps = {
  label: string;
  value: number | null;
  unit: string;
};

export default function SensorCard({
  label,
  value,
  unit,
}: SensorCardProps) {
  return (
    <article className={styles.card}>
      <p className={styles.label}>{label}</p>

      <strong className={styles.value}>
        {value ?? "—"}

        {value !== null && (
          <span className={styles.unit}>{unit}</span>
        )}
      </strong>
    </article>
  );
}