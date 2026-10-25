import React from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './AboutDeveloper.module.css';

// SVG Instagram Icon
function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Sync Play Logo Disc
function AppLogoDisc({ size = 48 }) {
  return (
    <div className={styles.appLogoDisc} style={{ width: size, height: size, overflow: 'hidden', padding: 0 }}>
      <img src="/icons/icon-192.png" alt="Sync Play" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

export default function AboutDeveloper({ onBack }) {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack} title="Kembali">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 className={styles.title}>Tentang</h1>
      </header>

      {/* ── App Info Card ── */}
      <div className={styles.appCard}>
        <AppLogoDisc size={48} />
        <div className={styles.appInfo}>
          <h2 className={styles.appName}>Sync Play</h2>
          <div className={styles.badgeRow}>
            <span className={styles.badgePill}>1.0</span>
            <span className={styles.badgePill}>UNIVERSAL</span>
          </div>
        </div>
      </div>

      {/* ── Creator Feature Card ── */}
      <div className={styles.creatorCard}>
        {/* Banner Artwork with Creator Photo */}
        <div className={styles.bannerFrame}>
          <img 
            src="/creator/creator_photo.jpg" 
            alt="ydaapr.dev Creator Photo" 
            className={styles.bannerImg} 
          />
          <div className={styles.bannerScrim} />
        </div>

        {/* Creator Name & Role Overlay */}
        <div className={styles.creatorMetaOverlay}>
          <div className={styles.creatorNameGroup}>
            <h3 className={styles.creatorName}>ydaapr.dev</h3>
            <span className={styles.creatorRole}>PENGEMBANG</span>
          </div>

          {/* Floating Circle Avatar Inset */}
          <div className={styles.avatarInset}>
            <img 
              src="/creator/ydaapr_avatar.jpg" 
              alt="ydaapr.dev Avatar" 
              className={styles.avatarImg} 
            />
          </div>
        </div>
      </div>

      {/* ── Media Sosial Section (2 Instagram Links) ── */}
      <div className={styles.socialSection}>
        <span className={styles.socialHeader}>MEDIA SOSIAL</span>

        <div className={styles.socialButtonGroup}>
          {/* Instagram 1: @ydaapr */}
          <a
            href="https://www.instagram.com/ydaapr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialBtn}
          >
            <div className={styles.socialIconWrap}>
              <InstagramIcon size={19} />
            </div>
            <span className={styles.socialLabel}>
              Instagram <span className={styles.socialDot}>•</span> @ydaapr
            </span>
          </a>

          {/* Instagram 2: @maltlup */}
          <a
            href="https://www.instagram.com/maltlup"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialBtn}
          >
            <div className={styles.socialIconWrap}>
              <InstagramIcon size={19} />
            </div>
            <span className={styles.socialLabel}>
              Instagram <span className={styles.socialDot}>•</span> @maltlup
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
