import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useOctopus } from './context/OctopusContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { SettingsPage } from './pages/SettingsPage';
import { ElectricityPage } from './pages/ElectricityPage';
import { GasPage } from './pages/GasPage';

// Route Guard Component to handle automatic redirection
const RouteGuard = ({ children }) => {
  const { isLoaded, isConfigured } = useOctopus();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;

    // If unconfigured and trying to view main dashboards, redirect to /settings
    if (!isConfigured && location.pathname !== '/settings') {
      navigate('/settings', { replace: true });
    }
  }, [isLoaded, isConfigured, location.pathname, navigate]);

  // Loading state while checking localStorage
  if (!isLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(255, 0, 122, 0.2)',
            borderTopColor: '#FF007A',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          INITIALIZING TELEMETRY MATRIX...
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return children;
};

export const App = () => {
  return (
    <div className="app-container">
      <div className="cyber-grid-bg" />
      <Header />
      <Toast />

      <main className="main-content">
        <RouteGuard>
          <Routes>
            <Route path="/" element={<Navigate to="/electricity" replace />} />
            <Route path="/electricity" element={<ElectricityPage />} />
            <Route path="/gas" element={<GasPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/electricity" replace />} />
          </Routes>
        </RouteGuard>
      </main>

      <BottomNav />
    </div>
  );
};

export default App;
