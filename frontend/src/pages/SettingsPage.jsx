import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Check, 
  Lock, 
  User, 
  Palette, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuthStore, useThemeStore, COLOR_PALETTES, THEME_MODES } from '../store';
import { updateUser } from '../api';
import ThemeAndColors from '../components/Settings/ThemeAndColors';
import AboutDeveloper from '../components/Settings/AboutDeveloper';
import ServerSettings from '../components/Settings/ServerSettings';
import styles from './SettingsPage.module.css';

const COLORS = [
  '#1db954', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f59e0b', '#06b6d4', '#10b981', '#f43f5e'
];

export default function SettingsPage() {
  const { currentUser, setUser } = useAuthStore();
  const { theme, themeMode, paletteId } = useThemeStore();
  const [subView, setSubView] = useState('menu'); // 'menu' | 'theme' | 'about' | 'server'

  const [name, setName] = useState(currentUser?.name || '');
  const [color, setColor] = useState(currentUser?.avatar_color || '#1db954');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const activePalette = useMemo(() => {
    return COLOR_PALETTES.find((p) => p.id === paletteId) || COLOR_PALETTES[0];
  }, [paletteId]);

  const activeMode = useMemo(() => {
    return THEME_MODES.find((m) => m.id === themeMode) || THEME_MODES[0];
  }, [themeMode]);

  const handleSave = async () => {
    setError('');
    if (pin && pin !== confirmPin) return setError('Konfirmasi PIN baru tidak sesuai.');
    if (pin && pin.length < 4) return setError('PIN minimal harus 4 digit angka.');

    try {
      const updates = { name, avatar_color: color };
      if (pin) updates.pin = pin;
      const { data } = await updateUser(currentUser.id, updates);
      setUser(data.user);
      setSaved(true);
      setPin('');
      setConfirmPin('');
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError('Gagal menyimpan profil. Silakan coba lagi.');
    }
  };

  // If viewing Theme & Colors subview
  if (subView === 'theme') {
    return (
      <div className={styles.page}>
        <ThemeAndColors onBack={() => setSubView('menu')} />
      </div>
    );
  }

  // If viewing About Developer subview
  if (subView === 'about') {
    return (
      <div className={styles.page}>
        <AboutDeveloper onBack={() => setSubView('menu')} />
      </div>
    );
  }

  // If viewing Server & Connection subview
  if (subView === 'server') {
    return (
      <div className={styles.page}>
        <ServerSettings onBack={() => setSubView('menu')} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pengaturan</h1>
        <p className={styles.subtitle}>Kelola tema, server jaringan, profil, dan informasi pengembang.</p>
      </header>

      {/* Profile Card Preview */}
      <div className={styles.profileBox}>
        <div className={styles.avatarLarge} style={{ backgroundColor: color }}>
          {(name || currentUser?.name || 'U')[0].toUpperCase()}
        </div>
        <div className={styles.profileMeta}>
          <span className={styles.profileName}>{name || currentUser?.name}</span>
          <span className={styles.profileRole}>Profil Aktif</span>
        </div>
      </div>

      {/* ── Feature Navigation Cards (Theme, Server & About) ── */}
      <div className={styles.menuNavSection}>
        {/* Theme & Colors Card */}
        <button 
          type="button" 
          className={styles.menuCard} 
          onClick={() => setSubView('theme')}
        >
          <div 
            className={styles.menuIconWrap} 
            style={{ 
              background: `linear-gradient(135deg, ${activePalette.primary} 0%, ${activePalette.secondary} 100%)` 
            }}
          >
            <Palette size={20} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div className={styles.menuMeta}>
            <div className={styles.menuTitleRow}>
              <span className={styles.menuTitle}>Theme & Colors</span>
              <span className={styles.menuBadge}>Kustom</span>
            </div>
            <span className={styles.menuSubtitle}>
              {activeMode.label} • {activePalette.name}
            </span>
          </div>
          <ChevronRight size={20} className={styles.menuChevron} />
        </button>

        {/* Server & Jaringan Card */}
        <button 
          type="button" 
          className={styles.menuCard} 
          onClick={() => setSubView('server')}
        >
          <div 
            className={styles.menuIconWrap} 
            style={{ 
              background: 'radial-gradient(circle at 30% 30%, #10b981 0%, #059669 100%)' 
            }}
          >
            <ShieldCheck size={20} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div className={styles.menuMeta}>
            <div className={styles.menuTitleRow}>
              <span className={styles.menuTitle}>Server & Jaringan</span>
              <span className={styles.menuBadge} style={{ background: '#10b981' }}>Auto-Failover</span>
            </div>
            <span className={styles.menuSubtitle}>
              Online (Cloudflare) / Lokal Wi-Fi • Uji Koneksi
            </span>
          </div>
          <ChevronRight size={20} className={styles.menuChevron} />
        </button>

        {/* Tentang Pengembang Card */}
        <button 
          type="button" 
          className={styles.menuCard} 
          onClick={() => setSubView('about')}
        >
          <div 
            className={styles.menuIconWrap} 
            style={{ 
              background: 'radial-gradient(circle at 30% 30%, #3b82f6 0%, #06b6d4 100%)' 
            }}
          >
            <Sparkles size={20} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div className={styles.menuMeta}>
            <div className={styles.menuTitleRow}>
              <span className={styles.menuTitle}>Tentang Aplikasi</span>
              <span className={styles.creatorTag}>ydaapr.dev</span>
            </div>
            <span className={styles.menuSubtitle}>
              Sync Play 1.0 Universal • Media Sosial & Info
            </span>
          </div>
          <ChevronRight size={20} className={styles.menuChevron} />
        </button>
      </div>

      {/* ── Account Settings Form ── */}
      <div className={styles.sectionDivider}>
        <span className={styles.sectionTitle}>PROFIL & KEAMANAN</span>
      </div>

      <div className={styles.formCard}>
        {/* Nama Profil */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <User size={16} className={styles.fieldIcon} />
            <label className={styles.label}>Nama Panggilan</label>
          </div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masukkan nama kamu..."
          />
        </div>

        {/* Warna Avatar */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <Palette size={16} className={styles.fieldIcon} />
            <label className={styles.label}>Warna Identitas Profil</label>
          </div>
          <div className={styles.colorPalette}>
            {COLORS.map((c) => (
              <button
                key={c}
                className={`${styles.colorChip} ${c === color ? styles.colorActive : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              >
                {c === color && <Check size={14} className={styles.checkIcon} />}
              </button>
            ))}
          </div>
        </div>

        {/* Keamanan PIN */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldLabelRow}>
            <Lock size={16} className={styles.fieldIcon} />
            <label className={styles.label}>Ubah PIN Akses (Opsional)</label>
          </div>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Ketik 4-6 digit PIN baru..."
          />
        </div>

        {pin && (
          <div className={styles.fieldGroup}>
            <label className={styles.labelSub}>Ulangi PIN Baru</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Konfirmasi 4-6 digit PIN baru..."
            />
          </div>
        )}

        {error && <p className={styles.errorMessage}>{error}</p>}

        <button 
          className="btn btn-accent" 
          style={{ width: '100%', marginTop: 8 }} 
          onClick={handleSave}
        >
          {saved ? (
            <>
              <Check size={16} strokeWidth={2.5} />
              <span>Perubahan Disimpan</span>
            </>
          ) : (
            <span>Simpan Profil</span>
          )}
        </button>
      </div>

      {/* App Version Info Footer */}
      <div className={styles.footerInfo}>
        <div className={styles.appMetaRow}>
          <ShieldCheck size={15} className={styles.shieldIcon} />
          <span>Sync Play Universal 1.0 • Karya ydaapr.dev</span>
        </div>
      </div>
    </div>
  );
}
