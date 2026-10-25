import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Heart, Settings } from 'lucide-react';
import { useThemeStore } from '../../store';
import styles from './BottomNav.module.css';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Cari' },
  { to: '/library', icon: Library, label: 'Library' },
  { to: '/liked', icon: Heart, label: 'Disukai' },
  { to: '/settings', icon: Settings, label: 'Profil' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef(null);
  const { theme } = useThemeStore();
  const isGlass = theme === 'glass';

  // Active tab index based on current URL path
  const activeIndex = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 0;
    if (path === '/search') return 1;
    if (path.startsWith('/library')) return 2;
    if (path === '/liked') return 3;
    if (path === '/settings' || path === '/stats') return 4;
    return 0;
  }, [location.pathname]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPx, setDragPx] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(activeIndex);
  const lastHapticIdx = useRef(activeIndex);

  // Keep hovered in sync with active tab when not dragging
  useEffect(() => {
    if (!isDragging) {
      setHoveredIdx(activeIndex);
      lastHapticIdx.current = activeIndex;
    }
  }, [activeIndex, isDragging]);

  const getMetrics = () => {
    if (!navRef.current) return null;
    const rect = navRef.current.getBoundingClientRect();
    const trackWidth = rect.width - 8; // 4px padding each side in glass island
    const itemWidth = trackWidth / navItems.length;
    return { rect, trackWidth, itemWidth };
  };

  const updateFromTouch = (touch) => {
    if (!isGlass) return;
    const metrics = getMetrics();
    if (!metrics) return;
    const { rect, trackWidth, itemWidth } = metrics;

    const xInTrack = touch.clientX - rect.left - 4;
    const targetIdx = Math.max(0, Math.min(navItems.length - 1, Math.floor(xInTrack / itemWidth)));

    // Center the pill under the finger, clamped within the dock track
    const pillCenterOffset = xInTrack - itemWidth / 2;
    const clampedOffset = Math.max(0, Math.min(trackWidth - itemWidth, pillCenterOffset));
    setDragPx(clampedOffset);

    if (targetIdx !== lastHapticIdx.current) {
      setHoveredIdx(targetIdx);
      lastHapticIdx.current = targetIdx;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(6);
      }
    }
  };

  const handleTouchStart = (e) => {
    if (!isGlass) return;
    setIsDragging(true);
    updateFromTouch(e.touches[0]);
  };

  const handleTouchMove = (e) => {
    if (!isGlass || !isDragging) return;
    updateFromTouch(e.touches[0]);
  };

  const handleTouchEnd = () => {
    if (!isGlass) return;
    setIsDragging(false);
    setDragPx(null);
    const targetItem = navItems[hoveredIdx];
    if (targetItem && hoveredIdx !== activeIndex) {
      navigate(targetItem.to);
    }
  };

  // Determine pill style for glass theme
  const pillStyle = isDragging && dragPx !== null
    ? {
      transform: `translate3d(${dragPx}px, 0, 0)`,
      transition: 'none',
    }
    : {
      transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
      transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    };

  return (
    <div className={styles.bottomNavWrapper}>
      <nav
        ref={navRef}
        className={styles.bottomNav}
        {...(isGlass ? {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          onTouchCancel: handleTouchEnd,
        } : {})}
      >
        {/* iOS Spring Sliding Capsule with specular glow (ONLY rendered when in Liquid Glass theme) */}
        {isGlass && (
          <div
            className={styles.slidingPill}
            style={pillStyle}
          />
        )}

        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isCurrent = isGlass && isDragging ? idx === hoveredIdx : idx === activeIndex;

          return (
            <button
              key={item.to}
              type="button"
              className={`${styles.tabItem} ${isCurrent ? styles.active : ''}`}
              onClick={() => {
                navigate(item.to);
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  navigator.vibrate(8);
                }
              }}
            >
              <Icon
                size={isGlass ? 19 : 20}
                strokeWidth={isCurrent ? 2.5 : 2}
                className={styles.tabIcon}
              />
              <span className={styles.tabLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
