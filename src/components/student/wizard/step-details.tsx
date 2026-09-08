import { getCertificates } from "@/actions/refunds"
import { CustomCalendar } from "@/components/ui/custom-calendar"
import { authClient } from "@/lib/auth-client"
import { useWizardStore } from "@/store/wizard-store"
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Settings } from "lucide-react"
import Link from "next/link"
import React, { useEffect, useRef, useState } from "react"
const getTitlePlaceholder = (category: string | null): string => {
  switch (category) {
    case 'transport':
      return "e.g., Akasec Odyssey, Exhibition Event..."
    case 'equipment':
      return "e.g., Arduino, Raspberry, Slokaa..."
    case 'other':
      return "e.g., Food, PingPong Balls..."
    default:
      return "Enter a title for your request..."
  }
}
const getDescriptionPlaceholder = (category: string | null): string => {
  switch (category) {
    case 'transport':
      return "Describe your travel purpose, event name, dates, and why this trip is necessary for your studies..."
    case 'equipment':
      return "Describe the hardware/equipment needed, its purpose for your project, and why it's essential for your work..."
    case 'certification':
      return "Describe the certification relevance to your learning path, how it benefits your career..."
    case 'other':
      return "Describe the expense purpose..."
    default:
      return "Describe the context and purpose of this expense..."
  }
}

type Certificate = {
  id: string
  name: string
  provider: string
  fixedCost: number
  currency: string
  active?: boolean
}

