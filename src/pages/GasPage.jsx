import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Flame,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Info,
  Clock,
  ListFilter,
  Coins,
  ChevronDown,
  Gauge,
  Radio
} from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';

// Gas conversion factor: m³ to kWh (CV: 39.5, Volume Correction: 1.02264, Conversion: / 3.6)
const M3_TO_KWH = (1.02264 * 39.5) / 3.6; // ~11.2267

// Format cost in p or £
const formatSlotCost = (costPence) => {
  if (costPence < 100) {
    return `${costPence.toFixed(1)}p`;
  }
  return `£${(costPence / 100).toFixed(2)}`;
};

export const GasPage = () => {
  const { credentials } = useOctopus();

  // Gas Tariff rates (default: 7.23p / kWh, 29.10p standing)
  const gasStandardRate = useMemo(() => parseFloat(credentials.gasStandardRate) || 7.23, [credentials.gasStandardRate]);
  const gasStandingCharge = useMemo(() => parseFloat(credentials.gasStandingCharge) || 29.10, [credentials.gasStandingCharge]);

  const hasGasConfigured = Boolean(
    credentials.apiKey?.trim() &&
    credentials.gasMprn?.trim() &&
    credentials.gasSerial?.trim()
  );

  // Date selection state - starts with today's local date
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Calendar popover & month navigation state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const calendarRef = useRef(null);

  // Telemetry API state
  const [consumptionList, setConsumptionList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [activeHoverBar, setActiveHoverBar] = useState(null);

  // Today reference at midnight
  const todayMidnight = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Check if selectedDate is today
  const isToday = useMemo(() => {
    return selectedDate.getTime() >= todayMidnight.getTime();
  }, [selectedDate, todayMidnight]);

  // Format date display label
  const formattedDateLabel = useMemo(() => {
    const yesterday = new Date(todayMidnight);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeDiff = selectedDate.getTime();
    if (timeDiff === todayMidnight.getTime()) {
      return `Today — ${selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (timeDiff === yesterday.getTime()) {
      return `Yesterday — ${selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }, [selectedDate, todayMidnight]);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCalendarOpen]);

  // Fetch gas consumption data from Octopus Energy API
  const fetchGasConsumption = useCallback(async () => {
    if (!credentials.apiKey || !credentials.gasMprn || !credentials.gasSerial) {
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const nextDay = new Date(startOfDay);
      nextDay.setDate(nextDay.getDate() + 1);

      // Period query window (inclusive of full 24-hour day)
      const periodFrom = startOfDay.toISOString();
      const periodTo = nextDay.toISOString();

      const mprn = encodeURIComponent(credentials.gasMprn.trim());
      const serial = encodeURIComponent(credentials.gasSerial.trim());
      const url = `https://api.octopus.energy/v1/gas-meter-points/${mprn}/meters/${serial}/consumption/?period_from=${periodFrom}&period_to=${periodTo}&page_size=100&order_by=period`;

      const authHeader = 'Basic ' + btoa(credentials.apiKey.trim() + ':');

      const response = await fetch(url, {
        headers: {
          Authorization: authHeader
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized: Invalid Octopus API Key or gas meter permissions.');
        } else if (response.status === 404) {
          throw new Error('Gas meter not found: Please verify your Gas MPRN and Serial Number in Settings.');
        } else {
          throw new Error(`Octopus API responded with HTTP status ${response.status}`);
        }
      }

      const data = await response.json();
      const rawResults = data.results || [];

      // Filter strictly to intervals within [startOfDay, nextDay)
      const validIntervals = rawResults.filter((item) => {
        const itemStart = new Date(item.interval_start).getTime();
        return itemStart >= startOfDay.getTime() && itemStart < nextDay.getTime();
      });

      // Deduplicate by interval_start
      const uniqueMap = new Map();
      validIntervals.forEach((item) => {
        uniqueMap.set(item.interval_start, item);
      });

      // Sort chronologically ascending
      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime()
      );

      setConsumptionList(sorted);
    } catch (err) {
      console.error('Error fetching gas consumption:', err);
      setFetchError(err.message || 'Failed to fetch gas consumption telemetry.');
      setConsumptionList([]);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, selectedDate]);

  useEffect(() => {
    if (hasGasConfigured) {
      fetchGasConsumption();
    }
  }, [fetchGasConsumption, hasGasConfigured]);

  // Aggregate Metrics & Price Computations for Gas
  const metrics = useMemo(() => {
    if (!consumptionList || consumptionList.length === 0) {
      return {
        totalM3: '0.000',
        totalKwh: '0.000',
        energyCost: '£0.00',
        totalCostWithStanding: '£0.00',
        count: 0
      };
    }

    let totalRaw = 0;
    consumptionList.forEach((item) => {
      totalRaw += parseFloat(item.consumption) || 0;
    });

    // Convert raw m³ volume to kWh
    const totalKwhVal = totalRaw * M3_TO_KWH;
    const energyCostPence = totalKwhVal * gasStandardRate;
    const totalWithStandingPence = energyCostPence + gasStandingCharge;

    return {
      totalM3: totalRaw.toFixed(3),
      totalKwh: totalKwhVal.toFixed(3),
      energyCost: `£${(energyCostPence / 100).toFixed(2)}`,
      totalCostWithStanding: `£${(totalWithStandingPence / 100).toFixed(2)}`,
      count: consumptionList.length
    };
  }, [consumptionList, gasStandardRate, gasStandingCharge]);

  // Max value for bar height and progress bar scaling
  const maxValForScale = useMemo(() => {
    if (!consumptionList || consumptionList.length === 0) return 0.2;
    const maxInList = Math.max(...consumptionList.map((c) => parseFloat(c.consumption) || 0));
    return Math.max(maxInList * 1.15, 0.05);
  }, [consumptionList]);

  // Active inspected item (hovered)
  const inspectedItem = useMemo(() => {
    if (activeHoverBar !== null && consumptionList[activeHoverBar]) {
      const item = consumptionList[activeHoverBar];
      const valM3 = parseFloat(item.consumption) || 0;
      const valKwh = valM3 * M3_TO_KWH;
      const start = new Date(item.interval_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(item.interval_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const costPence = valKwh * gasStandardRate;
      const costFormatted = formatSlotCost(costPence);

      return {
        valM3: valM3.toFixed(3),
        valKwh: valKwh.toFixed(3),
        timeWindow: `${start} – ${end}`,
        start,
        costFormatted,
        index: activeHoverBar + 1
      };
    }
    return null;
  }, [activeHoverBar, consumptionList, gasStandardRate]);

  // Calendar date selection handlers
  const handleSelectCalendarDate = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    if (normalized.getTime() > todayMidnight.getTime()) return;
    setSelectedDate(normalized);
    setIsCalendarOpen(false);
  };

  const handleCalendarPrevMonth = (e) => {
    e.stopPropagation();
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleCalendarNextMonth = (e) => {
    e.stopPropagation();
    const next = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    if (next.getFullYear() > todayMidnight.getFullYear() || (next.getFullYear() === todayMidnight.getFullYear() && next.getMonth() > todayMidnight.getMonth())) {
      return;
    }
    setCalendarMonth(next);
  };

  // Generate calendar grid days for currently viewed month
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
        isFuture: true
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      dateObj.setHours(0, 0, 0, 0);
      const isFuture = dateObj.getTime() > todayMidnight.getTime();
      const isSelected = dateObj.getTime() === selectedDate.getTime();
      const isTodayDate = dateObj.getTime() === todayMidnight.getTime();

      days.push({
        day: i,
        date: dateObj,
        isCurrentMonth: true,
        isFuture,
        isSelected,
        isTodayDate
      });
    }

    // Next month padding
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isFuture: true
      });
    }

    return days;
  }, [calendarMonth, selectedDate, todayMidnight]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header section */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
              Gas Telemetry
            </h1>
            <button
              type="button"
              style={{ cursor: 'pointer', background: 'rgba(255, 107, 0, 0.15)', borderColor: 'rgba(255, 107, 0, 0.4)', color: '#FF8C00' }}
              onClick={fetchGasConsumption}
              disabled={isLoading || !hasGasConfigured}
              className="cyber-badge"
            >
              <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unconfigured Alert if Gas details missing */}
      {!hasGasConfigured && (
        <div
          className="cyber-card"
          style={{
            borderColor: 'rgba(255, 107, 0, 0.4)',
            background: 'rgba(255, 107, 0, 0.08)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} color="#FF6B00" />
            <div>
              <div style={{ fontWeight: 700, color: '#FFB800', fontSize: '0.95rem' }}>
                Gas Meter Not Configured
              </div>
              <div style={{ fontSize: '0.8rem', color: '#FCD34D' }}>
                Enter your Gas MPRN and Meter Serial in Settings to stream live gas consumption.
              </div>
            </div>
          </div>
          <NavLink
            to="/settings"
            className="cyber-btn"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8rem',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF3B30 100%)',
              color: '#fff',
              fontWeight: 700
            }}
          >
            Configure Gas
          </NavLink>
        </div>
      )}

      {/* Date Switcher - Flame Calendar View Popover Dock */}
      {hasGasConfigured && (
        <div
          ref={calendarRef}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="cyber-badge flame-calendar-trigger-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '440px',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: isCalendarOpen ? 'rgba(255, 107, 0, 0.18)' : 'rgba(24, 12, 6, 0.88)',
              backdropFilter: 'blur(16px)',
              border: `1px solid ${isCalendarOpen ? 'rgba(255, 107, 0, 0.6)' : 'rgba(255, 107, 0, 0.35)'}`,
              boxShadow: isCalendarOpen
                ? '0 0 24px rgba(255, 107, 0, 0.4)'
                : '0 0 20px -2px rgba(255, 107, 0, 0.25)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            title="Click to open calendar and select any date"
            aria-expanded={isCalendarOpen}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CalendarIcon size={18} color="#FF8C00" />
              <span style={{ fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
                {formattedDateLabel}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#FF8C00' }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Select Date</span>
              <ChevronDown size={16} style={{ transform: isCalendarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </div>
          </button>

          {/* Cyber Calendar Dropdown Modal / Popover (Fire Theme) */}
          {isCalendarOpen && (
            <div
              className="cyber-card"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                width: '100%',
                maxWidth: '380px',
                zIndex: 100,
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                background: 'rgba(20, 10, 6, 0.98)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 107, 0, 0.45)',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 107, 0, 0.25)',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {/* Calendar Header with Month Nav */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid rgba(255, 107, 0, 0.2)'
                }}
              >
                <button
                  type="button"
                  onClick={handleCalendarPrevMonth}
                  style={{
                    background: 'rgba(255, 107, 0, 0.1)',
                    border: '1px solid rgba(255, 107, 0, 0.25)',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF8C00',
                    cursor: 'pointer'
                  }}
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>

                <span className="font-display" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                  {calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>

                <button
                  type="button"
                  onClick={handleCalendarNextMonth}
                  disabled={
                    calendarMonth.getFullYear() === todayMidnight.getFullYear() &&
                    calendarMonth.getMonth() === todayMidnight.getMonth()
                  }
                  style={{
                    background: 'rgba(255, 107, 0, 0.1)',
                    border: '1px solid rgba(255, 107, 0, 0.25)',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF8C00',
                    cursor:
                      calendarMonth.getFullYear() === todayMidnight.getFullYear() &&
                        calendarMonth.getMonth() === todayMidnight.getMonth()
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      calendarMonth.getFullYear() === todayMidnight.getFullYear() &&
                        calendarMonth.getMonth() === todayMidnight.getMonth()
                        ? 0.3
                        : 1
                  }}
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleSelectCalendarDate(todayMidnight)}
                  className="cyber-btn cyber-btn-outline"
                  style={{
                    flex: 1,
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    background: isToday ? 'rgba(255, 107, 0, 0.25)' : 'transparent',
                    borderColor: isToday ? '#FF6B00' : 'var(--border-subtle)'
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date(todayMidnight);
                    y.setDate(y.getDate() - 1);
                    handleSelectCalendarDate(y);
                  }}
                  className="cyber-btn cyber-btn-outline"
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d7 = new Date(todayMidnight);
                    d7.setDate(d7.getDate() - 7);
                    handleSelectCalendarDate(d7);
                  }}
                  className="cyber-btn cyber-btn-outline"
                  style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                >
                  7 Days Ago
                </button>
              </div>

              {/* Weekday Column Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  textAlign: 'center',
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem'
                }}
              >
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
                <span>Su</span>
              </div>

              {/* Calendar Days Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '4px'
                }}
              >
                {calendarDays.map((dObj, idx) => {
                  if (!dObj.isCurrentMonth) {
                    return (
                      <div
                        key={idx}
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.15)',
                          userSelect: 'none'
                        }}
                      >
                        {dObj.day}
                      </div>
                    );
                  }

                  if (dObj.isFuture) {
                    return (
                      <div
                        key={idx}
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.2)',
                          cursor: 'not-allowed',
                          userSelect: 'none'
                        }}
                        title="Future dates unavailable"
                      >
                        {dObj.day}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCalendarDate(dObj.date)}
                      style={{
                        height: '34px',
                        borderRadius: 'var(--radius-sm)',
                        background: dObj.isSelected
                          ? 'linear-gradient(135deg, #FF6B00 0%, #FF3B30 100%)'
                          : dObj.isTodayDate
                            ? 'rgba(255, 107, 0, 0.2)'
                            : 'transparent',
                        border: dObj.isSelected
                          ? '1px solid #FF8C00'
                          : dObj.isTodayDate
                            ? '1px solid rgba(255, 107, 0, 0.45)'
                            : '1px solid transparent',
                        color: dObj.isSelected ? '#fff' : dObj.isTodayDate ? '#FF8C00' : '#E2E8F0',
                        fontWeight: dObj.isSelected || dObj.isTodayDate ? 700 : 500,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: dObj.isSelected ? '0 0 12px rgba(255, 107, 0, 0.6)' : 'none',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {dObj.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified 3-Segment Horizontal Gas Metric Ribbon (Fire Theme) */}
      {!isLoading && !fetchError && consumptionList.length > 0 && hasGasConfigured && (
        <div
          className="cyber-card"
          style={{
            padding: '0.85rem 1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            alignItems: 'center',
            borderRadius: 'var(--radius-lg)',
            borderColor: 'rgba(255, 107, 0, 0.4)',
            boxShadow: '0 0 24px -4px rgba(255, 107, 0, 0.25)'
          }}
        >
          {/* Segment 1: Day Total Gas Thermal Energy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Flame size={14} color="#FF6B00" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                {metrics.totalKwh}
              </span>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                kWh
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Est: </span>
                <strong style={{ color: '#fff' }}>{metrics.totalCostWithStanding}</strong>
              </div>
              <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                inc. {gasStandingCharge}p
              </div>
            </div>
          </div>

          {/* Segment 2: Gas Volume in m³ */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              borderLeft: '1px solid rgba(255, 107, 0, 0.25)',
              paddingLeft: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Gauge size={14} color="#FF8C00" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Gas Volume
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FF8C00' }}>
                {metrics.totalM3}
              </span>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                m³
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Cost: </span>
                <strong style={{ color: '#FF8C00' }}>{metrics.energyCost}</strong>
              </div>
              <div className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                CV: 39.5
              </div>
            </div>
          </div>

          {/* Segment 3: Gas Tariff Rate */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              borderLeft: '1px solid rgba(255, 107, 0, 0.25)',
              paddingLeft: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Coins size={14} color="#FFB800" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tariff
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFB800' }}>
                {gasStandardRate}
              </span>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                p/kWh
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Standing: </span>
                <strong style={{ color: '#FFB800' }}>{gasStandingCharge}p/day</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Gas Consumption Telemetry & Half-Hourly Vector Panel */}
      {hasGasConfigured && (
        <div
          className="cyber-card"
          style={{
            borderColor: 'rgba(255, 107, 0, 0.4)',
            boxShadow: '0 0 28px -4px rgba(255, 107, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="#FF6B00" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Half-Hourly Gas Consumption Vector
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                className="cyber-badge"
                style={{
                  background: 'rgba(255, 107, 0, 0.15)',
                  color: '#FF8C00',
                  borderColor: 'rgba(255, 107, 0, 0.35)'
                }}
              >
                {metrics.count > 0 ? `${metrics.count} PERIODS` : 'GAS FEED'}
              </span>
            </div>
          </div>

          {/* Fixed-Height, Single-Row Gas Telemetry Status Bar */}
          {!isLoading && !fetchError && consumptionList.length > 0 && (
            <div
              style={{
                height: '38px',
                minHeight: '38px',
                maxHeight: '38px',
                padding: '0 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(18, 10, 6, 0.6)',
                border: '1px solid rgba(255, 107, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              {/* Left Slot Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Flame size={14} color="#FF8C00" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: inspectedItem ? '#fff' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inspectedItem
                    ? `Slot #${inspectedItem.index} • ${inspectedItem.timeWindow}`
                    : 'Hover over a bar to view gas volume & cost'}
                </span>
              </div>

              {/* Right Value & Price */}
              <div className="font-mono" style={{ fontSize: '0.825rem', fontWeight: 700, flexShrink: 0 }}>
                {inspectedItem ? (
                  <span style={{ color: '#FF8C00' }}>
                    {inspectedItem.valM3} m³ (~{inspectedItem.valKwh} kWh) • {inspectedItem.costFormatted}
                  </span>
                ) : (
                  <span style={{ color: '#FF8C00', fontWeight: 600 }}>
                    Day Est: {metrics.totalCostWithStanding}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Loading Spinner View */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3.5rem 1rem',
                gap: '1rem'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '3px solid rgba(255, 107, 0, 0.2)',
                  borderTopColor: '#FF6B00',
                  animation: 'spin 0.8s linear infinite',
                  boxShadow: '0 0 15px rgba(255, 107, 0, 0.35)'
                }}
              />
              <div className="font-mono" style={{ fontSize: '0.85rem', color: '#FF8C00', letterSpacing: '0.05em' }}>
                FETCHING GAS CONSUMPTION DATA FROM OCTOPUS API...
              </div>
            </div>
          )}

          {/* Error View */}
          {!isLoading && fetchError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
                textAlign: 'center'
              }}
            >
              <AlertCircle size={28} color="#EF4444" />
              <div>
                <div style={{ fontWeight: 700, color: '#FCA5A5', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Failed to retrieve gas telemetry
                </div>
                <div style={{ fontSize: '0.825rem', color: '#F87171', maxWidth: '480px' }}>
                  {fetchError}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={fetchGasConsumption}
                  className="cyber-btn cyber-btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Retry Query</span>
                </button>
                <NavLink
                  to="/settings"
                  className="cyber-btn"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem',
                    background: 'linear-gradient(135deg, #FF6B00 0%, #FF3B30 100%)',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  <Settings size={14} />
                  <span>Verify Gas MPRN in Settings</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* No Data for this date message */}
          {!isLoading && !fetchError && consumptionList.length === 0 && (
            <div
              style={{
                padding: '3rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '0.85rem'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255, 107, 0, 0.1)',
                  border: '1px solid rgba(255, 107, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Info size={22} color="#FF8C00" />
              </div>
              <div style={{ maxWidth: '440px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                  No Gas Readings Recorded for This Date
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {isToday
                    ? "Today's smart gas meter readings are typically transmitted by Octopus once a day in settlement batches. Try picking Yesterday or past dates from the calendar above."
                    : 'Smart gas meter half-hourly readings were not returned by Octopus for this selected date.'}
                </p>
              </div>
              {isToday && (
                <button
                  type="button"
                  onClick={() => {
                    const y = new Date(todayMidnight);
                    y.setDate(y.getDate() - 1);
                    handleSelectCalendarDate(y);
                  }}
                  className="cyber-btn"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.5rem 1rem',
                    marginTop: '0.5rem',
                    background: 'linear-gradient(135deg, #FF6B00 0%, #FF3B30 100%)',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  <CalendarIcon size={14} />
                  <span>View Yesterday's Gas Data</span>
                </button>
              )}
            </div>
          )}

          {/* Horizontal Scrollable Half-Hourly Gas Bar Chart (Fire Theme) */}
          {!isLoading && !fetchError && consumptionList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: '1rem',
                  paddingTop: '1.5rem',
                  paddingLeft: '1rem',
                  paddingRight: '1rem'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px',
                    height: '210px',
                    minWidth: `${Math.max(consumptionList.length * 28, 980)}px`,
                    padding: '0 0.5rem 0.5rem 0.5rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    position: 'relative'
                  }}
                >
                  {consumptionList.map((item, idx) => {
                    const valM3 = parseFloat(item.consumption) || 0;
                    const valKwh = valM3 * M3_TO_KWH;
                    const heightPercent = Math.min(100, Math.max(6, (valM3 / maxValForScale) * 100));

                    const startDate = new Date(item.interval_start);
                    const timeLabel = startDate.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const isHovered = activeHoverBar === idx;
                    const barColor = isHovered ? '#FFA500' : '#FF6B00';

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setActiveHoverBar(idx)}
                        onMouseLeave={() => setActiveHoverBar(null)}
                        onTouchStart={() => setActiveHoverBar(idx)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.4rem',
                          height: '100%',
                          justifyContent: 'flex-end',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        {/* Small value readout above bar */}
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.625rem',
                            color: isHovered ? '#FFB800' : 'var(--text-secondary)',
                            fontWeight: isHovered ? 700 : 500,
                            opacity: isHovered ? 1 : 0.85
                          }}
                        >
                          {valM3.toFixed(2)}
                        </span>

                        {/* Animated Glowing Fire Bar */}
                        <div
                          style={{
                            width: '100%',
                            minWidth: '16px',
                            maxWidth: '32px',
                            height: `${heightPercent}%`,
                            background: isHovered
                              ? 'linear-gradient(180deg, #FFA500 0%, rgba(255, 107, 0, 0.4) 100%)'
                              : 'linear-gradient(180deg, #FF6B00 0%, rgba(255, 59, 48, 0.25) 100%)',
                            borderRadius: '5px 5px 2px 2px',
                            borderTop: `2px solid ${barColor}`,
                            boxShadow: isHovered
                              ? '0 0 16px rgba(255, 140, 0, 0.8)'
                              : '0 0 8px rgba(255, 107, 0, 0.3)',
                            transition: 'height 0.3s ease, transform 0.2s ease',
                            transform: isHovered ? 'scaleY(1.03)' : 'none'
                          }}
                        />

                        {/* Time slot label under bar */}
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.625rem',
                            color: isHovered ? '#fff' : 'var(--text-muted)',
                            fontWeight: isHovered ? 700 : 400
                          }}
                        >
                          {timeLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF6B00', display: 'inline-block' }} />
                    <span style={{ color: '#FF8C00' }}>Gas Rate ({gasStandardRate}p / kWh)</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>CV: 39.5 MJ/m³</span>
                  </span>
                </div>
                <NavLink to="/settings" style={{ color: '#FF8C00', textDecoration: 'none', fontSize: '0.725rem' }}>
                  Edit Rates in Settings →
                </NavLink>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stylish Half-Hourly Gas Interval Log (List View Panel - Fire Theme) */}
      {!isLoading && !fetchError && consumptionList.length > 0 && hasGasConfigured && (
        <div
          className="cyber-card"
          style={{
            borderColor: 'rgba(255, 107, 0, 0.4)',
            boxShadow: '0 0 24px -4px rgba(255, 107, 0, 0.25)'
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid rgba(255, 107, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListFilter size={18} color="#FF6B00" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Half-Hourly Gas Interval Log
              </h2>
              <span
                className="cyber-badge"
                style={{
                  marginLeft: '0.25rem',
                  background: 'rgba(255, 107, 0, 0.15)',
                  color: '#FF8C00',
                  borderColor: 'rgba(255, 107, 0, 0.35)'
                }}
              >
                {consumptionList.length} SLOTS
              </span>
            </div>
          </div>

          {/* List Rows Container */}
          <div
            style={{
              maxHeight: '550px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.35rem'
            }}
          >
            {consumptionList.map((item, idx) => {
              const valM3 = parseFloat(item.consumption) || 0;
              const valKwh = valM3 * M3_TO_KWH;
              const barPercent = Math.min(100, Math.max(4, (valM3 / maxValForScale) * 100));
              const isHovered = activeHoverBar === idx;

              const start = new Date(item.interval_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              const costPence = valKwh * gasStandardRate;
              const costFormatted = formatSlotCost(costPence);

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setActiveHoverBar(idx)}
                  onMouseLeave={() => setActiveHoverBar(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: isHovered
                      ? 'rgba(255, 107, 0, 0.15)'
                      : 'rgba(18, 10, 6, 0.45)',
                    border: `1px solid ${isHovered
                      ? 'rgba(255, 107, 0, 0.5)'
                      : 'rgba(255, 107, 0, 0.15)'
                      }`,
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer'
                  }}
                >
                  {/* Slot Number & Start Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '100px' }}>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.725rem',
                        color: 'var(--text-muted)',
                        width: '24px'
                      }}
                    >
                      #{idx + 1}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color="#FF8C00" />
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                        {start}
                      </span>
                    </div>
                  </div>

                  {/* Gas Badge */}
                  <div style={{ flexShrink: 0 }}>
                    <span
                      className="cyber-badge"
                      style={{
                        fontSize: '0.675rem',
                        padding: '0.15rem 0.5rem',
                        background: 'rgba(255, 107, 0, 0.12)',
                        color: '#FF8C00',
                        borderColor: 'rgba(255, 107, 0, 0.3)'
                      }}
                    >
                      GAS
                    </span>
                  </div>

                  {/* Mini Relative Visual Energy Meter Bar */}
                  <div
                    style={{
                      flex: 1,
                      maxWidth: '160px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: `${barPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #FF6B00, #FFA500)',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: '0 0 6px rgba(255, 107, 0, 0.5)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  {/* Reading Value in m³ and kWh + Price */}
                  <div style={{ textAlign: 'right', minWidth: '110px', flexShrink: 0 }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#FF8C00'
                      }}
                    >
                      {valM3.toFixed(3)} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>m³</span>
                      <span style={{ fontSize: '0.75rem', color: '#CBD5E1', marginLeft: '0.35rem' }}>({valKwh.toFixed(2)} kWh)</span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
                      {costFormatted}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .flame-calendar-trigger-btn:hover {
          background: rgba(255, 107, 0, 0.24) !important;
          border-color: rgba(255, 107, 0, 0.6) !important;
          box-shadow: 0 0 25px rgba(255, 107, 0, 0.45) !important;
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GasPage;
