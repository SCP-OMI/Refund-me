"use client"

import { createEstimate } from "@/actions/refunds"
import { getUserRole } from "@/actions/user"
import { useWizardStore } from "@/store/wizard-store"
import { CheckCircle2, ChevronLeft, FileText, Loader2, Upload, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"

type UploadedFile = {
  file: File
  preview?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  url?: string
}

export function StepSummary() {
  const { data, setStep, reset } = useWizardStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [certificates, setCertificates] = useState<Array<{id: string; name: string; provider: string; fixedCost: number; currency: string}>>([])
  const router = useRouter()

  // Fetch user role and certificates on mount
  useEffect(() => {
    getUserRole().then(setUserRole)
    if (data.category === 'certification') {
      fetchCertificates()
    }
  }, [data.category])

  const fetchCertificates = async () => {
    try {
      const { getCertificates } = await import('@/actions/refunds')
      const certs = await getCertificates()
      setCertificates(certs)
    } catch (error) {
      console.error('Failed to fetch certificates:', error)
    }
  }

  const selectedCert = certificates.find(c => c.id === data.certificateId)

  const isStaff = userRole === 'STAFF'

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter to ensure we don't exceed 10 files total
    const remainingSlots = 10 - uploadedFiles.length
    const filesToAdd = acceptedFiles.slice(0, remainingSlots)
    
    if (filesToAdd.length > 0) {
      const newFiles: UploadedFile[] = filesToAdd.map(file => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'pending' as const
      }))
      setUploadedFiles(prev => [...prev, ...newFiles])
    }
  }, [uploadedFiles.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 10,
    multiple: true
  })

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const UploadToLocal = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Error uploading file:", error)
      return null
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const receiptUrls: string[] = []

      // Upload all files if provided
      if (uploadedFiles.length > 0) {
        setIsUploading(true)
        
        for (let i = 0; i < uploadedFiles.length; i++) {
          if (uploadedFiles[i].status !== 'pending') continue
          
          // Update status to uploading
          setUploadedFiles(prev => {
            const updated = [...prev]
            updated[i] = { ...updated[i], status: 'uploading' }
            return updated
          })

          const url = await UploadToLocal(uploadedFiles[i].file)
          
          if (url) {
            receiptUrls.push(url)
            setUploadedFiles(prev => {
              const updated = [...prev]
              updated[i] = { ...updated[i], status: 'success', url }
              return updated
            })
          } else {
            setUploadedFiles(prev => {
              const updated = [...prev]
              updated[i] = { ...updated[i], status: 'error', error: 'Upload failed' }
              return updated
            })
          }
        }
        
        setIsUploading(false)
      }

      const categoryMap: Record<string, "EQUIPMENT" | "CERTIFICATION" | "TRAVEL" | "OTHER"> = {
        'transport': 'TRAVEL',
        'equipment': 'EQUIPMENT',
        'certification': 'CERTIFICATION',
        'other': 'OTHER'
      }

      await createEstimate({
        title: data.title,
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        type: categoryMap[data.category!] || 'OTHER',
        receiptUrls,
        // New fields from Step 3
        certificateId: data.certificateId || undefined,
        targetDate: data.targetDate,
        departure: data.departure || undefined,
        destination: data.destination || undefined,
        invoiceAddressedTo: data.invoiceAddressedTo ? 'LEET INITIATIVE' : undefined
      })

      setIsSubmitting(false)
      reset()
      // Redirect staff to staff dashboard, students to student dashboard
      router.push(isStaff ? "/staff" : "/student")
      router.refresh()
    } catch (error: unknown) {
      console.error("Failed to submit request:", error)
      setIsSubmitting(false)

      // Check if it's an authentication error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("session") || errorMessage.includes("auth")) {
        router.push("/login?error=auth_required")
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Review Card */}
      <div
        style={{
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 500, color: '#18181b', marginBottom: '1rem' }}>
          Review Request
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div style={{ color: '#71717a' }}>Title</div>
          <div style={{ fontWeight: 500, color: '#18181b' }}>{data.title}</div>

          <div style={{ color: '#71717a' }}>Category</div>
          <div style={{ fontWeight: 500, color: '#18181b', textTransform: 'capitalize' }}>{data.category}</div>

          <div style={{ color: '#71717a' }}>Estimate</div>
          <div style={{ fontWeight: 500, color: '#18181b' }}>
            {data.category === 'certification' && selectedCert ? 
              `${selectedCert.fixedCost.toFixed(2)} ${selectedCert.currency}` : 
              `DH ${Number(data.amount).toFixed(2)}`
            }
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Description</div>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'white',
              border: '1px solid #e4e4e7',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#3f3f46'
            }}
          >
            {data.description}
          </div>
        </div>
      </div>

      {/* Staff Info Banner */}
      {isStaff && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.75rem',
            padding: '1rem'
          }}
        >
          <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#166534', marginBottom: '0.25rem' }}>
            Staff Request
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#15803d' }}>
            Your request will go directly to the Receipts queue for payment.
          </p>
        </div>
      )}

      {/* Attachment Upload - Available for all users */}
      <div
        style={{
          backgroundColor: '#fafafa',
          border: '1px solid #e4e4e7',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}
      >
        <div style={{ color: '#18181b', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
          Receipts <span style={{ color: '#71717a', fontWeight: 400 }}>(optional, up to 10)</span>
        </div>

        {uploadedFiles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {uploadedFiles.map((uploadedFile, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: '1px solid #e4e4e7',
                  borderRadius: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <FileText style={{ width: '1rem', height: '1rem', color: '#18181b', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {uploadedFile.file.name}
                  </span>
                  {uploadedFile.status === 'uploading' && (
                    <Loader2 style={{ width: '0.875rem', height: '0.875rem', color: '#71717a', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  )}
                  {uploadedFile.status === 'success' && (
                    <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem', color: '#22c55e', flexShrink: 0 }} />
                  )}
                  {uploadedFile.status === 'error' && (
                    <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Failed</span>
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isSubmitting}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    padding: '0.25rem',
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  <X style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />
                </button>
              </div>
            ))}
            {uploadedFiles.length < 10 && (
              <div
                {...getRootProps()}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  border: `2px dashed ${isDragActive ? '#18181b' : '#d4d4d8'}`,
                  borderRadius: '0.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 150ms'
                }}
              >
                <input {...getInputProps()} />
                <p style={{ fontSize: '0.875rem', color: '#3f3f46', margin: 0 }}>
                  {isDragActive ? 'Drop files here' : `Add more (${uploadedFiles.length}/10)`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            {...getRootProps()}
            style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              border: `2px dashed ${isDragActive ? '#18181b' : '#d4d4d8'}`,
              borderRadius: '0.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 150ms'
            }}
          >
            <input {...getInputProps()} />
            <Upload style={{ width: '1.5rem', height: '1.5rem', color: '#71717a', margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#3f3f46' }}>
              {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem' }}>
              PNG, JPG, PDF up to 10 files
            </p>
          </div>
        )}
      </div>

      {/* Certification Warning */}
      {data.category === 'certification' && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '0.75rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: '#92400e' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Important Note:</p>
            <p style={{ margin: 0, marginTop: '0.25rem' }}>
              A refund is only valid and will be processed <strong>after</strong> you have successfully obtained the certificate and uploaded the proof.
            </p>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={isSubmitting}
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
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
            transition: 'all 150ms'
          }}
          onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#fafafa')}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
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
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 150ms'
          }}
          onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#27272a')}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#18181b'}
        >
          {isSubmitting ? (
            <>
              <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
              {isUploading ? 'Uploading...' : 'Submitting...'}
            </>
          ) : (
            <>
              Confirm & Submit
              <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

