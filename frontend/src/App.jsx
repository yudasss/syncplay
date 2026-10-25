import React, { useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from './store';
import './styles/globals.css';

// Layout
import Sidebar from './components/Layout/Sidebar';
import PlayerBar from './components/Player/PlayerBar';
import FullscreenPlayer from './components/Player/FullscreenPlayer';
import BottomNav from './components/Layout/BottomNav';
import LiquidBackground from './components/Layout/LiquidBackground';

// Pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import LikedPage from './pages/LikedPage';
import HistoryPage from './pages/HistoryPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';

const TAB_ROUTES = ['/', '/search', '/library', '/liked', '/settings'];

function ProtectedLayout() {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const touchState = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
    isLocked: false,
  });

  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (!currentUser) return <Navigate to="/login" replace />;

  const currentIdx = TAB_ROUTES.findIndex(
    (r) => r === location.pathname || (r !== '/' && location.pathname.startsWith(r))
  );

  const handleTouchStart = (e) => {
    // If touching controls or scrollable horizontal chips, don't initiate page swipe
    if (e.target.closest('button, input, select, textarea, [class*="filterPills"], [class*="progress"], [class*="bottomNav"], [class*="playerBar"]')) {
      touchState.current.isLocked = true;
      return;
    }

    touchState.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      startTime: Date.now(),
      isSwiping: false,
      isLocked: false,
    };
    setDragOffset(0);
    setIsTransitioning(false);
  };

  const handleTouchMove = (e) => {
    if (touchState.current.isLocked) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchState.current.startX;
    const deltaY = currentY - touchState.current.startY;

    // Detect horizontal vs vertical intention
    if (!touchState.current.isSwiping) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        // Dominant vertical scroll: yield to native smooth page scrolling
        touchState.current.isLocked = true;
        return;
      }
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
        touchState.current.isSwiping = true;
      }
    }

    if (touchState.current.isSwiping) {
      // Rubber-band resistance at boundary tabs
      const isLeftEdge = currentIdx === 0 && deltaX > 0;
      const isRightEdge = currentIdx === TAB_ROUTES.length - 1 && deltaX < 0;
      const resistance = (isLeftEdge || isRightEdge) ? 0.22 : 0.85;
      setDragOffset(deltaX * resistance);
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchState.current.isSwiping) {
      touchState.current.isLocked = false;
      return;
    }

    const currentX = e.changedTouches[0].clientX;
    const deltaX = currentX - touchState.current.startX;
    const deltaTime = Math.max(1, Date.now() - touchState.current.startTime);
    const velocity = Math.abs(deltaX) / deltaTime;

    const isFlick = velocity > 0.35 && Math.abs(deltaX) > 30;
    const isPassedThreshold = Math.abs(deltaX) > 60;

    if ((isFlick || isPassedThreshold) && currentIdx !== -1) {
      if (deltaX < 0 && currentIdx < TAB_ROUTES.length - 1) {
        // Swipe Left -> Next Tab
        setIsTransitioning(true);
        setDragOffset(-window.innerWidth * 0.35);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(6);
        }
        setTimeout(() => {
          navigate(TAB_ROUTES[currentIdx + 1]);
          setDragOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else if (deltaX > 0 && currentIdx > 0) {
        // Swipe Right -> Previous Tab
        setIsTransitioning(true);
        setDragOffset(window.innerWidth * 0.35);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(6);
        }
        setTimeout(() => {
          navigate(TAB_ROUTES[currentIdx - 1]);
          setDragOffset(0);
          setIsTransitioning(false);
        }, 150);
      } else {
        // Rebound from edge
        setIsTransitioning(true);
        setDragOffset(0);
        setTimeout(() => setIsTransitioning(false), 220);
      }
    } else {
      // Cancelled swipe
      setIsTransitioning(true);
      setDragOffset(0);
      setTimeout(() => setIsTransitioning(false), 220);
    }

    touchState.current.isSwiping = false;
    touchState.current.isLocked = false;
  };

  const containerTransform = dragOffset !== 0
    ? `translate3d(${dragOffset}px, 0, 0)`
    : 'translate3d(0, 0, 0)';

  const containerTransition = isTransitioning
    ? 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease'
    : 'none';

  const containerOpacity = dragOffset !== 0
    ? Math.max(0.7, 1 - Math.abs(dragOffset) / (window.innerWidth * 1.2))
    : 1;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100dvh', width: '100%', maxWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <LiquidBackground />
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <main 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative', WebkitOverflowScrolling: 'touch' }}
        >
          <div 
            key={location.pathname} 
            className="page-transition"
            style={{
              transform: containerTransform,
              transition: containerTransition,
              opacity: containerOpacity,
              height: '100%',
              width: '100%',
              willChange: 'transform, opacity',
            }}
          >
            <Outlet />
          </div>
        </main>
        <PlayerBar />
      </div>
      <BottomNav />
      <FullscreenPlayer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/library/:id" element={<LibraryPage />} />
          <Route path="/liked" element={<LikedPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
