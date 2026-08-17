import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Zap, ShieldCheck, AlertTriangle, Radio } from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';

export const Header = () => {
  const { isConfigured, isFullyConfigured } = useOctopus();
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="top-header">
      <div className="header-content">
        <NavLink to="/" className="brand-logo">
          <div className="brand-icon-wrapper">
            <Zap size={20} color="#00D2FF" fill="#00D2FF" fillOpacity={0.25} />
          </div>
          <div>
            <div className="brand-title">OCTOPUS // OS</div>
            <div className="brand-tagline">ENERGY TELEMETRY MATRIX</div>
          </div>
        </NavLink>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Real-time Clock */}
          <div
            className="font-mono"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Radio size={12} color="var(--accent-cyan)" />
            <span>{time || '--:--:--'}</span>
          </div>

          {/* Connection Status Badge */}
          {isConfigured ? (
            <div
              className={`cyber-badge ${
                isFullyConfigured ? 'cyber-badge-emerald' : 'cyber-badge-cyan'
              }`}
              title={
                isFullyConfigured
                  ? 'All meters and API credentials configured'
                  : 'Electricity configured (Gas optional)'
              }
            >
              <ShieldCheck size={13} />
              <span>{isFullyConfigured ? 'ONLINE' : 'ELEC READY'}</span>
            </div>
          ) : (
            <NavLink
              to="/settings"
              style={{ textDecoration: 'none' }}
              className="cyber-badge cyber-badge-amber"
              title="Click to configure Octopus credentials"
            >
              <AlertTriangle size={13} />
              <span>SETUP REQ</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};
