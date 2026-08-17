import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Flame,
  TrendingDown,
  Gauge,
  Thermometer,
  Radio,
  Settings,
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';

export const GasPage = () => {
  const { credentials } = useOctopus();
  const hasGasConfigured = Boolean(credentials.gasMprn && credentials.gasSerial);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
              Gas Telemetry
            </h1>
            <span className="cyber-badge cyber-badge-cyan">THERMAL MATRIX</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Daily gas consumption volume (m³), energy conversion (kWh), and heating demand.
          </p>
        </div>

        {/* MPRN Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            className={`cyber-badge ${hasGasConfigured ? 'cyber-badge-cyan' : 'cyber-badge-amber'}`}
            title={`MPRN: ${credentials.gasMprn || 'Unconfigured'}`}
          >
            <Radio size={12} />
            <span>MPRN: {credentials.gasMprn ? `${credentials.gasMprn.slice(0, 4)}...${credentials.gasMprn.slice(-3)}` : 'NOT SET'}</span>
          </div>
        </div>
      </div>

      {/* Unconfigured alert if gas MPRN is empty */}
      {!hasGasConfigured && (
        <div
          className="cyber-card"
          style={{
            borderColor: 'var(--accent-amber)',
            background: 'rgba(255, 158, 11, 0.08)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} color="var(--accent-amber)" />
            <div>
              <div style={{ fontWeight: 700, color: '#FDE68A', fontSize: '0.95rem' }}>
                Gas Meter Not Configured
              </div>
              <div style={{ fontSize: '0.8rem', color: '#FCD34D' }}>
                Add your Gas MPRN & Meter Serial in Settings to monitor gas telemetry.
              </div>
            </div>
          </div>
          <NavLink
            to="/settings"
            className="cyber-btn cyber-btn-outline"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', flexShrink: 0 }}
          >
            Configure Gas
          </NavLink>
        </div>
      )}

      {/* Gas Status Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Today's Gas Energy */}
        <div className="cyber-card cyber-card-cyan-glow">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's Thermal Energy
            </span>
            <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-cyan-dim)' }}>
              <Flame size={18} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
              14.2
            </div>
            <div className="font-mono" style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>
              kWh
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Converted from ~<strong>1.27 m³</strong> (CV: 39.5)</span>
          </div>
        </div>

        {/* Gas Unit Price */}
        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gas Tariff Rate
            </span>
            <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-amber-dim)' }}>
              <Gauge size={18} color="var(--accent-amber)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
              5.62
            </div>
            <div className="font-mono" style={{ fontSize: '1rem', color: 'var(--accent-amber)' }}>
              p / kWh
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#10B981' }}>
            <TrendingDown size={13} />
            <span>Standing Charge: 29.8p/day</span>
          </div>
        </div>

        {/* Estimated Day Cost */}
        <div className="cyber-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's Gas Cost
            </span>
            <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.12)' }}>
              <Thermometer size={18} color="#10B981" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>
              £1.10
            </div>
            <div className="font-mono" style={{ fontSize: '1rem', color: '#10B981' }}>
              GBP
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={13} />
            <span>Optimal boiler curve</span>
          </div>
        </div>
      </div>

      {/* Gas Energy Telemetry Engine Notice */}
      <div
        className="cyber-card"
        style={{
          background: 'rgba(14, 18, 38, 0.5)',
          border: '1px dashed var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem 1.5rem',
          gap: '1rem'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--accent-cyan-dim)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Flame size={24} color="var(--accent-cyan)" />
        </div>
        <div style={{ maxWidth: '520px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
            Gas Telemetry Engine Ready
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Gas meter half-hourly readings and tracker tariff metrics will stream here automatically upon integrating the live Octopus Energy API ingestion pipeline.
          </p>
        </div>

        <NavLink to="/settings" className="cyber-btn cyber-btn-outline" style={{ fontSize: '0.825rem', gap: '0.4rem' }}>
          <Settings size={14} />
          <span>Configure Meter Settings</span>
        </NavLink>
      </div>
    </div>
  );
};
