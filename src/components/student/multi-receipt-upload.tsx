"use client"

import { deleteAllReceipts, submitReceipt } from '@/actions/refunds'
import { AlertCircle, CheckCircle, File, Loader2, UploadCloud, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface UploadingFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  url?: string
  error?: string
}

interface MultiReceiptUploadProps {
  requestId: string
  onUploadComplete?: () => void
  replaceMode?: boolean
}

export function MultiReceiptUpload({ requestId, onUploadComplete, replaceMode = false }: MultiReceiptUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const
    }))
    setFiles(prev => {
      const totalFiles = prev.length + newFiles.length
      if (totalFiles > 10) {
        alert(`You can only upload up to 10 receipts. Currently adding ${newFiles.length} to ${prev.length} existing files.`)
        return prev
      }
      return [...prev, ...newFiles]
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 10
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadToServer = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) throw new Error('Upload failed')
    const data = await response.json()
    return data.url
  }

  const handleUploadAll = async () => {
    if (files.length === 0 || isUploading) return
    setIsUploading(true)

    // Move updatedFiles declaration outside try block
    const updatedFiles = [...files]

    try {
      // If replace mode, delete all existing receipts first
      if (replaceMode) {
        await deleteAllReceipts(requestId)
      }

      for (let i = 0; i < files.length; i++) {
        if (files[i].status !== 'pending') continue

        // Update status to uploading
        updatedFiles[i] = { ...updatedFiles[i], status: 'uploading' }
        setFiles([...updatedFiles])

        try {
          // Upload to storage
          const url = await uploadToServer(files[i].file)

          // Submit to server action (creates Receipt record)
          await submitReceipt(requestId, url, 0) // Amount will be set by staff

          updatedFiles[i] = { ...updatedFiles[i], status: 'success', url }
          setFiles([...updatedFiles])
        } catch (error) {
          updatedFiles[i] = { 
            ...updatedFiles[i], 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Upload failed'
          }
          setFiles([...updatedFiles])
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to replace receipts')
      setIsUploading(false)
      return
    }

    setIsUploading(false)
    
    // Check if all uploads succeeded
    const allSuccess = updatedFiles.every(f => f.status === 'success')
    if (allSuccess && onUploadComplete) {
      onUploadComplete()
    }
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const successCount = files.filter(f => f.status === 'success').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed',
          borderColor: isDragActive ? '#18181b' : '#e4e4e7',
          borderRadius: '0.75rem',
          padding: '2rem 1.5rem',
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
            padding: '0.75rem',
            borderRadius: '50%',
            backgroundColor: '#f4f4f5',
            marginBottom: '0.75rem'
          }}
        >
          <UploadCloud style={{ width: '1.25rem', height: '1.25rem', color: '#71717a' }} />
        </div>
        <h3 style={{ fontWeight: 500, fontSize: '0.9375rem', color: '#18181b', marginBottom: '0.25rem' }}>
          Upload Receipts
        </h3>
        <p style={{ fontSize: '0.8125rem', color: '#71717a', textAlign: 'center' }}>
          Drag & drop files or click to browse (max 10 files)
        </p>
        <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
          PNG, JPG, PDF • Max 10MB each
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {files.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: item.status === 'error' ? '#fecaca' : item.status === 'success' ? '#bbf7d0' : '#e4e4e7',
                backgroundColor: item.status === 'error' ? '#fef2f2' : item.status === 'success' ? '#f0fdf4' : 'white'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '0.375rem',
                    borderRadius: '0.375rem',
                    backgroundColor: item.status === 'success' ? '#dcfce7' : '#f4f4f5'
                  }}
                >
                  {item.status === 'uploading' ? (
                    <Loader2 style={{ width: '1rem', height: '1rem', color: '#71717a', animation: 'spin 1s linear infinite' }} />
                  ) : item.status === 'success' ? (
                    <CheckCircle style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />
                  ) : item.status === 'error' ? (
                    <AlertCircle style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />
                  ) : (
                    <File style={{ width: '1rem', height: '1rem', color: '#18181b' }} />
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ 
                    fontWeight: 500, 
                    fontSize: '0.8125rem', 
                    color: '#18181b', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '12rem'
                  }}>
                    {item.file.name}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#71717a' }}>
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    {item.status === 'error' && item.error && (
                      <span style={{ color: '#dc2626' }}> • {item.error}</span>
                    )}
                  </p>
                </div>
              </div>

              {item.status === 'pending' && !isUploading && (
                <button
                  onClick={() => removeFile(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '0.25rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer'
                  }}
                >
                  <X style={{ width: '0.875rem', height: '0.875rem' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <button
          onClick={handleUploadAll}
          disabled={isUploading}
          style={{
            width: '100%',
            padding: '0.625rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: isUploading ? '#a1a1aa' : '#18181b',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: 'none',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {isUploading ? (
            <>
              <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
              {replaceMode ? 'Replacing...' : 'Uploading...'}
            </>
          ) : (
            <>
              <UploadCloud style={{ width: '1rem', height: '1rem' }} />
              {replaceMode 
                ? `Replace All with ${pendingCount} Receipt${pendingCount > 1 ? 's' : ''}`
                : `Upload ${pendingCount} Receipt${pendingCount > 1 ? 's' : ''}`
              }
            </>
          )}
        </button>
      )}

      {/* Success Summary */}
      {successCount > 0 && pendingCount === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0'
          }}
        >
          <CheckCircle style={{ width: '1rem', height: '1rem', color: '#16a34a' }} />
          <span style={{ fontSize: '0.875rem', color: '#15803d', fontWeight: 500 }}>
            {successCount} receipt{successCount > 1 ? 's' : ''} uploaded successfully
          </span>
        </div>
      )}
    </div>
  )
}
