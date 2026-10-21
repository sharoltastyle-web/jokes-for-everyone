import styles from "./Decorations.module.css";

// Purely decorative shapes from the mockup; hidden from assistive tech.
function Dash({ color, rotate }: { color: string; rotate: number }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <line
        x1="8"
        y1="20"
        x2="32"
        y2="20"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        transform={`rotate(${rotate} 20 20)`}
      />
    </svg>
  );
}

function Smiley() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <path
        d="M32 4a26 26 0 1 1-13.5 48.2L8 58l3.4-11.2A26 26 0 0 1 32 4z"
        fill="#fff"
        stroke="#fde7b0"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="30" r="19" fill="#ffd54d" />
      <path
        d="M23 26q3-4 6 0M35 26q3-4 6 0"
        fill="none"
        stroke="#183849"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M21 32h22q-2 12-11 12t-11-12z" fill="#183849" />
      <path d="M26 39q6 4 12 0q-2 5-6 5t-6-5z" fill="#ff7a8a" />
    </svg>
  );
}

export default function Decorations() {
  return (
    <div className={styles.layer} aria-hidden="true">
      <div className={styles.topStart}>
        <Smiley />
        <span className={styles.dashA}>
          <Dash color="#28c0e8" rotate={-50} />
        </span>
        <span className={styles.dashB}>
          <Dash color="#ffbf9f" rotate={-15} />
        </span>
      </div>
      <div className={styles.topEnd}>
        <span className={styles.dashC}>
          <Dash color="#ffb800" rotate={40} />
        </span>
        <span className={styles.dashD}>
          <Dash color="#ff8fb0" rotate={60} />
        </span>
      </div>

      <div className={`${styles.blob} ${styles.blobEnd}`}>
        <span className={styles.dashE}>
          <Dash color="#c08ae8" rotate={-55} />
        </span>
        <span className={styles.dashF}>
          <Dash color="#ffbf9f" rotate={-25} />
        </span>
      </div>
      <div className={`${styles.blob} ${styles.blobStart}`}>
        <span className={styles.dashG}>
          <Dash color="#ffb800" rotate={35} />
        </span>
        <span className={styles.dashH}>
          <Dash color="#28c0e8" rotate={55} />
        </span>
      </div>
    </div>
  );
}
