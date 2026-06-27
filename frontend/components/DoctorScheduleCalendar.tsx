import React, { useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  XMarkIcon
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
  onSave: (availability: TimeSlot[]) => Promise<void> | void;
  saving?: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
 * Shows recurring weekly availability + booked appointments, and lets the
 * doctor click any day to edit that weekday's availability (with options to
 * apply the same hours to the whole week or mark the whole week unavailable).
 */
const DoctorScheduleCalendar: React.FC<DoctorScheduleCalendarProps> = ({
  availability,
  appointments,
  onSave,
  saving = false
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());

  // editing state
  const [editDay, setEditDay] = useState<number | null>(null);
  const [form, setForm] = useState({ isAvailable: false, startTime: '09:00', endTime: '17:00' });

  const today = new Date();
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const appointmentsForDate = (date: Date) =>
    safeAppointments
      .filter((apt: any) => sameDay(new Date(apt.appointmentDate), date))
      .sort(
        (a: any, b: any) =>
          new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
      );

  const slotForDay = (dayOfWeek: number): TimeSlot | undefined =>
    availability?.find((slot) => slot.dayOfWeek === dayOfWeek);

  // --- navigation ---
  const navigate = (direction: -1 | 1) => {
    const next = new Date(referenceDate);
    if (viewMode === 'week') next.setDate(next.getDate() + direction * 7);
    else next.setMonth(next.getMonth() + direction);
    setReferenceDate(next);
  };
  const goToToday = () => setReferenceDate(new Date());

  // --- editing ---
  const openEditor = (date: Date) => {
    const dow = date.getDay();
    const slot = slotForDay(dow);
    setForm({
      isAvailable: slot?.isAvailable ?? false,
      startTime: slot?.startTime || '09:00',
      endTime: slot?.endTime || '17:00'
    });
    setEditDay(dow);
  };

  // Build a full 7-entry availability array from current state, applying a mutator per day
  const buildWeek = (mutator: (i: number, slot: TimeSlot) => TimeSlot): TimeSlot[] =>
    Array.from({ length: 7 }, (_, i) => {
      const existing = slotForDay(i) || { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isAvailable: false };
      return mutator(i, { ...existing, dayOfWeek: i });
    });

  const saveDay = async () => {
    if (editDay === null) return;
    const next = buildWeek((i, slot) =>
      i === editDay ? { dayOfWeek: i, ...form } : slot
    );
    await onSave(next);
    setEditDay(null);
  };

  const applySameHoursToWeek = async () => {
    const next: TimeSlot[] = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: form.startTime,
      endTime: form.endTime,
      isAvailable: true
    }));
    await onSave(next);
    setEditDay(null);
  };

  const markWholeWeekUnavailable = async () => {
    const next = buildWeek((_, slot) => ({ ...slot, isAvailable: false }));
    await onSave(next);
    setEditDay(null);
  };

  // --- view builders ---
  const getWeekDays = (): Date[] => {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - start.getDay());
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
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = new Date(year, month, 1).getDay();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const headerTitle = (): string => {
    if (viewMode === 'week') {
      const days = getWeekDays();
      const s = days[0];
      const e = days[6];
      return `${MONTH_NAMES[s.getMonth()].slice(0, 3)} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()].slice(0, 3)} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2" />
          {headerTitle()}
        </h3>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
            {(['week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  viewMode === mode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50" title="Previous">
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
          <button type="button" onClick={goToToday} className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">
            Today
          </button>
          <button type="button" onClick={() => navigate(1)} className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50" title="Next">
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">Click any day to set its availability.</p>

      {viewMode === 'week' ? (
        /* ---------- WEEK VIEW ---------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {getWeekDays().map((date) => {
            const slot = slotForDay(date.getDay());
            const dayAppointments = appointmentsForDate(date);
            const isToday = sameDay(date, today);
            return (
              <button
                type="button"
                key={date.toISOString()}
                onClick={() => openEditor(date)}
                className={`text-left rounded-lg border p-3 min-h-[120px] flex flex-col transition-colors hover:border-blue-400 hover:shadow-sm ${
                  isToday ? 'border-blue-500 ring-1 ring-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">{DAY_LABELS[date.getDay()]}</span>
                  <span className={`text-xs ${isToday ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>{date.getDate()}</span>
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
              </button>
            );
          })}
        </div>
      ) : (
        /* ---------- MONTH VIEW ---------- */
        <div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-t-lg overflow-hidden">
            {DAY_LABELS.map((label) => (
              <div key={label} className="bg-gray-50 py-2 text-center text-xs font-semibold text-gray-600">{label}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
            {getMonthCells().map((date, idx) => {
              if (!date) return <div key={`blank-${idx}`} className="bg-gray-50 min-h-[88px]" />;
              const slot = slotForDay(date.getDay());
              const dayAppointments = appointmentsForDate(date);
              const isToday = sameDay(date, today);
              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => openEditor(date)}
                  className={`text-left bg-white min-h-[88px] p-1.5 flex flex-col hover:bg-blue-50 transition-colors ${isToday ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${isToday ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>{date.getDate()}</span>
                    {slot?.isAvailable && <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Available" />}
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
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- EDIT MODAL ---------- */}
      {editDay !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <PencilSquareIcon className="h-5 w-5 mr-2 text-blue-600" />
                Edit {DAY_FULL[editDay]} availability
              </h4>
              <button type="button" onClick={() => setEditDay(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-xs text-gray-500">
                Availability is weekly &mdash; this applies to every {DAY_FULL[editDay]}.
              </p>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
                  className="form-checkbox h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Available on {DAY_FULL[editDay]}s</span>
              </label>

              {form.isAvailable && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">From:</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">To:</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Bulk shortcuts */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-xs font-medium text-gray-500">Apply to the whole week:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={applySameHoursToWeek}
                    disabled={saving || !form.isAvailable}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 disabled:opacity-50"
                    title={!form.isAvailable ? 'Enable availability first' : ''}
                  >
                    Use these hours every day
                  </button>
                  <button
                    type="button"
                    onClick={markWholeWeekUnavailable}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                  >
                    Mark whole week unavailable
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setEditDay(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDay}
                disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save ${DAY_FULL[editDay]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorScheduleCalendar;
