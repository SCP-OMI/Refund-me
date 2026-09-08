"use client"

import { getAnalyticsData } from "@/actions/analytics"
import { getExportData } from "@/actions/export-pdf"
import { ExportButton } from "@/components/export-button"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar as CalendarIcon,
  CreditCard,
  Filter,
  TrendingUp,
  User2
} from "lucide-react"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"

import { CustomCalendar, formatDate } from "@/components/ui/custom-calendar"

// Helper to create dates relative to today
const subDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}




export default function AnalyticsPage() {
  // Timeline State
  const [showCompleted, setShowCompleted] = useState(false)
  const [daysWindow, setDaysWindow] = useState(45)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Date Filter State
  const [showCalendar, setShowCalendar] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: subDays(new Date(), 30),
    end: new Date()
  })

  // Type Filter State
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const requestTypes = [
    { value: 'TRAVEL', label: 'Transport & Travel' },
    { value: 'EQUIPMENT', label: 'Hardware & Equipment' },
    { value: 'CERTIFICATION', label: 'Certification' },
    { value: 'OTHER', label: 'Other Expenses' }
  ]

  // Fetch Data using TanStack Query
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', { 
      start: dateRange.start?.toISOString(), 
      end: dateRange.end?.toISOString(), 
      types: selectedTypes 
    }],
    queryFn: async () => {
      if (!dateRange.start || !dateRange.end) return null
      const data = await getAnalyticsData(dateRange.start, dateRange.end, selectedTypes)
      return {
        stats: data.stats,
        timeline: data.timeline.map((item) => ({
          ...item,
          submittedAt: new Date(item.submittedAt),
          completedAt: item.completedAt ? new Date(item.completedAt) : null
        }))
      }
    },
    enabled: !!dateRange.start && !!dateRange.end
  })

  const timelineData = useMemo(() => analyticsData?.timeline || [], [analyticsData?.timeline])
  const statsData = useMemo(() => analyticsData?.stats || {
    totalRequests: 0,
    pendingApproval: 0,
    totalPayouts: 0,
    avgProcessingTime: 0
  }, [analyticsData?.stats])

  const stats = useMemo(() => [
    {
      label: "Total Requests",
      value: statsData.totalRequests.toString(),
      change: null, // We could compare with prev period if we fetched it, but for now simplify
      trend: "neutral",
      icon: BarChart3
    },
    {
      label: "Total Payouts",
      value: `${statsData.totalPayouts.toLocaleString(undefined, { maximumFractionDigits: 0 })} DH`,
      change: null,
      trend: "neutral",
      icon: CreditCard
    },
    {
      label: "Avg. Processing Time",
      value: `${statsData.avgProcessingTime} Days`,
      change: null,
      trend: "neutral",
      icon: TrendingUp
    }
  ], [statsData])

  // Zoom Handler (Scroll Wheel)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? 5 : -5
        setDaysWindow(prev => {
          const next = prev + delta
          return Math.min(Math.max(next, 10), 180)
        })
      }
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Auto-scroll to end
  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
        }
      }, 50)
    }
  }, [timelineData, showCompleted, daysWindow])

  // Timeline Constants & Logic
  const today = new Date()
  const windowStart = subDays(today, daysWindow)

  // Data is now filtered on the server
  const filteredByType = timelineData

  const processing = filteredByType
    .filter(i => i.status !== "READY_TO_PAY" && i.status !== "FULLY_PAID" && i.status !== "DECLINED")
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
  const completed = filteredByType
    .filter(i => i.status === "READY_TO_PAY" || i.status === "FULLY_PAID" || i.status === "COMPLETED")
    .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
  const displayedData = showCompleted ? [...processing, ...completed] : processing

  const getLeftPct = (date: Date) => {
    const diffTime = date.getTime() - windowStart.getTime()
    const totalTime = today.getTime() - windowStart.getTime()
    return Math.max(0, (diffTime / totalTime) * 100)
  }
  const getWidthPct = (start: Date, end: Date | null) => {
    const endTime = end ? end.getTime() : today.getTime()
    const diffTime = endTime - start.getTime()
    const totalTime = today.getTime() - windowStart.getTime()
    return Math.max(0.5, (diffTime / totalTime) * 100)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Responsive Styles */}
      <style>{`
        /* Header Section */
        .analytics-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .analytics-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }
        .analytics-actions > * {
          width: 100%;
        }
        .analytics-actions > div {
          width: 100%;
        }
        .analytics-actions button {
          width: 100%;
          justify-content: center;
        }
        
        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        /* Timeline Section - Hidden on mobile */
        .timeline-content {
          display: none;
        }
        .timeline-mobile-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          text-align: center;
          color: #71717a;
        }
        .timeline-chart-container {
          padding: 1rem;
        }
        
        /* Filter Popover - Stack on mobile */
        .filter-popover {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 50;
          display: flex;
          flex-direction: column-reverse;
          gap: 0.75rem;
          max-height: 90vh;
          overflow-y: auto;
          padding: 1rem;
        }
        .filter-popover > * {
          flex-shrink: 0;
        }
        .type-filter {
          width: 320px !important;
          height: auto !important;
        }
        
        /* Legend */
        .timeline-legend {
          display: none;
        }
        
        @media (min-width: 640px) {
          /* Stats Grid - 2 columns on small tablets */
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 768px) {
          /* Header Section */
          .analytics-header {
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
          }
          .analytics-actions {
            flex-direction: row;
            width: auto;
          }
          .analytics-actions > * {
            width: auto;
          }
          .analytics-actions > div {
            width: auto;
          }
          .analytics-actions button {
            width: auto;
          }
          
          /* Filter Popover - Horizontal on tablet+ */
          .filter-popover {
            position: absolute;
            top: 3.5rem;
            left: auto;
            right: 0;
            transform: none;
            flex-direction: row;
            max-height: none;
            overflow-y: visible;
            padding: 0;
          }
          .type-filter {
            width: 220px !important;
            height: 220px !important;
          }
          
          /* Timeline Section - Show on tablet+ */
          .timeline-content {
            display: block;
          }
          .timeline-mobile-message {
            display: none;
          }
          .timeline-chart-container {
            padding: 1.5rem;
          }
          .timeline-legend {
            display: flex;
            flex-direction: row;
            gap: 1.5rem;
          }
        }
        
        @media (min-width: 1024px) {
          /* Stats Grid - 3 columns on desktop */
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      {/* Header */}
      <div className="analytics-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 600, color: '#18181b', letterSpacing: '-0.025em' }}>
            Analytics
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.125rem' }}>
            Overview of refund requests and financial metrics
          </p>
        </div>

        {/* Actions */}
        <div className="analytics-actions">
          {/* Export Button */}
          <ExportButton
            onExport={(options) => {
              if (!dateRange.start || !dateRange.end) {
                return Promise.reject(new Error('Date range required'))
              }
              return getExportData(dateRange.start, dateRange.end, selectedTypes, options)
            }}
            disabled={!dateRange.start || !dateRange.end || isLoading}
          />

          {/* Date Filter */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.875rem',
                backgroundColor: showCalendar ? '#f4f4f5' : 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#3f3f46',
                cursor: 'pointer',
                transition: 'all 150ms'
              }}
            >
              <CalendarIcon style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
              <span>
                {dateRange.start && dateRange.end
                  ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
                  : "Select Dates"
                }
              </span>
              <Filter style={{ width: '0.875rem', height: '0.875rem', color: '#a1a1aa', marginLeft: '0.25rem' }} />
            </button>

            {/* Filter Popovers */}
            {showCalendar && (
              <>
                {/* Dimmed Backdrop */}
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40,
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(2px)'
                  }}
                  onClick={() => setShowCalendar(false)}
                />

                {/* Filter Container */}
                <div className="filter-popover">
                  {/* Type Filter */}
                  <div
                    className="type-filter"
                    style={{
                      width: '220px',
                      height: '220px',
                      borderRadius: '0.75rem',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#ffffff',
                      padding: '1rem',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      isolation: 'isolate'
                    }}
                  >
                    {/* Header */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#18181b', letterSpacing: '-0.01em' }}>
                        Request Type
                      </div>
                    </div>

                    {/* Type Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {requestTypes.map((type) => {
                        const isSelected = selectedTypes.includes(type.value)
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTypes(prev => prev.filter(t => t !== type.value))
                              } else {
                                setSelectedTypes(prev => [...prev, type.value])
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              padding: '0.5rem 0.625rem',
                              borderRadius: '0.375rem',
                              border: 'none',
                              backgroundColor: isSelected ? '#18181b' : 'transparent',
                              color: isSelected ? 'white' : '#3f3f46',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 150ms',
                              textAlign: 'left',
                              width: '100%',
                              justifyContent: 'flex-start'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#f4f4f5'
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                            }}
                          >
                            <div
                              style={{
                                width: '0.875rem',
                                height: '0.875rem',
                                borderRadius: '0.25rem',
                                border: isSelected ? 'none' : '1px solid #d4d4d8',
                                backgroundColor: isSelected ? 'white' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5L4 7L8 3" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            {type.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Clear Button */}
                    {selectedTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTypes([])}
                        style={{
                          width: '100%',
                          marginTop: '0.75rem',
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          border: '1px solid #e4e4e7',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: '#71717a',
                          cursor: 'pointer',
                          transition: 'all 150ms'
                        }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Calendar */}
                  <CustomCalendar
                    value={dateRange}
                    onChange={(range) => setDateRange(prev => ({ ...prev, ...range }))}
                    onClose={() => setShowCalendar(false)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          const isPositive = stat.trend === 'up'

          return (
            <div
              key={i}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#f4f4f5',
                    color: '#18181b'
                  }}
                >
                  <Icon style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                {stat.change && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: isPositive ? '#16a34a' : '#71717a',
                      backgroundColor: isPositive ? '#f0fdf4' : '#fafafa',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px',
                      border: isPositive ? '1px solid #bbf7d0' : '1px solid #f4f4f5'
                    }}
                  >
                    {isPositive ? (
                      <ArrowUpRight style={{ width: '0.75rem', height: '0.75rem' }} />
                    ) : (
                      <ArrowDownRight style={{ width: '0.75rem', height: '0.75rem' }} />
                    )}
                    {stat.change}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '1.875rem', fontWeight: 600, color: '#18181b', letterSpacing: '-0.025em' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Chart Area (Timeline) */}
      <div
        className="timeline-chart-container"
        style={{
          backgroundColor: 'white',
          border: '1px solid #e4e4e7',
          borderRadius: '0.75rem',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          minHeight: '24rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Mobile Message */}
        <div className="timeline-mobile-message">
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ marginBottom: '1rem', opacity: 0.5 }}
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
            Use a larger display
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            The timeline chart is best viewed on tablets and desktops.
          </p>
        </div>

        {/* Timeline Content - Hidden on mobile */}
        <div className="timeline-content">
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#18181b' }}>Refund Processing Timeline</h3>
              <p style={{ fontSize: '0.875rem', color: '#71717a' }}>Track duration from submission to payout.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {/* Zoom Indicator */}
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>
                Viewing {daysWindow} Days (Scroll to Zoom)
              </span>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#71717a' }}>Show Completed</span>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  style={{
                    width: '2.25rem',
                    height: '1.25rem',
                    borderRadius: '9999px',
                    backgroundColor: showCompleted ? '#18181b' : '#e4e4e7',
                    position: 'relative',
                    transition: 'background-color 200ms ease-in-out',
                    cursor: 'pointer',
                    border: 'none',
                    padding: 0
                  }}
                >
                  <div
                    style={{
                      width: '1rem',
                      height: '1rem',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      position: 'absolute',
                      top: '0.125rem',
                      left: showCompleted ? '1.125rem' : '0.125rem',
                      transition: 'left 200ms ease-in-out',
                      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.1)'
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Chart Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="no-scrollbar"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              borderTop: '1px solid #f4f4f5',
              scrollBehavior: 'auto'
            }}
          >
            <div style={{ minWidth: '1000px', paddingRight: '1rem' }}>
            {/* Header / Axis */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', paddingBottom: '1rem', paddingTop: '1rem', borderBottom: '1px solid #f4f4f5' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 10 }}>
                Request Details
              </div>
              <div style={{ position: 'relative', height: '1.5rem' }}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const pct = (i / 5) * 100
                  const date = subDays(today, daysWindow - ((i / 5) * daysWindow))

                  return (
                    <div key={i} style={{ position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)', top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {i === 5 && " (Today)"}
                      </span>
                      <div style={{ width: '1px', height: '8px', backgroundColor: '#e4e4e7', marginTop: '4px' }} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {displayedData.map((item, i) => {
                const leftPct = getLeftPct(item.submittedAt)
                const widthPct = getWidthPct(item.submittedAt, item.completedAt)
                const isProcessing = item.status !== "READY_TO_PAY" && item.status !== "FULLY_PAID" && item.status !== "COMPLETED"

                return (
                  <div key={i} className="group" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px dashed #f4f4f5' }}>
                    {/* User Info (Sticky Left) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: 'white',
                      zIndex: 10,
                      marginRight: '-1px',
                      paddingRight: '1rem'
                    }}>
                      <div style={{
                        width: '2.25rem',
                        height: '2.25rem',
                        borderRadius: '50%',
                        backgroundColor: '#f4f4f5',
                        border: '1px solid #e4e4e7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {item.image ? (
                          <Image 
                            src={item.image} 
                            alt={item.user} 
                            width={40} 
                            height={40} 
                            unoptimized
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <User2 style={{ width: '1.125rem', height: '1.125rem', color: '#71717a' }} />
                        )}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#18181b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{item.user}</div>
                        <div style={{ fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap' }}>{item.type} • {item.amount} Dhs</div>
                      </div>
                    </div>

                    {/* Bar Container */}
                    <div style={{ position: 'relative', height: '2rem', display: 'flex', alignItems: 'center' }}>
                      {/* Background Grid Lines */}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', opacity: 0.1, pointerEvents: 'none' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} style={{ position: 'absolute', left: `${(i / 5) * 100}%`, width: '1px', backgroundColor: '#e4e4e7', height: '100%' }} />
                        ))}
                      </div>

                      {/* The Bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          height: '0.75rem',
                          backgroundColor: isProcessing ? '#fbbf24' : '#18181b',
                          borderRadius: '9999px',
                          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.1)',
                          transition: 'all 200ms',
                          cursor: 'default',
                          minWidth: '4px'
                        }}
                      >
                        {/* Tooltip on Hover */}
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-white text-[0.7rem] rounded whitespace-nowrap pointer-events-none z-20 shadow-lg"
                        >
                          {item.submittedAt.toLocaleDateString()} - {item.completedAt ? item.completedAt.toLocaleDateString() : 'Now'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {displayedData.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa', fontSize: '0.875rem', fontStyle: 'italic' }}>
                  No active processing requests.
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Legend */}
          <div className="timeline-legend" style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f4f4f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#71717a' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#18181b' }} />
              <span>Completed / Paid</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#71717a' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#fbbf24' }} />
              <span>Processing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
