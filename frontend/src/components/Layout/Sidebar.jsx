import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  Clock, 
  BarChart3, 
  Settings, 
  LogOut, 
  AudioWaveform 
} from 'lucide-react';
import { useAuthStore } from '../../store';
import styles from './Sidebar.module.css';

const mainNav = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Cari Lagu' },
  { to: '/library', icon: Library, label: 'Koleksi Library' },
];

const duoNav = [
  { to: '/liked', icon: Heart, label: 'Lagu Disukai' },
  { to: '/history', icon: Clock, label: 'Riwayat Putar' },
  { to: '/stats', icon: BarChart3, label: 'Statistik Berdua' },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Brand Header */}
      <div className={styles.brand}>
        <div className={styles.brandIcon} style={{ overflow: 'hidden', padding: 0 }}>
          <img src="/icons/icon-192.png" alt="Sync Play" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className={styles.brandMeta}>
          <span className={styles.brandName}>Sync Play</span>
          <span className={styles.brandTag}>Duo Music</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className={styles.navSection}>
        <span className={styles.sectionTitle}>Menu</span>
        <div className={styles.navGroup}>
          {mainNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <Icon size={18} strokeWidth={2.2} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Duo Playlist / Activity */}
      <nav className={styles.navSection}>
        <span className={styles.sectionTitle}>Aktivitas Berdua</span>
        <div className={styles.navGroup}>
          {duoNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <Icon size={18} strokeWidth={2} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className={styles.spacer} />

      {/* Settings Link */}
      <div className={styles.bottomNav}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          <Settings size={18} strokeWidth={2} className={styles.navIcon} />
          <span className={styles.navLabel}>Pengaturan</span>
        </NavLink>
      </div>

      {/* User Section */}
      {currentUser && (
        <div className={styles.userCard}>
          <div
            className={styles.avatar}
            style={{ backgroundColor: currentUser.avatar_color || '#1db954' }}
          >
            {currentUser.name[0]?.toUpperCase() || 'U'}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{currentUser.name}</span>
            <span className={styles.userStatus}>Online</span>
          </div>
          <button 
            className={styles.logoutBtn} 
            onClick={handleLogout}
            title="Ganti Profil / Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
