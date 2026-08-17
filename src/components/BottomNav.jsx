import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Zap, Flame, Settings } from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';

export const BottomNav = () => {
  const { isConfigured } = useOctopus();
  const location = useLocation();

  // Helper to check if current route matches
  const isElectricityActive =
    location.pathname === '/' || location.pathname === '/electricity';
  const isGasActive = location.pathname === '/gas';
  const isSettingsActive = location.pathname === '/settings';

  return (
    <div className="bottom-nav-container">
      <nav className="bottom-nav-dock" aria-label="Main Navigation">
        {/* Electricity Option */}
        <NavLink
          to="/electricity"
          id="nav-electricity"
          className={`nav-item ${isElectricityActive ? 'active-blue' : ''}`}
        >
          <Zap
            className="nav-icon"
            color={isElectricityActive ? '#00D2FF' : 'currentColor'}
            strokeWidth={isElectricityActive ? 2.5 : 2}
          />
          <span>Electricity</span>
        </NavLink>

        {/* Gas Option */}
        <NavLink
          to="/gas"
          id="nav-gas"
          className={`nav-item ${isGasActive ? 'active-cyan' : ''}`}
        >
          <Flame
            className="nav-icon"
            color={isGasActive ? '#00F0FF' : 'currentColor'}
            strokeWidth={isGasActive ? 2.5 : 2}
          />
          <span>Gas</span>
        </NavLink>

        {/* Settings Option */}
        <NavLink
          to="/settings"
          id="nav-settings"
          className={`nav-item ${isSettingsActive ? 'active-purple' : ''}`}
        >
          <Settings
            className="nav-icon"
            color={isSettingsActive ? '#A855F7' : 'currentColor'}
            strokeWidth={isSettingsActive ? 2.5 : 2}
          />
          <span>Settings</span>
          {!isConfigured && <div className="nav-badge-dot" title="Setup Required" />}
        </NavLink>
      </nav>
    </div>
  );
};
