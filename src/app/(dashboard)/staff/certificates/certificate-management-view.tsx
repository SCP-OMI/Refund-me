"use client"

import React, { useState, useEffect } from "react"
import { Plus, Loader2, RefreshCcw, Pause, Trash2, AlertTriangle, CheckCircle2, Users } from "lucide-react"
import { 
  getCertificates, 
  createCertificate, 
  deleteCertificate, 
  restoreCertificate,
  checkCertificateUsage,
  forceDeleteCertificate
} from "@/actions/refunds"

type Certificate = {
  id: string
  name: string
  provider: string
  fixedCost: number
  currency: string
  active?: boolean
}

type UsageInfo = {
  count: number
  sampleRequests: Array<{
    id: string
    title: string
    status: string
    createdAt: Date
    user: {
      name: string | null
      email: string
    }
  }>
}

export function CertificateManagementView() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [newCertLoading, setNewCertLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null)
  const [checkingUsage, setCheckingUsage] = useState<string | null>(null)

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null)
  const [certificateToRestore, setCertificateToRestore] = useState<Certificate | null>(null)
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null)

  const [newCertData, setNewCertData] = useState({
    name: '',
    provider: '',
    fixedCost: ''
  })

  useEffect(() => {
    fetchCertificates()
  }, [])

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

  const handleCreateCertificate = async () => {
    if (!newCertData.name || !newCertData.provider || !newCertData.fixedCost) return

    setNewCertLoading(true)
    try {
      await createCertificate({
        name: newCertData.name,
        provider: newCertData.provider,
        fixedCost: parseFloat(newCertData.fixedCost)
      })

      // Refresh list and clear form
      await fetchCertificates()
      setNewCertData({ name: '', provider: '', fixedCost: '' })
    } catch (error) {
      console.error("Failed to create certificate", error)
      alert("Failed to create certificate.")
    } finally {
      setNewCertLoading(false)
    }
  }

  const handleDeleteClick = async (cert: Certificate) => {
    setCertificateToDelete(cert)
    setCheckingUsage(cert.id)
    
    try {
      const usage = await checkCertificateUsage(cert.id)
      setUsageInfo(usage)
      setShowDeleteDialog(true)
    } catch (error) {
      console.error("Failed to check certificate usage", error)
      alert("Failed to check certificate usage.")
    } finally {
      setCheckingUsage(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!certificateToDelete) return

    setDeleteLoading(certificateToDelete.id)
    try {
      if (usageInfo && usageInfo.count > 0) {
        // Force delete if there are usages
        await forceDeleteCertificate(certificateToDelete.id)
      } else {
        // Regular delete if no usages
        await deleteCertificate(certificateToDelete.id)
      }
      
      await fetchCertificates()
      setShowDeleteDialog(false)
      setCertificateToDelete(null)
      setUsageInfo(null)
    } catch (error) {
      console.error("Failed to delete certificate", error)
      alert("Failed to delete certificate.")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleRestoreCertificate = (cert: Certificate) => {
    setCertificateToRestore(cert)
    setShowRestoreDialog(true)
  }

  const handleRestoreConfirm = async () => {
    if (!certificateToRestore) return

    setRestoreLoading(certificateToRestore.id)
    try {
      const res = await restoreCertificate(certificateToRestore.id)
      if (res.success) {
        await fetchCertificates()
        setShowRestoreDialog(false)
        setCertificateToRestore(null)
      }
    } catch (error) {
      console.error("Failed to restore certificate", error)
      alert("Failed to restore certificate.")
    } finally {
      setRestoreLoading(null)
    }
  }

  const labelStyle = { fontSize: '0.875rem', fontWeight: 500, color: '#18181b' }
  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #e4e4e7',
    borderRadius: '0.375rem',
    color: '#18181b',
    outline: 'none',
    transition: 'all 150ms'
  }

  const activeCerts = certificates.filter(c => c.active !== false)
  const inactiveCerts = certificates.filter(c => c.active === false)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Add New Certificate Section */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e4e4e7',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#18181b', marginBottom: '1rem' }}>
            Add New Certificate
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 2fr 1fr auto',
            gap: '1rem',
            alignItems: 'end'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={labelStyle}>Certificate Name</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g., OSCP, AWS Solutions Architect"
                value={newCertData.name}
                onChange={(e) => setNewCertData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={labelStyle}>Provider</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g., OffSec, Amazon Web Services"
                value={newCertData.provider}
                onChange={(e) => setNewCertData(prev => ({ ...prev, provider: e.target.value }))}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={labelStyle}>Refund</label>
              <input
                type="number"
                style={inputStyle}
                placeholder="0.00"
                value={newCertData.fixedCost}
                onChange={(e) => setNewCertData(prev => ({ ...prev, fixedCost: e.target.value }))}
              />
            </div>
            
            <button
              onClick={handleCreateCertificate}
              disabled={newCertLoading || !newCertData.name || !newCertData.provider || !newCertData.fixedCost}
              style={{
                padding: '0.625rem 1rem',
                height: '42px',
                color: 'white',
                backgroundColor: '#18181b',
                border: '1px solid #18181b',
                borderRadius: '0.375rem',
                cursor: newCertLoading ? 'not-allowed' : 'pointer',
                transition: 'all 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: (newCertLoading || !newCertData.name || !newCertData.provider || !newCertData.fixedCost) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!newCertLoading && newCertData.name && newCertData.provider && newCertData.fixedCost) {
                  e.currentTarget.style.backgroundColor = '#3f3f46'
                }
              }}
              onMouseLeave={(e) => {
                if (!newCertLoading && newCertData.name && newCertData.provider && newCertData.fixedCost) {
                  e.currentTarget.style.backgroundColor = '#18181b'
                }
              }}
            >
              {newCertLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {newCertLoading ? 'Creating...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Active Certificates */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e4e4e7',
          borderRadius: '0.75rem',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f4f4f5',
            backgroundColor: '#fafafa'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#18181b', margin: 0 }}>
              Active Certificates ({activeCerts.length})
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#71717a' }} />
            </div>
          ) : activeCerts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa', fontSize: '0.875rem' }}>
              No active certificates. Add one above to get started.
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1fr auto',
                gap: '1rem',
                padding: '1rem 1.5rem',
                backgroundColor: '#fafafa',
                borderBottom: '1px solid #e4e4e7',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#71717a'
              }}>
                <div>Name</div>
                <div>Provider</div>
                <div>Cost</div>
                <div style={{ width: '2rem' }}></div>
              </div>

              {/* Certificate List */}
              {activeCerts.map((cert) => (
                <div 
                  key={cert.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 1fr auto',
                    gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #f4f4f5',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    color: '#18181b',
                    transition: 'background-color 150ms'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ fontWeight: 500 }}>{cert.name}</div>
                  <div style={{ color: '#52525b' }}>{cert.provider}</div>
                  <div>${cert.fixedCost}</div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(cert)}
                      disabled={deleteLoading === cert.id || checkingUsage === cert.id}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: (deleteLoading === cert.id || checkingUsage === cert.id) ? 'not-allowed' : 'pointer',
                        transition: 'all 150ms'
                      }}
                      onMouseEnter={(e) => {
                        if (deleteLoading !== cert.id && checkingUsage !== cert.id) {
                          e.currentTarget.style.backgroundColor = '#fee2e2'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (deleteLoading !== cert.id && checkingUsage !== cert.id) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                      title="Deactivate Certificate"
                    >
                      {deleteLoading === cert.id || checkingUsage === cert.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Pause size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Inactive Certificates */}
        {inactiveCerts.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #e4e4e7',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            opacity: 0.75
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f4f4f5',
              backgroundColor: '#fafafa'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#18181b', margin: 0 }}>
                Inactive Certificates ({inactiveCerts.length})
              </h2>
            </div>

            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 2fr 1fr auto',
              gap: '1rem',
              padding: '1rem 1.5rem',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid #e4e4e7',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#71717a'
            }}>
              <div>Name</div>
              <div>Provider</div>
              <div>Cost</div>
              <div style={{ width: '2rem' }}></div>
            </div>

            {/* Inactive Certificate List */}
            {inactiveCerts.map((cert) => (
              <div 
                key={cert.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr auto',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #f4f4f5',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  color: '#71717a',
                  backgroundColor: '#f9fafb',
                  transition: 'background-color 150ms'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              >
                <div style={{ fontWeight: 500 }}>{cert.name}</div>
                <div>{cert.provider}</div>
                <div>${cert.fixedCost}</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRestoreCertificate(cert)}
                    disabled={restoreLoading === cert.id}
                    style={{
                      width: '2rem',
                      height: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10b981',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: restoreLoading === cert.id ? 'not-allowed' : 'pointer',
                      transition: 'all 150ms'
                    }}
                    onMouseEnter={(e) => {
                      if (restoreLoading !== cert.id) {
                        e.currentTarget.style.backgroundColor = '#d1fae5'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (restoreLoading !== cert.id) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                    title="Restore Certificate"
                  >
                    {restoreLoading === cert.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Dialog */}
      {showRestoreDialog && certificateToRestore && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 50
            }}
            onClick={() => {
              setShowRestoreDialog(false)
              setCertificateToRestore(null)
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 51,
              width: '100%',
              maxWidth: '32rem',
              padding: '0 1rem'
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                border: '1px solid #e4e4e7'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #f4f4f5',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    backgroundColor: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <RefreshCcw size={18} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#18181b', margin: 0 }}>
                      Restore Certificate
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#71717a', margin: '0.25rem 0 0 0' }}>
                      {certificateToRestore.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem' }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '0.875rem', color: '#15803d' }}>
                    Are you sure you want to restore this certificate? It will be available for new requests.
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                padding: '1.5rem',
                borderTop: '1px solid #f4f4f5',
                backgroundColor: '#fafafa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => {
                    setShowRestoreDialog(false)
                    setCertificateToRestore(null)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#71717a',
                    backgroundColor: 'white',
                    border: '1px solid #e4e4e7',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestoreConfirm}
                  disabled={!!restoreLoading}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: '#10b981',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: restoreLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: restoreLoading ? 0.5 : 1
                  }}
                >
                  {restoreLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Restore
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && certificateToDelete && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 50
            }}
            onClick={() => {
              setShowDeleteDialog(false)
              setCertificateToDelete(null)
              setUsageInfo(null)
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 51,
              width: '100%',
              maxWidth: '32rem',
              padding: '0 1rem'
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                border: '1px solid #e4e4e7'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #f4f4f5',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {usageInfo && usageInfo.count > 0 ? (
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      backgroundColor: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      backgroundColor: '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Trash2 size={18} style={{ color: '#ef4444' }} />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#18181b', margin: 0 }}>
                      {usageInfo && usageInfo.count > 0 ? 'Certificate In Use' : 'Deactivate Certificate'}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: '#71717a', margin: '0.25rem 0 0 0' }}>
                      {certificateToDelete.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem' }}>
                {usageInfo && usageInfo.count > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      backgroundColor: '#fef3c7',
                      border: '1px solid #fcd34d'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Users size={16} style={{ color: '#f59e0b' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#92400e' }}>
                          {usageInfo.count} request{usageInfo.count !== 1 ? 's' : ''} using this certificate
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#92400e', margin: 0 }}>
                        Deactivating will hide this certificate from future requests but won&apos;t affect existing ones.
                      </p>
                    </div>

                    {usageInfo.sampleRequests.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#18181b', marginBottom: '0.5rem' }}>
                          Recent requests:
                        </h4>
                        <div style={{
                          border: '1px solid #e4e4e7',
                          borderRadius: '0.5rem',
                          overflow: 'hidden'
                        }}>
                          {usageInfo.sampleRequests.slice(0, 3).map((request) => (
                            <div 
                              key={request.id}
                              style={{
                                padding: '0.75rem',
                                borderBottom: '1px solid #f4f4f5',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.8125rem'
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 500, color: '#18181b' }}>{request.title}</div>
                                <div style={{ color: '#71717a' }}>{request.user.name || request.user.email}</div>
                              </div>
                              <div style={{ color: '#a1a1aa' }}>
                                {new Date(request.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                          {usageInfo.count > 3 && (
                            <div style={{
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#fafafa',
                              fontSize: '0.75rem',
                              color: '#71717a',
                              textAlign: 'center'
                            }}>
                              +{usageInfo.count - 3} more request{usageInfo.count - 3 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: '0.875rem', color: '#15803d' }}>
                      This certificate is not used in any requests and can be safely deactivated.
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '1.5rem',
                borderTop: '1px solid #f4f4f5',
                backgroundColor: '#fafafa',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setCertificateToDelete(null)
                    setUsageInfo(null)
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#71717a',
                    backgroundColor: 'white',
                    border: '1px solid #e4e4e7',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading === certificateToDelete.id}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'white',
                    backgroundColor: usageInfo && usageInfo.count > 0 ? '#f59e0b' : '#ef4444',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: deleteLoading === certificateToDelete.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: deleteLoading === certificateToDelete.id ? 0.5 : 1
                  }}
                >
                  {deleteLoading === certificateToDelete.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  {usageInfo && usageInfo.count > 0 ? 'Deactivate Anyway' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}