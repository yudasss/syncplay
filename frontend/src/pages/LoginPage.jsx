import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioWaveform, ArrowLeft, Delete } from 'lucide-react';
import { useAuthStore } from '../store';
import { getUsers, loginWithPin } from '../api';
import styles from './LoginPage.module.css';

const DEFAULT_USERS = [
  { id: 1, name: 'User 1', avatar_color: '#1db954' },
  { id: 2, name: 'User 2', avatar_color: '#f43f5e' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, currentUser } = useAuthStore();
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) navigate('/');
    getUsers()
      .then(({ data }) => {
        if (data?.users && data.users.length > 0) {
          setUsers(data.users);
        }
      })
      .catch((err) => {
        console.warn('[Login] Network fallback to default users:', err.message);
      })
      .finally(() => {
        setLoadingUsers(false);
      });
  }, [currentUser]);

  const handlePinKey = (digit) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const handleLogin = async () => {
    if (!selected) return setError('Silakan pilih profil kamu.');
    setLoading(true);
    setError('');
    try {
      const { data } = await loginWithPin(pin);
      if (data.user.id !== selected.id) {
        setError('PIN salah untuk profil ini.');
        setPin('');
      } else {
        setUser(data.user);
        navigate('/');
      }
    } catch {
      setError('PIN tidak valid.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoBadge} style={{ overflow: 'hidden', padding: 0 }}>
            <img src="/icons/icon-192.png" alt="Sync Play" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 className={styles.logoText}>Sync Play</h1>
        </div>
        <p className={styles.tagline}>Aplikasi musik berdua, bebas iklan.</p>

        {!selected ? (
          /* Profile Select */
          <div className={styles.profileSelect}>
            <span className={styles.selectLabel}>Pilih Profil Kamu</span>
            <div className={styles.profilesGrid}>
              {users.map((user) => (
                <button
                  key={user.id}
                  className={styles.profileCard}
                  onClick={() => setSelected(user)}
                >
                  <div
                    className={styles.avatar}
                    style={{ backgroundColor: user.avatar_color || '#1db954' }}
                  >
                    {user.name[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className={styles.profileName}>{user.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* PIN Entry */
          <div className={styles.pinSection}>
            <button 
              className={styles.backBtn} 
              onClick={() => { setSelected(null); setPin(''); setError(''); }}
            >
              <ArrowLeft size={16} />
              <span>Ganti Profil</span>
            </button>

            <div className={styles.selectedBox}>
              <div 
                className={styles.avatarSmall} 
                style={{ backgroundColor: selected.avatar_color || '#1db954' }}
              >
                {selected.name[0]?.toUpperCase() || 'U'}
              </div>
              <span className={styles.selectedName}>{selected.name}</span>
            </div>

            <span className={styles.pinInstruction}>Masukkan PIN Akses</span>

            {/* PIN Dots */}
            <div className={styles.pinDots}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.pinDot} ${i < pin.length ? styles.pinFilled : ''}`}
                />
              ))}
            </div>

            {error && <p className={styles.errorText}>{error}</p>}

            {/* Numpad */}
            <div className={styles.numpad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button 
                  key={n} 
                  className={styles.numBtn} 
                  onClick={() => handlePinKey(String(n))}
                >
                  {n}
                </button>
              ))}
              <div className={styles.numBtnEmpty} />
              <button className={styles.numBtn} onClick={() => handlePinKey('0')}>
                0
              </button>
              <button 
                className={styles.numBtn} 
                onClick={handleBackspace}
                title="Hapus"
              >
                <Delete size={18} />
              </button>
            </div>

            <button
              className="btn btn-accent"
              style={{ width: '100%', marginTop: 14 }}
              onClick={handleLogin}
              disabled={pin.length < 4 || loading}
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
