import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Key,
  Zap,
  Flame,
  Hash,
  Eye,
  EyeOff,
  Save,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Radio,
  ArrowRight,
  Info,
  Coins
} from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';
import { OctopusGuideModal } from '../components/OctopusGuideModal';

export const SettingsPage = () => {
  const { credentials, saveSettings, clearSettings, isConfigured } = useOctopus();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    apiKey: '',
    electricMpan: '',
    electricSerial: '',
    gasMprn: '',
    gasSerial: '',
    offPeakRate: '4.99',
    standardRate: '27.05',
    standingCharge: '56.6',
    gasStandardRate: '7.23',
    gasStandingCharge: '29.10'
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync form data when context credentials change
  useEffect(() => {
    setFormData({
      apiKey: credentials.apiKey || '',
      electricMpan: credentials.electricMpan || '',
      electricSerial: credentials.electricSerial || '',
      gasMprn: credentials.gasMprn || '',
      gasSerial: credentials.gasSerial || '',
      offPeakRate: credentials.offPeakRate || '4.99',
      standardRate: credentials.standardRate || '27.05',
      standingCharge: credentials.standingCharge || '56.6',
      gasStandardRate: credentials.gasStandardRate || '7.23',
      gasStandingCharge: credentials.gasStandingCharge || '29.10'
    });
  }, [credentials]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required to connect to Octopus Energy';
    }
    if (!formData.electricMpan.trim()) {
      newErrors.electricMpan = 'Electricity MPAN is required';
    }
    if (!formData.electricSerial.trim()) {
      newErrors.electricSerial = 'Electricity Meter Serial Number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setTimeout(() => {
      const result = saveSettings(formData);
      setIsSaving(false);
      if (result.success) {
        setSaveSuccessMsg(true);
        setTimeout(() => {
          setSaveSuccessMsg(false);
        }, 5000);
      }
    }, 300);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all stored credentials from this browser?')) {
      clearSettings();
      setSaveSuccessMsg(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title & Status */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
              System Configuration
            </h1>
            <span className="cyber-badge cyber-badge-blue">V1.0</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure your Octopus Energy credentials and energy tariff rates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGuideOpen(true)}
          className="cyber-btn cyber-btn-outline"
          style={{ padding: '0.6rem 1rem', fontSize: '0.825rem' }}
          id="btn-open-guide"
        >
          <HelpCircle size={16} color="var(--accent-blue)" />
          <span>Where to find credentials?</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div
          className="cyber-card"
          style={{
            borderColor: 'var(--accent-emerald)',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            animation: 'fadeIn 0.3s ease-out'
          }}
          id="success-banner"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={20} color="#10B981" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#A7F3D0', fontSize: '0.95rem' }}>
                Settings Saved Successfully!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6EE7B7' }}>
                Credentials and unit rates stored in LocalStorage.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/electricity')}
              className="cyber-btn cyber-btn-blue"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', flexShrink: 0 }}
              id="btn-goto-electricity"
            >
              <span>Electricity</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/gas')}
              className="cyber-btn"
              style={{
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                flexShrink: 0,
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF3B30 100%)',
                color: '#fff',
                fontWeight: 700
              }}
              id="btn-goto-gas"
            >
              <span>Gas</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} noValidate>
        {/* API Authentication Card */}
        <div className="cyber-card cyber-card-blue-glow" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} color="var(--accent-blue)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Octopus API Authentication
              </h2>
            </div>
            <span className="cyber-badge cyber-badge-blue">REQUIRED</span>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="apiKey">
              <span>API Key <span className="req">*</span></span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Format: sk_live_...</span>
            </label>
            <div className="input-wrapper">
              <input
                id="apiKey"
                name="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="e.g. sk_live_abc12345xyz6789"
                className={`cyber-input ${errors.apiKey ? 'has-error' : ''}`}
                autoComplete="off"
                spellCheck="false"
              />
              <div className="input-icon-left">
                <Key size={16} />
              </div>
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                aria-label="Toggle API Key visibility"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.apiKey ? (
              <span className="input-error">{errors.apiKey}</span>
            ) : (
              <span className="input-hint">
                <Info size={12} /> Found at octopus.energy/dashboard/developer
              </span>
            )}
          </div>
        </div>

        {/* Electricity Meter Configuration Card */}
        <div className="cyber-card" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="var(--accent-blue)" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Electricity Meter Telemetry
              </h2>
            </div>
            <span className="cyber-badge cyber-badge-blue">REQUIRED</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* Electricity MPAN */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="electricMpan">
                <span>Electricity MPAN <span className="req">*</span></span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>13 digits</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="electricMpan"
                  name="electricMpan"
                  type="text"
                  value={formData.electricMpan}
                  onChange={(e) => handleChange('electricMpan', e.target.value.trim())}
                  placeholder="e.g. 1200023456789"
                  className={`cyber-input ${errors.electricMpan ? 'has-error' : ''}`}
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <Hash size={16} />
                </div>
              </div>
              {errors.electricMpan ? (
                <span className="input-error">{errors.electricMpan}</span>
              ) : (
                <span className="input-hint">Unique supply point number</span>
              )}
            </div>

            {/* Electricity Serial */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="electricSerial">
                <span>Electricity Serial No <span className="req">*</span></span>
              </label>
              <div className="input-wrapper">
                <input
                  id="electricSerial"
                  name="electricSerial"
                  type="text"
                  value={formData.electricSerial}
                  onChange={(e) => handleChange('electricSerial', e.target.value.trim().toUpperCase())}
                  placeholder="e.g. 21M0498765"
                  className={`cyber-input ${errors.electricSerial ? 'has-error' : ''}`}
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <Radio size={16} />
                </div>
              </div>
              {errors.electricSerial ? (
                <span className="input-error">{errors.electricSerial}</span>
              ) : (
                <span className="input-hint">Found on physical meter</span>
              )}
            </div>
          </div>
        </div>

        {/* Electricity Tariff & Pricing Configuration Card */}
        <div className="cyber-card cyber-card-blue-glow" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins size={18} color="#10B981" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Electricity Tariff Pricing Rates
              </h2>
            </div>
            <span className="cyber-badge cyber-badge-emerald">UNIT RATES</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {/* Off-Peak Price */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="offPeakRate">
                <span style={{ color: '#10B981', fontWeight: 700 }}>Off-Peak Rate (00:30 – 05:30)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p / kWh</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="offPeakRate"
                  name="offPeakRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.offPeakRate}
                  onChange={(e) => handleChange('offPeakRate', e.target.value)}
                  placeholder="4.99"
                  className="cyber-input"
                  style={{ color: '#10B981', fontWeight: 600 }}
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 700 }}>p</span>
                </div>
              </div>
              <span className="input-hint">Default: 4.99p / kWh</span>
            </div>

            {/* Standard Price */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="standardRate">
                <span style={{ color: 'var(--accent-blue-bright)', fontWeight: 700 }}>Standard Rate</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p / kWh</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="standardRate"
                  name="standardRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.standardRate}
                  onChange={(e) => handleChange('standardRate', e.target.value)}
                  placeholder="27.05"
                  className="cyber-input"
                  style={{ color: 'var(--accent-blue-bright)', fontWeight: 600 }}
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--accent-blue-bright)', fontWeight: 700 }}>p</span>
                </div>
              </div>
              <span className="input-hint">Default: 27.05p / kWh</span>
            </div>

            {/* Standing Charge */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="standingCharge">
                <span>Standing Charge</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p / day</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="standingCharge"
                  name="standingCharge"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.standingCharge}
                  onChange={(e) => handleChange('standingCharge', e.target.value)}
                  placeholder="56.6"
                  className="cyber-input"
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>p</span>
                </div>
              </div>
              <span className="input-hint">Default: 56.6p / day</span>
            </div>
          </div>
        </div>

        {/* Gas Meter Configuration Card */}
        <div className="cyber-card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(255, 107, 0, 0.35)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={18} color="#FF6B00" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Gas Meter Telemetry
              </h2>
            </div>
            <span className="cyber-badge cyber-badge-amber">GAS MATRIX</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {/* Gas MPRN */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="gasMprn">
                <span>Gas MPRN / MPAN</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>6-10 digits</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="gasMprn"
                  name="gasMprn"
                  type="text"
                  value={formData.gasMprn}
                  onChange={(e) => handleChange('gasMprn', e.target.value.trim())}
                  placeholder="e.g. 8765432109"
                  className="cyber-input"
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <Hash size={16} />
                </div>
              </div>
              <span className="input-hint">Meter Point Reference Number</span>
            </div>

            {/* Gas Serial */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="gasSerial">
                <span>Gas Serial No</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="gasSerial"
                  name="gasSerial"
                  type="text"
                  value={formData.gasSerial}
                  onChange={(e) => handleChange('gasSerial', e.target.value.trim().toUpperCase())}
                  placeholder="e.g. G4K01234567"
                  className="cyber-input"
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <Radio size={16} />
                </div>
              </div>
              <span className="input-hint">Physical gas meter identifier</span>
            </div>
          </div>
        </div>

        {/* Gas Tariff & Pricing Configuration Card */}
        <div
          className="cyber-card"
          style={{
            marginBottom: '1.75rem',
            borderColor: 'rgba(255, 107, 0, 0.4)',
            boxShadow: '0 0 24px -4px rgba(255, 107, 0, 0.25)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coins size={18} color="#FF8C00" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                Gas Tariff Pricing Rates
              </h2>
            </div>
            <span className="cyber-badge cyber-badge-amber">GAS RATES</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {/* Gas Standard Rate */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="gasStandardRate">
                <span style={{ color: '#FF8C00', fontWeight: 700 }}>Gas Unit Rate</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p / kWh</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="gasStandardRate"
                  name="gasStandardRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gasStandardRate}
                  onChange={(e) => handleChange('gasStandardRate', e.target.value)}
                  placeholder="7.23"
                  className="cyber-input"
                  style={{ color: '#FF8C00', fontWeight: 600 }}
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: '#FF8C00', fontWeight: 700 }}>p</span>
                </div>
              </div>
              <span className="input-hint">Default: 7.23p / kWh</span>
            </div>

            {/* Gas Standing Charge */}
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label" htmlFor="gasStandingCharge">
                <span>Gas Standing Charge</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>p / day</span>
              </label>
              <div className="input-wrapper">
                <input
                  id="gasStandingCharge"
                  name="gasStandingCharge"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.gasStandingCharge}
                  onChange={(e) => handleChange('gasStandingCharge', e.target.value)}
                  placeholder="29.10"
                  className="cyber-input"
                  autoComplete="off"
                />
                <div className="input-icon-left">
                  <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>p</span>
                </div>
              </div>
              <span className="input-hint">Default: 29.10p / day</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="cyber-btn cyber-btn-blue"
              id="btn-save-settings"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="cyber-btn cyber-btn-danger-outline"
              id="btn-clear-settings"
            >
              <Trash2 size={16} />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </form>

      {/* Developer Portal Guide Modal */}
      <OctopusGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

export default SettingsPage;
