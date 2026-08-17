import React, { createContext, useContext, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const OctopusContext = createContext(null);

const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  ELECTRIC_MPAN: 'electricMpan',
  ELECTRIC_SERIAL: 'electricSerial',
  GAS_MPRN: 'gasMprn',
  GAS_SERIAL: 'gasSerial',
  OFF_PEAK_RATE: 'offPeakRate',
  STANDARD_RATE: 'standardRate',
  STANDING_CHARGE: 'standingCharge',
  LEGACY_ALL: 'octopus_settings'
};

export const OctopusProvider = ({ children }) => {
  const [credentials, setCredentials] = useState({
    apiKey: '',
    electricMpan: '',
    electricSerial: '',
    gasMprn: '',
    gasSerial: '',
    offPeakRate: '4.99',
    standardRate: '27.05',
    standingCharge: '56.6'
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' | 'info', id }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
      const electricMpan = localStorage.getItem(STORAGE_KEYS.ELECTRIC_MPAN) || '';
      const electricSerial = localStorage.getItem(STORAGE_KEYS.ELECTRIC_SERIAL) || '';
      const gasMprn = localStorage.getItem(STORAGE_KEYS.GAS_MPRN) || '';
      const gasSerial = localStorage.getItem(STORAGE_KEYS.GAS_SERIAL) || '';
      const offPeakRate = localStorage.getItem(STORAGE_KEYS.OFF_PEAK_RATE) || '';
      const standardRate = localStorage.getItem(STORAGE_KEYS.STANDARD_RATE) || '';
      const standingCharge = localStorage.getItem(STORAGE_KEYS.STANDING_CHARGE) || '';

      // Check legacy combined key fallback if individual keys are missing
      let combined = {};
      const combinedRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_ALL);
      if (combinedRaw) {
        try {
          combined = JSON.parse(combinedRaw);
        } catch (e) {
          // ignore
        }
      }

      const initialCreds = {
        apiKey: apiKey || combined.apiKey || '',
        electricMpan: electricMpan || combined.electricMpan || '',
        electricSerial: electricSerial || combined.electricSerial || '',
        gasMprn: gasMprn || combined.gasMprn || '',
        gasSerial: gasSerial || combined.gasSerial || '',
        offPeakRate: offPeakRate || combined.offPeakRate || '4.99',
        standardRate: standardRate || combined.standardRate || '27.05',
        standingCharge: standingCharge || combined.standingCharge || '56.6'
      };

      setCredentials(initialCreds);
    } catch (err) {
      console.error('Failed to read from localStorage:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Check if minimum necessary credentials exist
  const isConfigured = Boolean(
    credentials.apiKey?.trim() &&
    credentials.electricMpan?.trim() &&
    credentials.electricSerial?.trim()
  );

  const isFullyConfigured = Boolean(
    isConfigured &&
    credentials.gasMprn?.trim() &&
    credentials.gasSerial?.trim()
  );

  // Trigger HUD Toast
  const showToast = (message, type = 'success', duration = 4000) => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, duration);
  };

  const closeToast = () => setToast(null);

  // Save to localStorage
  const saveSettings = (newSettings) => {
    try {
      const sanitized = {
        ...newSettings,
        offPeakRate: newSettings.offPeakRate?.trim() || '4.99',
        standardRate: newSettings.standardRate?.trim() || '27.05',
        standingCharge: newSettings.standingCharge?.trim() || '56.6'
      };

      localStorage.setItem(STORAGE_KEYS.API_KEY, sanitized.apiKey || '');
      localStorage.setItem(STORAGE_KEYS.ELECTRIC_MPAN, sanitized.electricMpan || '');
      localStorage.setItem(STORAGE_KEYS.ELECTRIC_SERIAL, sanitized.electricSerial || '');
      localStorage.setItem(STORAGE_KEYS.GAS_MPRN, sanitized.gasMprn || '');
      localStorage.setItem(STORAGE_KEYS.GAS_SERIAL, sanitized.gasSerial || '');
      localStorage.setItem(STORAGE_KEYS.OFF_PEAK_RATE, sanitized.offPeakRate);
      localStorage.setItem(STORAGE_KEYS.STANDARD_RATE, sanitized.standardRate);
      localStorage.setItem(STORAGE_KEYS.STANDING_CHARGE, sanitized.standingCharge);

      // Also persist combined JSON
      localStorage.setItem(STORAGE_KEYS.LEGACY_ALL, JSON.stringify(sanitized));

      setCredentials(sanitized);

      // Trigger celebratory micro-interaction
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 },
          colors: ['#00D2FF', '#00F0FF', '#38BDF8', '#10B981', '#FF9E0B']
        });
      } catch (e) {
        // ignore
      }

      showToast('Settings and tariff rates saved successfully!', 'success');
      return { success: true };
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
      showToast('Error saving settings to storage.', 'error');
      return { success: false, error: err.message };
    }
  };

  // Clear from localStorage
  const clearSettings = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      localStorage.removeItem(STORAGE_KEYS.ELECTRIC_MPAN);
      localStorage.removeItem(STORAGE_KEYS.ELECTRIC_SERIAL);
      localStorage.removeItem(STORAGE_KEYS.GAS_MPRN);
      localStorage.removeItem(STORAGE_KEYS.GAS_SERIAL);
      localStorage.removeItem(STORAGE_KEYS.OFF_PEAK_RATE);
      localStorage.removeItem(STORAGE_KEYS.STANDARD_RATE);
      localStorage.removeItem(STORAGE_KEYS.STANDING_CHARGE);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_ALL);

      const defaultReset = {
        apiKey: '',
        electricMpan: '',
        electricSerial: '',
        gasMprn: '',
        gasSerial: '',
        offPeakRate: '4.99',
        standardRate: '27.05',
        standingCharge: '56.6'
      };
      setCredentials(defaultReset);
      showToast('Settings and credentials have been cleared.', 'info');
      return { success: true };
    } catch (err) {
      console.error('Failed to clear settings:', err);
      return { success: false, error: err.message };
    }
  };

  return (
    <OctopusContext.Provider
      value={{
        credentials,
        isLoaded,
        isConfigured,
        isFullyConfigured,
        saveSettings,
        clearSettings,
        toast,
        showToast,
        closeToast
      }}
    >
      {children}
    </OctopusContext.Provider>
  );
};

export const useOctopus = () => {
  const context = useContext(OctopusContext);
  if (!context) {
    throw new Error('useOctopus must be used within an OctopusProvider');
  }
  return context;
};

export default OctopusContext;
