import React from 'react';
import { useThemeStore } from '../../store';
import styles from './LiquidBackground.module.css';

export default function LiquidBackground() {
  const { theme } = useThemeStore();

  if (theme !== 'glass') return null;

  return (
    <div className={styles.liquidContainer} aria-hidden="true">
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />
      <div className={`${styles.orb} ${styles.orb4}`} />
      <div className={styles.noiseOverlay} />
    </div>
  );
}