export function StepDetails() {
  const { data, setData, setStep } = useWizardStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [isStaff, setIsStaff] = useState(false)

  // Modal State
  const [showCalendar, setShowCalendar] = useState(false)
  const [showCertDropdown, setShowCertDropdown] = useState(false)
  const certDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (certDropdownRef.current && !certDropdownRef.current.contains(event.target as Node)) {
        setShowCertDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check Staff Role
  useEffect(() => {
    const checkStaffRole = async () => {
      const session = await authClient.getSession()
      if ((session?.data?.user as { role?: string })?.role === 'STAFF') {
        setIsStaff(true)
      }
    }
    checkStaffRole()
  }, [])

  // Fetch certificates on mount if category is certification
  useEffect(() => {
    if (data.category === 'certification') {
      fetchCertificates()
    }
  }, [data.category])

  // Auto-fill title and amount for certification
  useEffect(() => {
    if (data.category === 'certification' && data.certificateId) {
      const cert = certificates.find(c => c.id === data.certificateId)
      if (cert) {
        // Cap the refund amount at 300
        const refundAmount = Math.min(cert.fixedCost, 300)
        setData({ 
          title: cert.name,
          amount: refundAmount.toString()
        })
      }
    }
  }, [data.category, data.certificateId, certificates, setData])

  const fetchCertificates = async () => {
    setLoading(true)
    try {
      const certs = await getCertificates()
      setCertificates(certs)
    } catch (error) {
      console.error("Failed to fetch certificates:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedCert = certificates.find(c => c.id === data.certificateId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    // Enforce title for certification
    let effectiveTitle = data.title
    if (data.category === 'certification' && selectedCert) {
      effectiveTitle = selectedCert.name
      if (data.title !== effectiveTitle) {
        setData({ title: effectiveTitle })
      }
    }

    // Common validations
    if (!effectiveTitle || effectiveTitle.length < 3) {
      newErrors.title = "Title must be at least 3 characters"
    }
    if (!data.description || data.description.length < 5) {
      newErrors.description = "Description must be at least 5 characters"
    }
    if (data.description && data.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less"
    }

    // Category-specific validations
    if (data.category === 'certification') {
      if (!data.certificateId) {
        newErrors.certificateId = "Please select a certificate"
      }
      if (!data.targetDate) {
        newErrors.targetDate = "Please select a target date"
      }
    } else if (data.category === 'transport') {
      if (!data.departure) {
        newErrors.departure = "Please enter departure location"
      }
      if (!data.destination) {
        newErrors.destination = "Please enter destination"
      }
      if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
        newErrors.amount = "Please enter a valid amount"
      }
    } else {
      // equipment / other
      if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
        newErrors.amount = "Please enter a valid amount"
      }
      if (!data.invoiceAddressedTo) {
        newErrors.invoiceAddressedTo = "You must confirm the invoice is addressed to LEET INITIATIVE"
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setStep(3)
  }

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    fontSize: '0.875rem',
    border: '1px solid #e4e4e7',
    borderRadius: '0.375rem',
    backgroundColor: 'white',
    color: '#18181b',
    outline: 'none',
    transition: 'border-color 150ms'
  }

  const errorInputStyle = {
    ...inputStyle,
    borderColor: '#ef4444'
  }

  const labelStyle = { fontSize: '0.875rem', fontWeight: 500, color: '#18181b' }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Title Field - Only show if NOT certification */}
          {data.category !== 'certification' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="title" style={labelStyle}>
                Title
              </label>
              <input
                id="title"
                type="text"
                placeholder={getTitlePlaceholder(data.category)}
                value={data.title}
                onChange={(e) => setData({ title: e.target.value })}
                style={errors.title ? errorInputStyle : inputStyle}
                autoFocus
              />
              {errors.title && (
                <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.title}</p>
              )}
            </div>
          )}

          {/* Certificate-specific fields */}
          {data.category === 'certification' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={labelStyle}>
                  Select Certificate
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Custom Dropdown */}
                  <div ref={certDropdownRef} style={{ position: 'relative', flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => !loading && setShowCertDropdown(!showCertDropdown)}
                      style={{ 
                        ...(errors.certificateId ? errorInputStyle : inputStyle), 
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      <span style={{ 
                        color: data.certificateId ? '#18181b' : '#9ca3af',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {data.certificateId 
                          ? (() => {
                              const cert = certificates.find(c => c.id === data.certificateId)
                              return cert ? `${cert.name} (${cert.provider}) - ${cert.fixedCost} ${cert.currency}` : 'Select a certificate'
                            })()
                          : 'Select a certificate'
                        }
                      </span>
                      <ChevronDown 
                        size={16} 
                        style={{ 
                          color: '#71717a', 
                          flexShrink: 0,
                          transform: showCertDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 150ms'
                        }} 
                      />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showCertDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.25rem)',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #e4e4e7',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                        zIndex: 50,
                        maxHeight: '15rem',
                        overflowY: 'auto'
                      }}>
                        {/* Empty option */}
                        <div
                          onClick={() => {
                            setData({ certificateId: null })
                            setShowCertDropdown(false)
                          }}
                          style={{
                            padding: '0.625rem 0.875rem',
                            fontSize: '0.875rem',
                            color: '#71717a',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f4f4f5',
                            transition: 'background-color 150ms'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          -- Select a Certificate --
                        </div>
                        
                        {certificates.filter(c => c.active !== false).map((cert) => {
                          const isSelected = data.certificateId === cert.id
                          return (
                            <div
                              key={cert.id}
                              onClick={() => {
                                setData({ certificateId: cert.id })
                                setShowCertDropdown(false)
                              }}
                              style={{
                                padding: '0.625rem 0.875rem',
                                fontSize: '0.875rem',
                                color: '#18181b',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#f4f4f5' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                transition: 'background-color 150ms'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa'
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'white'
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cert.name} ({cert.provider}) - {cert.fixedCost} {cert.currency}
                              </span>
                              {isSelected && <Check size={16} style={{ color: '#18181b', flexShrink: 0 }} />}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {isStaff && (
                    <Link
                      href="/staff/certificates"
                      style={{
                        width: '2.75rem',
                        flexShrink: 0,
                        backgroundColor: '#18181b',
                        borderRadius: '0.375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        transition: 'background-color 150ms'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#18181b'}
                      title="Manage Certificates"
                    >
                      <Settings size={18} />
                    </Link>
                  )}
                </div>
                {errors.certificateId && (
                  <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.certificateId}</p>
                )}
              </div>

              {selectedCert && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Estimated Refund - Green if fully covered, Red if over 300 */}
                  {selectedCert.fixedCost <= 300 ? (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#dcfce7',
                      border: '1px solid #86efac',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#166534'
                    }}>
                      <strong>Refund:</strong> {selectedCert.fixedCost} {selectedCert.currency}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem', color: '#15803d' }}>
                        ✓ Fully covered
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      color: '#991b1b'
                    }}>
                      <strong>Refund:</strong> 300 {selectedCert.currency}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8125rem' }}>
                        — You pay <strong>{selectedCert.fixedCost - 300} {selectedCert.currency}</strong> yourself
                      </span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '0.5rem'
                  }}>
                    <div style={{ fontSize: '0.8125rem', color: '#92400e' }}>
                      <strong>Note:</strong> You will only get refunded <strong>after</strong> you have successfully obtained the certificate.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="targetDate" style={labelStyle}>
                  Target Completion Date
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a', width: '1rem', height: '1rem', zIndex: 1 }} />
                  <button
                    type="button"
                    onClick={() => setShowCalendar(!showCalendar)}
                    style={{
                      ...(errors.targetDate ? errorInputStyle : inputStyle),
                      paddingLeft: '2.5rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      height: '42px'
                    }}
                  >
                    {data.targetDate ? new Date(data.targetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : <span style={{ color: '#9ca3af' }}>mm / dd / yyyy</span>}
                  </button>

                  {showCalendar && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                        onClick={() => setShowCalendar(false)}
                      />
                      <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem', zIndex: 50 }}>
                        <CustomCalendar
                          mode="single"
                          value={data.targetDate ? new Date(data.targetDate) : null}
                          onChange={(val) => {
                            // For single mode, val is Date | null
                            const date = val instanceof Date ? val : undefined
                            setData({ targetDate: date })
                            setShowCalendar(false)
                          }}
                          onClose={() => setShowCalendar(false)}
                        />
                      </div>
                    </>
                  )}
                </div>
                {errors.targetDate && (
                  <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.targetDate}</p>
                )}
              </div>
            </>
          )}

          {/* Transport-specific fields */}
          {data.category === 'transport' && (
            <>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="departure" style={labelStyle}>Departure</label>
                  <input
                    id="departure"
                    type="text"
                    placeholder="Enter departure city"
                    value={data.departure}
                    onChange={(e) => setData({ departure: e.target.value })}
                    style={errors.departure ? errorInputStyle : inputStyle}
                  />
                  {errors.departure && (
                    <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.departure}</p>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="destination" style={labelStyle}>Destination</label>
                  <input
                    id="destination"
                    type="text"
                    placeholder="Enter destination city"
                    value={data.destination}
                    onChange={(e) => setData({ destination: e.target.value })}
                    style={errors.destination ? errorInputStyle : inputStyle}
                  />
                  {errors.destination && (
                    <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.destination}</p>
                  )}
                </div>
              </div>
              {/* Amount for Transport */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="amount" style={labelStyle}>Estimate (DH)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '0.875rem' }}>
                    DH
                  </span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={data.amount}
                    onChange={(e) => setData({ amount: e.target.value })}
                    style={{
                      ...(errors.amount ? errorInputStyle : inputStyle),
                      paddingLeft: '2.5rem'
                    }}
                  />
                </div>
                {errors.amount && (
                  <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.amount}</p>
                )}
              </div>
            </>
          )}

          {/* Equipment / Other fields */}
          {(data.category === 'equipment' || data.category === 'other') && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="amount" style={labelStyle}>Estimate (DH)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a', fontSize: '0.875rem' }}>
                    DH
                  </span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={data.amount}
                    onChange={(e) => setData({ amount: e.target.value })}
                    style={{
                      ...(errors.amount ? errorInputStyle : inputStyle),
                      paddingLeft: '2.5rem'
                    }}
                  />
                </div>
                {errors.amount && (
                  <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.amount}</p>
                )}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '0.5rem'
              }}>
                <input
                  type="checkbox"
                  id="invoiceCheck"
                  checked={data.invoiceAddressedTo}
                  onChange={(e) => setData({ invoiceAddressedTo: e.target.checked })}
                  style={{ marginTop: '0.25rem', accentColor: '#18181b' }}
                />
                <label htmlFor="invoiceCheck" style={{ fontSize: '0.8125rem', color: '#92400e', cursor: 'pointer' }}>
                  I confirm the invoice is addressed to <strong>LEET INITIATIVE</strong> (not 1337).
                </label>
              </div>
              {errors.invoiceAddressedTo && (
                <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.invoiceAddressedTo}</p>
              )}
            </>
          )}

          {/* Description Field (Common) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="description" style={labelStyle}>
              Description <span style={{ color: '#71717a', fontWeight: 400 }}>({data.description.length}/500)</span>
            </label>
            <textarea
              id="description"
              placeholder={getDescriptionPlaceholder(data.category)}
              value={data.description}
              onChange={(e) => setData({ description: e.target.value.slice(0, 500) })}
              rows={3}
              style={{
                ...(errors.description ? errorInputStyle : inputStyle),
                resize: 'vertical',
                minHeight: '5rem'
              }}
            />
            {errors.description && (
              <p style={{ fontSize: '0.8125rem', color: '#ef4444' }}>{errors.description}</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: 'white',
              border: '1px solid #e4e4e7',
              borderRadius: '0.375rem',
              color: '#3f3f46',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
            Back
          </button>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: '#18181b',
              border: 'none',
              borderRadius: '0.375rem',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 150ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#18181b'}
          >
            Continue
            <ChevronRight style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>
      </form>
    </>
  )
}
