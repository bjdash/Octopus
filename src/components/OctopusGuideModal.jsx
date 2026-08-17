import React from 'react';
import { X, ExternalLink, Key, Hash, HelpCircle, Shield, Zap, Flame } from 'lucide-react';

export const OctopusGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={20} color="var(--accent-blue)" />
            <h2 id="guide-modal-title" style={{ fontSize: '1.15rem', color: '#fff' }}>
              Octopus Energy Credential Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p>
            You can obtain all necessary credentials directly from your official Octopus Energy online account dashboard.
          </p>

          <a
            href="https://octopus.energy/dashboard/developer/"
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-btn cyber-btn-outline"
            style={{
              width: '100%',
              justifyContent: 'center',
              gap: '0.5rem',
              borderColor: 'var(--accent-blue-glow)',
              color: 'var(--accent-blue-bright)'
            }}
          >
            <span>Open Octopus Developer Dashboard</span>
            <ExternalLink size={16} />
          </a>

          {/* Steps list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div
              style={{
                background: 'rgba(8, 12, 28, 0.8)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Key size={16} color="var(--accent-blue)" />
                <span>1. API Key</span>
              </div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                Found at the bottom of the Developer page. Click <em>Generate New Key</em> if you haven't created one yet. Format begins with <code className="font-mono" style={{ color: 'var(--accent-cyan)' }}>sk_live_...</code>.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(8, 12, 28, 0.8)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Zap size={16} color="var(--accent-blue)" />
                <span>2. Electricity MPAN & Meter Serial</span>
              </div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                • <strong>MPAN:</strong> 13-digit electricity supply number (e.g., <code className="font-mono">1200023456789</code>).<br />
                • <strong>Meter Serial:</strong> Physical meter serial number (e.g., <code className="font-mono">21M0498765</code>).
              </p>
            </div>

            <div
              style={{
                background: 'rgba(8, 12, 28, 0.8)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 600, marginBottom: '0.35rem' }}>
                <Flame size={16} color="var(--accent-cyan)" />
                <span>3. Gas MPRN & Meter Serial</span>
              </div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                • <strong>MPRN:</strong> 6 to 10 digit gas supply number (e.g., <code className="font-mono">8765432109</code>).<br />
                • <strong>Meter Serial:</strong> Gas meter serial number (e.g., <code className="font-mono">G4K01234567</code>).
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.775rem',
                color: '#A7F3D0'
              }}
            >
              <Shield size={16} color="#10B981" style={{ flexShrink: 0 }} />
              <span>All credentials are kept strictly in your local browser storage. No server proxy saves your API key.</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="cyber-btn cyber-btn-blue" style={{ width: '100%' }}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
