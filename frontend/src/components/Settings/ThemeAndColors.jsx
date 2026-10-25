import React, { useMemo } from 'react';
import { ArrowLeft, RotateCw, Palette, Sparkles, Check } from 'lucide-react';
import { useThemeStore, COLOR_PALETTES, THEME_MODES } from '../../store';
import styles from './ThemeAndColors.module.css';

export default function ThemeAndColors({ onBack }) {
  const { theme, setTheme, themeMode, setThemeMode, paletteId, setPaletteId } = useThemeStore();

  const activePalette = useMemo(() => {
    return COLOR_PALETTES.find((p) => p.id === paletteId) || COLOR_PALETTES[0];
  }, [paletteId]);

  // Determine phone mockup background based on active themeMode
  const mockupBg = 
    themeMode === 'light' ? '#ffffff' :
    themeMode === 'espresso' ? '#1c1512' :
    themeMode === 'amoled' ? '#000000' : '#14141a';

  return (
    <div className={styles.container}>
      {/* Header with Back Arrow */}
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={onBack} title="Kembali">
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 className={styles.title}>Theme & Colors</h1>
      </header>

      {/* ── Interactive Phone Mockup Preview ── */}
      <div className={styles.mockupSection}>
        <div 
          className={styles.phoneMockup}
          style={{ backgroundColor: mockupBg }}
        >
          {/* Top Status Indicators */}
          <div className={styles.mockupTopBar}>
            <div 
              className={styles.mockupDot} 
              style={{ backgroundColor: activePalette.primary }} 
            />
            <div 
              className={styles.mockupDot} 
              style={{ backgroundColor: activePalette.secondary }} 
            />
          </div>

          {/* Primary Top Card */}
          <div 
            className={styles.mockupPrimaryCard}
            style={{ backgroundColor: activePalette.primary }}
          />

          {/* Split Secondary Cards */}
          <div className={styles.mockupCardRow}>
            <div 
              className={styles.mockupSplitCardLeft}
              style={{ backgroundColor: activePalette.secondary }}
            />
            <div 
              className={styles.mockupSplitCardRight}
              style={{ backgroundColor: activePalette.previewCardSecondary || '#4ec7d4' }}
            />
          </div>

          {/* Bottom Action Dot */}
          <div 
            className={styles.mockupBottomDot}
            style={{ backgroundColor: activePalette.primary }}
          />
        </div>
      </div>

      {/* ── Theme Mode & Color Palette Controls Card ── */}
      <div className={styles.controlCard}>
        {/* Theme Mode Selector */}
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>THEME MODE</span>
          <div className={styles.modeRow}>
            {/* Dynamic Sync Circle */}
            <button
              type="button"
              className={`${styles.modeCircleBtn} ${styles.modeDynamicBtn} ${themeMode === 'dynamic' ? styles.modeActive : ''}`}
              onClick={() => setThemeMode('dynamic')}
              title="Dynamic Sync"
            >
              <RotateCw size={18} strokeWidth={2.4} />
            </button>

            {/* Light Circle */}
            <button
              type="button"
              className={`${styles.modeCircleBtn} ${styles.modeLightBtn} ${themeMode === 'light' ? styles.modeActive : ''}`}
              onClick={() => setThemeMode('light')}
              title="Light Mode"
            />

            {/* Espresso Warm Dark Circle */}
            <button
              type="button"
              className={`${styles.modeCircleBtn} ${styles.modeEspressoBtn} ${themeMode === 'espresso' ? styles.modeActive : ''}`}
              onClick={() => setThemeMode('espresso')}
              title="Espresso Dark"
            />

            {/* AMOLED Pure Black Circle */}
            <button
              type="button"
              className={`${styles.modeCircleBtn} ${styles.modeAmoledBtn} ${themeMode === 'amoled' ? styles.modeActive : ''}`}
              onClick={() => setThemeMode('amoled')}
              title="AMOLED Black"
            />
          </div>
        </div>

        {/* Color Palette Selector */}
        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>COLOR PALETTE</span>
          <div className={styles.paletteScrollRow}>
            {/* Palette Master Icon Button */}
            <button
              type="button"
              className={`${styles.paletteIconBtn}`}
              style={{ backgroundColor: activePalette.primary }}
              title="Active Palette"
            >
              <Palette size={18} color="#ffffff" strokeWidth={2.2} />
            </button>

            {/* Duo-tone Palette Swatches */}
            {COLOR_PALETTES.map((pal) => {
              const isActive = paletteId === pal.id;
              return (
                <button
                  key={pal.id}
                  type="button"
                  className={`${styles.swatchPill} ${isActive ? styles.swatchActive : ''}`}
                  onClick={() => setPaletteId(pal.id)}
                  title={pal.name}
                >
                  <div 
                    className={styles.swatchTop} 
                    style={{ backgroundColor: pal.primary }} 
                  />
                  <div 
                    className={styles.swatchBottom} 
                    style={{ backgroundColor: pal.secondary }} 
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Liquid Glass Effect Toggle */}
        <div className={styles.glassToggleRow}>
          <div className={styles.glassToggleMeta}>
            <div className={styles.glassTitleRow}>
              <Sparkles size={16} className={styles.glassIcon} />
              <span className={styles.glassTitle}>Efek Liquid Glass</span>
            </div>
            <span className={styles.glassSub}>Aktifkan dock mengambang & efek kaca transparan</span>
          </div>
          <button
            type="button"
            className={`${styles.switchBtn} ${theme === 'glass' ? styles.switchOn : ''}`}
            onClick={() => setTheme(theme === 'glass' ? 'default' : 'glass')}
          >
            <div className={styles.switchHandle} />
          </button>
        </div>
      </div>
    </div>
  );
}
