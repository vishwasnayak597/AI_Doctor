import React, { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface TimeSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface DoctorScheduleCalendarProps {
  availability: TimeSlot[];
  appointments: any[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const statusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled':
    case 'no-show': return 'bg-red-100 text-red-700';
    case 'confirmed':
    case 'in-progress': return 'bg-blue-100 text-blue-800';
    default: return 'bg-yellow-100 text-yellow-800'; // scheduled / pending
  }
};

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Doctor schedule calendar with Week / Month views and navigation.
 * Shows recurring weekly availability and booked appointments for each day.
 */
const DoctorScheduleCalendar: React.FC<DoctorScheduleCalendarProps> = ({
  availability,
  appointments
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  const today = new Date();
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const appointmentsForDate = (date: Date) =>
    safeAppointments
      .filter((apt: any) => sameDay(new Date(apt.appointmentDate), date))
      .sort(
        (a: any, b: any) =>
          new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      );

  const availabilityForDate = (date: Date): TimeSlot | undefined =>
    availability?.find((slot) => slot.dayOfWeek === date.getDay());

  // --- navigation ---
  const navigate = (direction: -1 | 1) => {
    const next = new Date(referenceDate);
    if (viewMode === 'week') {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setMonth(next.getMonth() + direction);
    }
    setReferenceDate(next);
  };

  const goToToday = () => setReferenceDate(new Date());

  // --- build the days for the active view ---
  const getWeekDays = (): Date[] => {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const getMonthCells = (): Array<Date | null> => {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = firstOfMonth.getDay(); // empty cells before day 1

    const cells: Array<Date | null> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null); // trailing blanks
    return cells;
  };

  const headerTitle = (): string => {
    if (viewMode === 'week') {
      const days = getWeekDays();
      const start = days[0];
      const end = days[6];
      const startStr = `${MONTH_NAMES[start.getMonth()].slice(0, 3)} ${start.getDate()}`;
      const endStr = `${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
      return `${startStr} – ${endStr}`;
    }
    return `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
  };

  return (
    <div>
      {/* Header: title + view toggle + navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2" />
          {headerTitle()}
        </h3>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            {(['week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
            title={viewMode === 'week' ? 'Previous week' : 'Previous month'}
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
            title={viewMode === 'week' ? 'Next week' : 'Next month'}
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {viewMode === 'week' ? (
        /* ---------- WEEK VIEW ---------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {getWeekDays().map((date) => {
            const slot = availabilityForDate(date);
            const dayAppointments = appointmentsForDate(date);
            const isToday = sameDay(date, today);
            return (
              <div
                key={date.toISOString()}
                className={`rounded-lg border p-3 min-h-[120px] flex flex-col ${
                  isToday ? 'border-blue-500 ring-1 ring-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">{DAY_LABELS[date.getDay()]}</span>
                  <span className={`text-xs ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </span>
                </div>

                {slot?.isAvailable ? (
                  <span className="text-[11px] text-green-600 mb-2">{slot.startTime}–{slot.endTime}</span>
                ) : (
                  <span className="text-[11px] text-gray-400 italic mb-2">Unavailable</span>
                )}

                <div className="flex-1 space-y-1">
                  {dayAppointments.length === 0 ? (
                    <span className="text-[11px] text-gray-300">No appointments</span>
                  ) : (
                    dayAppointments.map((apt: any) => (
                      <div
                        key={apt._id}
                        className={`text-[11px] px-1.5 py-1 rounded truncate ${statusColor(apt.status)}`}
                        title={`${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''} — ${apt.status}`}
                      >
                        {formatTime(apt.appointmentDate)} {apt.patient?.firstName || 'Patient'}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------- MONTH VIEW ---------- */
        <div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
            {DAY_LABELS.map((label) => (
              <div key={label} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-600">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
            {getMonthCells().map((date, idx) => {
              if (!date) {
                return <div key={`blank-${idx}`} className="bg-gray-50 min-h-[88px]" />;
              }
              const slot = availabilityForDate(date);
              const dayAppointments = appointmentsForDate(date);
              const isToday = sameDay(date, today);
              return (
                <div
                  key={date.toISOString()}
                  className={`bg-white min-h-[88px] p-1.5 flex flex-col ${isToday ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                      {date.getDate()}
                    </span>
                    {slot?.isAvailable && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Available" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayAppointments.slice(0, 2).map((apt: any) => (
                      <div
                        key={apt._id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${statusColor(apt.status)}`}
                        title={`${formatTime(apt.appointmentDate)} — ${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''} (${apt.status})`}
                      >
                        {formatTime(apt.appointmentDate)} {apt.patient?.firstName || 'Patient'}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <span className="text-[10px] text-gray-500">+{dayAppointments.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorScheduleCalendar;
