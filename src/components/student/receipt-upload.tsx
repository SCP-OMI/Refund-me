"use client"

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export function ReceiptUpload({ onUploadComplete }: { onUploadComplete: (url: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      // 'application/pdf': ['.pdf']
    }
  })

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()

      setIsUploading(false)
      setIsSuccess(true)
      onUploadComplete(data.url)
    } catch (error) {
      console.error("Upload error:", error)
      setIsUploading(false)
      setError("Upload failed. Please try again.")
    }
  }

  const removeFile = () => {
    setFile(null)
    setIsSuccess(false)
    setError(null)
  }

  if (isSuccess) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          borderRadius: '0.75rem',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0'
        }}
      >
        <CheckCircle style={{ width: '3rem', height: '3rem', color: '#16a34a', marginBottom: '0.5rem' }} />
        <h3 style={{ fontWeight: 600, color: '#15803d' }}>Upload Complete</h3>
        <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>Your receipt has been verified</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626'
          }}
        >
          <AlertCircle style={{ width: '1rem', height: '1rem' }} />
          <span style={{ fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}
      {!file ? (
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed',
            borderColor: isDragActive ? '#18181b' : '#e4e4e7',
            borderRadius: '0.75rem',
            padding: '2.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? '#fafafa' : 'white',
            transition: 'all 150ms'
          }}
        >
          <input {...getInputProps()} />
          <div
            style={{
              padding: '1rem',
              borderRadius: '50%',
              backgroundColor: '#f4f4f5',
              marginBottom: '1rem'
            }}
          >
            <UploadCloud style={{ width: '1.5rem', height: '1.5rem', color: '#71717a' }} />
          </div>
          <h3 style={{ fontWeight: 500, fontSize: '1rem', color: '#18181b', marginBottom: '0.25rem' }}>
            Upload Receipt
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#71717a', textAlign: 'center', maxWidth: '14rem' }}>
            Drag & drop or click to upload PNG, JPG or PDF
          </p>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #e4e4e7',
            borderRadius: '0.75rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                backgroundColor: '#f4f4f5'
              }}
            >
              <File style={{ width: '1.25rem', height: '1.25rem', color: '#18181b' }} />
            </div>
            <div>
              <p style={{ fontWeight: 500, fontSize: '0.875rem', color: '#18181b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '11rem' }}>
                {file.name}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#71717a' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={removeFile}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2rem',
                height: '2rem',
                borderRadius: '0.375rem',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer'
              }}
            >
              <X style={{ width: '1rem', height: '1rem' }} />
            </button>
          )}
        </div>
      )}

      {file && !isUploading && (
        <button
          onClick={handleUpload}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#18181b',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Upload Receipt
        </button>
      )}

      {isUploading && (
        <button
          disabled
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#a1a1aa',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
          Uploading...
        </button>
      )}
    </div>
  )
}
