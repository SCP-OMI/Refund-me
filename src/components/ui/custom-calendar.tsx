import React, { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

// --- Generic Helper for Dates ---
export const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const getDaysInMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

const getFirstDayOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

// --- Custom Calendar Component ---
interface CustomCalendarProps {
  value: Date | { start: Date | null; end: Date | null } | null
  onChange: (val: Date | { start: Date | null; end: Date | null } | null) => void
  onClose?: () => void
  mode?: "single" | "range"
}

export function CustomCalendar({ value, onChange, onClose, mode = "range" }: CustomCalendarProps) {
  const [viewDate, setViewDate] = useState(new Date())

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    
    // Set time to noon to avoid timezone edge cases with simple dates
    clickedDate.setHours(12, 0, 0, 0)

    if (mode === "single") {
      onChange(clickedDate)
      if (onClose) onClose()
    } else {
      // Range Mode Logic
      const rangeValue = value as { start: Date | null; end: Date | null }
      if (!rangeValue.start || (rangeValue.start && rangeValue.end)) {
        onChange({ start: clickedDate, end: null })
      } else {
        if (clickedDate < rangeValue.start) {
          onChange({ start: clickedDate, end: rangeValue.start })
        } else {
          onChange({ start: rangeValue.start, end: clickedDate })
        }
      }
    }
  }

  const daysInMonth = getDaysInMonth(viewDate)
  const firstDay = getFirstDayOfMonth(viewDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const padding = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div
      style={{
        width: '320px',
        borderRadius: '0.75rem',
        border: '1px solid #e4e4e7',
        backgroundColor: '#ffffff',
        padding: '1.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        isolation: 'isolate',
        flexShrink: 0
      }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid #f4f4f5',
            backgroundColor: '#ffffff',
            color: '#71717a',
            cursor: 'pointer',
            transition: 'all 150ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f4f4f5'
            e.currentTarget.style.borderColor = '#e4e4e7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
            e.currentTarget.style.borderColor = '#f4f4f5'
          }}
        >
          <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
        </button>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18181b', letterSpacing: '-0.01em' }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            width: '2rem',
            height: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '1px solid #f4f4f5',
            backgroundColor: '#ffffff',
            color: '#71717a',
            cursor: 'pointer',
            transition: 'all 150ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f4f4f5'
            e.currentTarget.style.borderColor = '#e4e4e7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
            e.currentTarget.style.borderColor = '#f4f4f5'
          }}
        >
          <ChevronRight style={{ width: '1rem', height: '1rem' }} />
        </button>
      </div>

      {/* Days Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.5rem' }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#a1a1aa', padding: '0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {padding.map((_, i) => <div key={`pad-${i}`} style={{ aspectRatio: '1' }} />)}
        {days.map((day) => {
          const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
          
          let isSelected = false
          let isRange = false
          let isStart = false
          let isEnd = false
          let cellBg = '#ffffff'

          if (mode === 'range') {
            const rangeValue = value as { start: Date | null; end: Date | null }
            if (rangeValue.start) {
              if (currentDate.toDateString() === rangeValue.start.toDateString()) {
                isSelected = true
                isStart = true
              }
            }
            if (rangeValue.end) {
              if (currentDate.toDateString() === rangeValue.end.toDateString()) {
                isSelected = true
                isEnd = true
              }
            }
            if (rangeValue.start && rangeValue.end) {
              if (currentDate > rangeValue.start && currentDate < rangeValue.end) {
                isRange = true
              }
            }
            // Background logic for range
            if (isRange) cellBg = '#f4f4f5'
            if (isStart && rangeValue.end) cellBg = 'linear-gradient(to right, #ffffff 50%, #f4f4f5 50%)'
            if (isEnd && rangeValue.start) cellBg = 'linear-gradient(to left, #ffffff 50%, #f4f4f5 50%)'

          } else {
            // Single Mode
            const singleValue = value as Date | null
            if (singleValue && currentDate.toDateString() === singleValue.toDateString()) {
              isSelected = true
            }
          }

          return (
            <div
              key={day}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: cellBg
              }}
            >
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                style={{
                  position: 'relative',
                  zIndex: 10,
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  borderRadius: '50%',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                  backgroundColor: isSelected ? '#18181b' : 'transparent',
                  color: isSelected ? 'white' : '#3f3f46',
                  fontWeight: isSelected ? 600 : 400,
                  boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f4f4f5'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer / Actions (Only for Range Mode usually, or always if we want Apply button) */}
      {mode === 'range' && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#3f3f46', marginTop: '0.125rem' }}>
              {(value as { start: Date | null; end: Date | null }).start ? formatDate((value as { start: Date | null; end: Date | null }).start!) : "Start"}
              {(value as { start: Date | null; end: Date | null }).start && (value as { start: Date | null; end: Date | null }).end ? ` – ${formatDate((value as { start: Date | null; end: Date | null }).end!)}` : ""}
            </span>
          </div>
          {(value as { start: Date | null; end: Date | null }).start && (value as { start: Date | null; end: Date | null }).end && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 0.875rem',
                backgroundColor: '#18181b',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#27272a'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#18181b'
              }}
            >
              Apply Range
            </button>
          )}
        </div>
      )}
    </div>
  )
}
