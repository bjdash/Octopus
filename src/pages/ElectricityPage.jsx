import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Zap,
  ShieldCheck,
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
  ChevronDown
} from 'lucide-react';
import { useOctopus } from '../context/OctopusContext';

// Helper to check if an interval start falls in the off-peak window: 00:30 to 05:30
const isOffPeakInterval = (dateString) => {
  const d = new Date(dateString);
  const minutesFromMidnight = d.getHours() * 60 + d.getMinutes();
  // 00:30 is 30 mins, 05:30 is 330 mins.
  return minutesFromMidnight >= 30 && minutesFromMidnight < 330;
};

// Format cost in p or £
const formatSlotCost = (costPence) => {
  if (costPence < 100) {
    return `${costPence.toFixed(1)}p`;
  }
  return `£${(costPence / 100).toFixed(2)}`;
};

export const ElectricityPage = () => {
  const { credentials, isConfigured } = useOctopus();

  // Tariff rate numbers (defaults: 4.99p off-peak, 27.05p standard, 56.6p standing)
  const offPeakRate = useMemo(() => parseFloat(credentials.offPeakRate) || 4.99, [credentials.offPeakRate]);
  const standardRate = useMemo(() => parseFloat(credentials.standardRate) || 27.05, [credentials.standardRate]);
  const standingCharge = useMemo(() => parseFloat(credentials.standingCharge) || 56.6, [credentials.standingCharge]);

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
  const [listFilter, setListFilter] = useState('ALL'); // 'ALL' | 'OFF_PEAK' | 'STANDARD'

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

  // Fetch consumption data from Octopus Energy API
  const fetchConsumption = useCallback(async () => {
    if (!credentials.apiKey || !credentials.electricMpan || !credentials.electricSerial) {
      setFetchError('Octopus API credentials or Electricity meter numbers missing.');
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

      const mpan = encodeURIComponent(credentials.electricMpan.trim());
      const serial = encodeURIComponent(credentials.electricSerial.trim());
      const url = `https://api.octopus.energy/v1/electricity-meter-points/${mpan}/meters/${serial}/consumption/?period_from=${periodFrom}&period_to=${periodTo}&page_size=100&order_by=period`;

      const authHeader = 'Basic ' + btoa(credentials.apiKey.trim() + ':');

      const response = await fetch(url, {
        headers: {
          Authorization: authHeader
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Unauthorized: Invalid Octopus API Key or meter permissions.');
        } else if (response.status === 404) {
          throw new Error('Meter not found: Please verify your Electricity MPAN and Serial Number in Settings.');
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

      // Sort chronologically ascending (00:00 -> 23:30)
      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(a.interval_start).getTime() - new Date(b.interval_start).getTime()
      );

      setConsumptionList(sorted);
    } catch (err) {
      console.error('Error fetching electricity consumption:', err);
      setFetchError(err.message || 'Failed to fetch consumption telemetry.');
      setConsumptionList([]);
    } finally {
      setIsLoading(false);
    }
  }, [credentials, selectedDate]);

  useEffect(() => {
    if (isConfigured) {
      fetchConsumption();
    }
  }, [fetchConsumption, isConfigured]);

  // Aggregate Metrics & Price Computations for the selected date
  const metrics = useMemo(() => {
    if (!consumptionList || consumptionList.length === 0) {
      return {
        totalKwh: '0.000',
        offPeakKwh: '0.000',
        standardKwh: '0.000',
        offPeakCost: '£0.00',
        standardCost: '£0.00',
        energyCost: '£0.00',
        totalCostWithStanding: '£0.00',
        count: 0
      };
    }

    let total = 0;
    let offPeak = 0;

    consumptionList.forEach((item) => {
      const val = parseFloat(item.consumption) || 0;
      total += val;
      if (isOffPeakInterval(item.interval_start)) {
        offPeak += val;
      }
    });

    const standard = Math.max(0, total - offPeak);

    const offPeakCostPence = offPeak * offPeakRate;
    const standardCostPence = standard * standardRate;
    const energyCostPence = offPeakCostPence + standardCostPence;
    const totalWithStandingPence = energyCostPence + standingCharge;

    return {
      totalKwh: total.toFixed(3),
      offPeakKwh: offPeak.toFixed(3),
      standardKwh: standard.toFixed(3),
      offPeakCost: `£${(offPeakCostPence / 100).toFixed(2)}`,
      standardCost: `£${(standardCostPence / 100).toFixed(2)}`,
      energyCost: `£${(energyCostPence / 100).toFixed(2)}`,
      totalCostWithStanding: `£${(totalWithStandingPence / 100).toFixed(2)}`,
      count: consumptionList.length
    };
  }, [consumptionList, offPeakRate, standardRate, standingCharge]);

  // Max value for bar height and progress bar scaling
  const maxValForScale = useMemo(() => {
    if (!consumptionList || consumptionList.length === 0) return 0.2;
    const maxInList = Math.max(...consumptionList.map((c) => parseFloat(c.consumption) || 0));
    return Math.max(maxInList * 1.15, 0.1);
  }, [consumptionList]);

  // Active inspected item (hovered)
  const inspectedItem = useMemo(() => {
    if (activeHoverBar !== null && consumptionList[activeHoverBar]) {
      const item = consumptionList[activeHoverBar];
      const val = parseFloat(item.consumption) || 0;
      const start = new Date(item.interval_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(item.interval_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const isOffPeak = isOffPeakInterval(item.interval_start);

      const rate = isOffPeak ? offPeakRate : standardRate;
      const costPence = val * rate;
      const costFormatted = formatSlotCost(costPence);

      return {
        val: val.toFixed(3),
        timeWindow: `${start} – ${end}`,
        start,
        isOffPeak,
        costFormatted,
        index: activeHoverBar + 1
      };
    }
    return null;
  }, [activeHoverBar, consumptionList, offPeakRate, standardRate]);

  // Filtered list for list view
  const filteredList = useMemo(() => {
    return consumptionList
      .map((item, idx) => {
        const val = parseFloat(item.consumption) || 0;
        const start = new Date(item.interval_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const isOffPeak = isOffPeakInterval(item.interval_start);

        const rate = isOffPeak ? offPeakRate : standardRate;
        const costPence = val * rate;
        const costFormatted = formatSlotCost(costPence);

        return {
          raw: item,
          val,
          valFormatted: val.toFixed(3),
          start,
          isOffPeak,
          costFormatted,
          slotNumber: idx + 1,
          originalIndex: idx
        };
      })
      .filter((item) => {
        if (listFilter === 'OFF_PEAK') return item.isOffPeak;
        if (listFilter === 'STANDARD') return !item.isOffPeak;
        return true;
      });
  }, [consumptionList, listFilter, offPeakRate, standardRate]);

  // Calendar date selection handlers
  const handleSelectCalendarDate = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    if (normalized.getTime() > todayMidnight.getTime()) return; // Disallow future dates
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

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
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

    // Next month padding to fill complete weeks
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
              Electricity Telemetry
            </h1>
            <span className="cyber-badge cyber-badge-blue">LIVE GRID</span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchConsumption}
          disabled={isLoading}
          className="cyber-btn cyber-btn-outline"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}
          title="Refresh Data from Octopus API"
        >
          <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
          <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Date Switcher - Calendar View Popover Dock */}
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
          className="cyber-badge cyber-badge-blue calendar-trigger-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '440px',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: isCalendarOpen ? 'rgba(0, 210, 255, 0.18)' : 'rgba(10, 16, 36, 0.88)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${isCalendarOpen ? 'rgba(0, 210, 255, 0.6)' : 'rgba(0, 210, 255, 0.35)'}`,
            boxShadow: isCalendarOpen
              ? '0 0 24px rgba(0, 210, 255, 0.4)'
              : '0 0 20px -2px rgba(0, 210, 255, 0.25)',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
          title="Click to open calendar and select any date"
          aria-expanded={isCalendarOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarIcon size={18} color="var(--accent-blue-bright)" />
            <span style={{ fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
              {formattedDateLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-blue-bright)' }}>
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Select Date</span>
            <ChevronDown size={16} style={{ transform: isCalendarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </div>
        </button>

        {/* Cyber Calendar Dropdown Modal / Popover */}
        {isCalendarOpen && (
          <div
            className="cyber-card cyber-card-blue-glow"
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              width: '100%',
              maxWidth: '380px',
              zIndex: 100,
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(6, 10, 24, 0.98)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(0, 210, 255, 0.4)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 210, 255, 0.25)',
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
                borderBottom: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                onClick={handleCalendarPrevMonth}
                style={{
                  background: 'rgba(0, 210, 255, 0.1)',
                  border: '1px solid rgba(0, 210, 255, 0.25)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-blue-bright)',
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
                  background: 'rgba(0, 210, 255, 0.1)',
                  border: '1px solid rgba(0, 210, 255, 0.25)',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-blue-bright)',
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
                  background: isToday ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  borderColor: isToday ? 'var(--accent-blue)' : 'var(--border-subtle)'
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
                        ? 'linear-gradient(135deg, #00D2FF 0%, #0066FF 100%)'
                        : dObj.isTodayDate
                        ? 'rgba(0, 210, 255, 0.15)'
                        : 'transparent',
                      border: dObj.isSelected
                        ? '1px solid #00D2FF'
                        : dObj.isTodayDate
                        ? '1px solid rgba(0, 210, 255, 0.4)'
                        : '1px solid transparent',
                      color: dObj.isSelected ? '#fff' : dObj.isTodayDate ? 'var(--accent-blue-bright)' : '#E2E8F0',
                      fontWeight: dObj.isSelected || dObj.isTodayDate ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: dObj.isSelected ? '0 0 10px rgba(0, 210, 255, 0.6)' : 'none',
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

      {/* Main Consumption Telemetry & Half-Hourly Vector Panel */}
      <div className="cyber-card cyber-card-blue-glow">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="var(--accent-blue)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Half-Hourly Consumption Vector
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="cyber-badge cyber-badge-cyan">
              {metrics.count > 0 ? `${metrics.count} PERIODS` : 'TELEMETRY FEED'}
            </span>
          </div>
        </div>

        {/* Selected Day Stats Bar with Uncluttered Price Breakdown */}
        {!isLoading && !fetchError && consumptionList.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              background: 'rgba(8, 12, 28, 0.75)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem'
            }}
          >
            {/* Day Total & Est Cost */}
            <div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Day Total Energy
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
                  {metrics.totalKwh}
                </span>
                <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-blue-bright)' }}>
                  kWh
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Est: <strong style={{ color: '#fff' }}>{metrics.totalCostWithStanding}</strong> <span style={{ fontSize: '0.675rem', opacity: 0.8 }}>(inc. {standingCharge}p standing)</span>
              </div>
            </div>

            {/* Off-Peak Energy & Cost */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                <Clock size={12} />
                <span>Off-Peak (00:30 – 05:30)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10B981' }}>
                  {metrics.offPeakKwh}
                </span>
                <span className="font-mono" style={{ fontSize: '0.8rem', color: '#A7F3D0' }}>
                  kWh
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#A7F3D0', marginTop: '0.2rem' }}>
                Cost: <strong style={{ color: '#10B981' }}>{metrics.offPeakCost}</strong> <span style={{ fontSize: '0.675rem', opacity: 0.8 }}>(@{offPeakRate}p)</span>
              </div>
            </div>

            {/* Standard Energy & Cost */}
            <div>
              <div style={{ fontSize: '0.725rem', color: 'var(--accent-blue-bright)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Standard Energy
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-blue-bright)' }}>
                  {metrics.standardKwh}
                </span>
                <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  kWh
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Cost: <strong style={{ color: '#fff' }}>{metrics.standardCost}</strong> <span style={{ fontSize: '0.675rem', opacity: 0.8 }}>(@{standardRate}p)</span>
              </div>
            </div>
          </div>
        )}

        {/* Simplified, Fixed-Height, Single-Row Telemetry Status Bar with Cost */}
        {!isLoading && !fetchError && consumptionList.length > 0 && (
          <div
            style={{
              height: '38px',
              minHeight: '38px',
              maxHeight: '38px',
              padding: '0 0.85rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(8, 12, 28, 0.6)',
              border: '1px solid var(--border-subtle)',
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
              <Zap
                size={14}
                color={inspectedItem ? (inspectedItem.isOffPeak ? '#10B981' : 'var(--accent-blue-bright)') : 'var(--accent-blue-bright)'}
                style={{ flexShrink: 0 }}
              />
              <span style={{ fontSize: '0.8rem', color: inspectedItem ? '#fff' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {inspectedItem
                  ? `Slot #${inspectedItem.index} • ${inspectedItem.timeWindow} ${inspectedItem.isOffPeak ? '(Off-Peak)' : ''}`
                  : 'Hover over a bar to view reading & cost'}
              </span>
            </div>

            {/* Right Value & Price */}
            <div className="font-mono" style={{ fontSize: '0.825rem', fontWeight: 700, flexShrink: 0 }}>
              {inspectedItem ? (
                <span style={{ color: inspectedItem.isOffPeak ? '#10B981' : 'var(--accent-blue-bright)' }}>
                  {inspectedItem.val} kWh • {inspectedItem.costFormatted}
                </span>
              ) : (
                <span style={{ color: 'var(--accent-blue-bright)', fontWeight: 600 }}>
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
                border: '3px solid rgba(0, 210, 255, 0.2)',
                borderTopColor: '#00D2FF',
                animation: 'spin 0.8s linear infinite',
                boxShadow: '0 0 15px rgba(0, 210, 255, 0.3)'
              }}
            />
            <div className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--accent-blue-bright)', letterSpacing: '0.05em' }}>
              FETCHING CONSUMPTION DATA FROM OCTOPUS API...
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
                Failed to retrieve telemetry
              </div>
              <div style={{ fontSize: '0.825rem', color: '#F87171', maxWidth: '480px' }}>
                {fetchError}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={fetchConsumption}
                className="cyber-btn cyber-btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <RefreshCw size={14} />
                <span>Retry Query</span>
              </button>
              <NavLink
                to="/settings"
                className="cyber-btn cyber-btn-blue"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                <Settings size={14} />
                <span>Verify Credentials in Settings</span>
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
                background: 'rgba(0, 210, 255, 0.1)',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Info size={22} color="var(--accent-blue-bright)" />
            </div>
            <div style={{ maxWidth: '440px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
                No Meter Readings Recorded for This Date
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {isToday
                  ? "Today's smart meter readings are usually transmitted by Octopus overnight or in daily settlement batches. Try picking Yesterday or previous dates using the calendar picker above."
                  : 'Smart meter half-hourly readings were not returned by Octopus for this selected date.'}
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
                className="cyber-btn cyber-btn-blue"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', marginTop: '0.5rem' }}
              >
                <CalendarIcon size={14} />
                <span>View Yesterday's Data</span>
              </button>
            )}
          </div>
        )}

        {/* Horizontal Scrollable Half-Hourly Bar Chart */}
        {!isLoading && !fetchError && consumptionList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div
              style={{
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: '1rem',
                paddingTop: '3.5rem',
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
                  const val = parseFloat(item.consumption) || 0;
                  const heightPercent = Math.min(100, Math.max(6, (val / maxValForScale) * 100));

                  const startDate = new Date(item.interval_start);
                  const timeLabel = startDate.toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  const isOffPeak = isOffPeakInterval(item.interval_start);
                  const isHovered = activeHoverBar === idx;

                  // Green for Off-Peak (00:30-05:30), Electric Blue for standard
                  const barColor = isOffPeak ? '#10B981' : '#00D2FF';

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
                          color: isOffPeak ? '#10B981' : 'var(--text-secondary)',
                          fontWeight: isOffPeak ? 700 : 500,
                          opacity: isHovered ? 1 : 0.85
                        }}
                      >
                        {val.toFixed(2)}
                      </span>

                      {/* Animated Glowing Bar */}
                      <div
                        style={{
                          width: '100%',
                          minWidth: '16px',
                          maxWidth: '32px',
                          height: `${heightPercent}%`,
                          background: isOffPeak
                            ? 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.25) 100%)'
                            : 'linear-gradient(180deg, #00D2FF 0%, rgba(0, 102, 255, 0.25) 100%)',
                          borderRadius: '5px 5px 2px 2px',
                          borderTop: `2px solid ${barColor}`,
                          boxShadow: isHovered
                            ? `0 0 16px ${barColor}`
                            : isOffPeak
                            ? '0 0 10px rgba(16, 185, 129, 0.4)'
                            : '0 0 8px rgba(0, 210, 255, 0.25)',
                          transition: 'height 0.3s ease, transform 0.2s ease',
                          transform: isHovered ? 'scaleY(1.03)' : 'none'
                        }}
                      />

                      {/* Time slot label under bar */}
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '0.625rem',
                          color: isHovered ? '#fff' : isOffPeak ? '#A7F3D0' : 'var(--text-muted)',
                          fontWeight: isHovered || isOffPeak ? 700 : 400
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
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  <span style={{ color: '#10B981' }}>Off-Peak ({offPeakRate}p)</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00D2FF', display: 'inline-block' }} />
                  <span>Standard ({standardRate}p)</span>
                </span>
              </div>
              <NavLink to="/settings" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.725rem' }}>
                Edit Rates in Settings →
              </NavLink>
            </div>
          </div>
        )}
      </div>

      {/* Stylish Half-Hourly Consumption Breakdown (List View Panel) */}
      {!isLoading && !fetchError && consumptionList.length > 0 && (
        <div className="cyber-card cyber-card-blue-glow">
          {/* Card Header with Filter Tabs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '1.25rem',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ListFilter size={18} color="var(--accent-blue)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Half-Hourly Interval Log
              </h2>
              <span className="cyber-badge cyber-badge-cyan" style={{ marginLeft: '0.25rem' }}>
                {filteredList.length} SLOTS
              </span>
            </div>

            {/* Quick Filter Pill Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(8, 12, 28, 0.8)', padding: '0.25rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setListFilter('ALL')}
                style={{
                  background: listFilter === 'ALL' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  border: listFilter === 'ALL' ? '1px solid rgba(0, 210, 255, 0.4)' : '1px solid transparent',
                  color: listFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                All ({consumptionList.length})
              </button>

              <button
                type="button"
                onClick={() => setListFilter('OFF_PEAK')}
                style={{
                  background: listFilter === 'OFF_PEAK' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  border: listFilter === 'OFF_PEAK' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  color: listFilter === 'OFF_PEAK' ? '#A7F3D0' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                Off-Peak ({consumptionList.filter(c => isOffPeakInterval(c.interval_start)).length})
              </button>

              <button
                type="button"
                onClick={() => setListFilter('STANDARD')}
                style={{
                  background: listFilter === 'STANDARD' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                  border: listFilter === 'STANDARD' ? '1px solid rgba(0, 210, 255, 0.4)' : '1px solid transparent',
                  color: listFilter === 'STANDARD' ? 'var(--accent-blue-bright)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                Standard ({consumptionList.filter(c => !isOffPeakInterval(c.interval_start)).length})
              </button>
            </div>
          </div>

          {/* List Rows Container with Sleek Scrollbar */}
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
            {filteredList.map((item) => {
              const barPercent = Math.min(100, Math.max(4, (item.val / maxValForScale) * 100));
              const isHovered = activeHoverBar === item.originalIndex;

              return (
                <div
                  key={item.slotNumber}
                  onMouseEnter={() => setActiveHoverBar(item.originalIndex)}
                  onMouseLeave={() => setActiveHoverBar(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: isHovered
                      ? 'rgba(0, 210, 255, 0.12)'
                      : item.isOffPeak
                      ? 'rgba(16, 185, 129, 0.05)'
                      : 'rgba(8, 12, 28, 0.45)',
                    border: `1px solid ${
                      isHovered
                        ? 'rgba(0, 210, 255, 0.4)'
                        : item.isOffPeak
                        ? 'rgba(16, 185, 129, 0.18)'
                        : 'var(--border-subtle)'
                    }`,
                    transition: 'all var(--transition-fast)',
                    cursor: 'pointer'
                  }}
                >
                  {/* Slot Number & Start Time Only */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '100px' }}>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.725rem',
                        color: 'var(--text-muted)',
                        width: '24px'
                      }}
                    >
                      #{item.slotNumber}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} color={item.isOffPeak ? '#10B981' : 'var(--accent-blue-bright)'} />
                      <span className="font-mono" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                        {item.start}
                      </span>
                    </div>
                  </div>

                  {/* Tariff Type Badge */}
                  <div style={{ flexShrink: 0 }}>
                    <span
                      className={`cyber-badge ${item.isOffPeak ? 'cyber-badge-emerald' : 'cyber-badge-blue'}`}
                      style={{ fontSize: '0.675rem', padding: '0.15rem 0.5rem' }}
                    >
                      {item.isOffPeak ? 'OFF-PEAK' : 'STANDARD'}
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
                        background: item.isOffPeak
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : 'linear-gradient(90deg, #00D2FF, #0066FF)',
                        borderRadius: 'var(--radius-full)',
                        boxShadow: item.isOffPeak ? '0 0 6px rgba(16, 185, 129, 0.5)' : '0 0 6px rgba(0, 210, 255, 0.5)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  {/* Reading Value in kWh and Price */}
                  <div style={{ textAlign: 'right', minWidth: '95px', flexShrink: 0 }}>
                    <div
                      className="font-mono"
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: item.isOffPeak ? '#10B981' : 'var(--accent-blue-bright)'
                      }}
                    >
                      {item.valFormatted} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>kWh</span>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
                      {item.costFormatted}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .calendar-trigger-btn:hover {
          background: rgba(0, 210, 255, 0.22) !important;
          border-color: rgba(0, 210, 255, 0.5) !important;
          box-shadow: 0 0 25px rgba(0, 210, 255, 0.4) !important;
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

export default ElectricityPage;
