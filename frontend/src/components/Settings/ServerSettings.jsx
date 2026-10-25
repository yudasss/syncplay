import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Globe, 
  Wifi, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Radio, 
  Zap, 
  Server,
  RotateCcw
} from 'lucide-react';
import { 
  getActiveServerUrl, 
  setActiveServerUrl, 
  testServerConnection, 
  DEFAULT_PUBLIC_SERVER, 
  DEFAULT_LAN_SERVER 
} from '../../api';
import styles from './ServerSettings.module.css';

export default function ServerSettings({ onBack }) {
  const [currentUrl, setCurrentUrl] = useState(getActiveServerUrl());
  const [customInput, setCustomInput] = useState(
    localStorage.getItem('harmonia_custom_server_url') || ''
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState({ testing: false, ok: null, latency: null });
  const [lanStatus, setLanStatus] = useState({ testing: false, ok: null, latency: null });
  const [savedNotice, setSavedNotice] = useState(false);

  // Ping both endpoints on mount to show live connectivity
  useEffect(() => {
    checkEndpoints();
  }, []);

  const checkEndpoints = async () => {
    // Check Online Server
    setOnlineStatus((prev) => ({ ...prev, testing: true }));
    const onlineRes = await testServerConnection(DEFAULT_PUBLIC_SERVER);
    setOnlineStatus({ testing: false, ok: onlineRes.ok, latency: onlineRes.latency });

    // Check LAN Server
    setLanStatus((prev) => ({ ...prev, testing: true }));
    const lanRes = await testServerConnection(DEFAULT_LAN_SERVER);
    setLanStatus({ testing: false, ok: lanRes.ok, latency: lanRes.latency });
  };

  const handleSelectServer = async (targetUrl) => {
    setActiveServerUrl(targetUrl);
    setCurrentUrl(targetUrl);
    setSavedNotice(true);
    setTestResult(null);

    // Test active connection immediately
    setTesting(true);
    const result = await testServerConnection(targetUrl);
    setTesting(false);
    setTestResult(result);

    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleApplyCustom = async () => {
    if (!customInput.trim()) return;
    localStorage.setItem('harmonia_custom_server_url', customInput.trim());
    handleSelectServer(customInput.trim());
  };

  const handleResetDefault = () => {
    localStorage.removeItem('harmonia_custom_server_url');
    setCustomInput('');
    handleSelectServer(DEFAULT_PUBLIC_SERVER);
  };

  const isOnlineActive = currentUrl === DEFAULT_PUBLIC_SERVER;
  const isLanActive = currentUrl === DEFAULT_LAN_SERVER;
  const isCustomActive = !isOnlineActive && !isLanActive;

  return (
    <div className={styles.container}>
      {/* Top Navigation */}
      <div className={styles.navBar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Kembali</span>
        </button>
        <span className={styles.navTitle}>Server & Jaringan</span>
        <button 
          type="button" 
          className={styles.refreshBtn} 
          onClick={checkEndpoints}
          title="Uji Ulang Koneksi"
        >
          <RefreshCw size={16} className={onlineStatus.testing || lanStatus.testing ? styles.spin : ''} />
        </button>
      </div>

      {/* Active Server Status Banner */}
      <div className={styles.activeCard}>
        <div className={styles.activeHeader}>
          <Radio size={16} className={styles.liveRadioIcon} />
          <span className={styles.activeLabel}>Status Server Aktif</span>
          {savedNotice && (
            <span className={styles.savedPill}>
              <Check size={12} strokeWidth={2.5} /> Tersimpan
            </span>
          )}
        </div>
        <p className={styles.activeUrl}>{currentUrl}</p>
        <div className={styles.activeFooter}>
          {testResult ? (
            testResult.ok ? (
              <span className={styles.badgeSuccess}>
                <Zap size={13} />
                <span>Terhubung • Latensi {testResult.latency} ms</span>
              </span>
            ) : (
              <span className={styles.badgeDanger}>
                <AlertCircle size={13} />
                <span>Koneksi Gagal ({testResult.error})</span>
              </span>
            )
          ) : (
            <button 
              type="button" 
              className={styles.testBtn} 
              onClick={() => handleSelectServer(currentUrl)}
              disabled={testing}
            >
              <Zap size={13} />
              <span>{testing ? 'Menguji...' : 'Uji Koneksi Sekarang'}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.sectionTitle}>PILIHAN KONEKSI CEPAT</div>

      {/* Preset 1: Cloudflare Public Online */}
      <button 
        type="button" 
        className={`${styles.presetCard} ${isOnlineActive ? styles.presetActive : ''}`}
        onClick={() => handleSelectServer(DEFAULT_PUBLIC_SERVER)}
      >
        <div className={styles.presetIconWrap}>
          <Globe size={20} className={styles.globeIcon} />
        </div>
        <div className={styles.presetInfo}>
          <div className={styles.presetTitleRow}>
            <span className={styles.presetName}>Server Online (Cloudflare Tunnel)</span>
            {isOnlineActive && <span className={styles.activeBadge}>Aktif</span>}
          </div>
          <p className={styles.presetSub}>
            Dapat diakses di mana saja melalui jaringan seluler 4G/5G atau Wi-Fi publik tanpa batas.
          </p>
          <div className={styles.pingRow}>
            {onlineStatus.testing ? (
              <span className={styles.pingChecking}>Memeriksa jaringan...</span>
            ) : onlineStatus.ok ? (
              <span className={styles.pingOk}>
                <span className={styles.dotOk} /> Online ({onlineStatus.latency} ms)
              </span>
            ) : (
              <span className={styles.pingFail}>
                <span className={styles.dotFail} /> Tidak terjangkau
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Preset 2: Local LAN / Home Wi-Fi */}
      <button 
        type="button" 
        className={`${styles.presetCard} ${isLanActive ? styles.presetActive : ''}`}
        onClick={() => handleSelectServer(DEFAULT_LAN_SERVER)}
      >
        <div className={styles.presetIconWrap}>
          <Wifi size={20} className={styles.wifiIcon} />
        </div>
        <div className={styles.presetInfo}>
          <div className={styles.presetTitleRow}>
            <span className={styles.presetName}>Server Lokal Wi-Fi (LAN)</span>
            {isLanActive && <span className={styles.activeBadge}>Aktif</span>}
          </div>
          <p className={styles.presetSub}>
            Super cepat tanpa kuota internet saat HP dan Laptop terhubung di satu router Wi-Fi yang sama (192.168.1.11).
          </p>
          <div className={styles.pingRow}>
            {lanStatus.testing ? (
              <span className={styles.pingChecking}>Memeriksa jaringan...</span>
            ) : lanStatus.ok ? (
              <span className={styles.pingOk}>
                <span className={styles.dotOk} /> Lokal Siap ({lanStatus.latency} ms)
              </span>
            ) : (
              <span className={styles.pingFail}>
                <span className={styles.dotFail} /> Tidak terjangkau (Pastikan satu Wi-Fi)
              </span>
            )}
          </div>
        </div>
      </button>

      <div className={styles.sectionTitle}>SERVER KUSTOM</div>

      {/* Custom Server Input Card */}
      <div className={styles.customCard}>
        <div className={styles.customHeader}>
          <Server size={16} />
          <span className={styles.customLabel}>Alamat IP / Domain Mandiri</span>
        </div>
        <input 
          type="text" 
          className={styles.customInput}
          placeholder="Contoh: http://192.168.1.50:3001"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
        />
        <div className={styles.customActionRow}>
          <button 
            type="button" 
            className={styles.applyBtn}
            onClick={handleApplyCustom}
            disabled={!customInput.trim()}
          >
            <Check size={14} />
            <span>Terapkan</span>
          </button>
          <button 
            type="button" 
            className={styles.resetBtn}
            onClick={handleResetDefault}
            title="Reset ke Online Tunnel"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Notice Card */}
      <div className={styles.infoBox}>
        <AlertCircle size={15} className={styles.infoIcon} />
        <p className={styles.infoText}>
          Sistem memiliki fitur <strong>Smart Auto-Failover</strong>: Jika salah satu jalur terputus atau sinyal melemah, aplikasi akan otomatis beralih ke jalur cadangan yang tersedia tanpa menghentikan pemutaran lagu.
        </p>
      </div>
    </div>
  );
}
