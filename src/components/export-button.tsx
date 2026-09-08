"use client"

import {Download, Loader2, X, FileText, FileSpreadsheet} from "lucide-react"
import {useState} from "react"
import type {ExportData} from "@/actions/export-pdf"

interface ExportButtonProps {
    onExport: (options: { includeRefunded: boolean; includeWaiting: boolean }) => Promise<ExportData>
    disabled?: boolean
}

type ExportType = 'PDF' | 'CSV'
type StatusFilter = 'REFUNDED' | 'PENDING' | 'BOTH'

export function ExportButton({ onExport, disabled }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)
    const [showDialog, setShowDialog] = useState(false)
    const [exportType, setExportType] = useState<ExportType>('PDF')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('BOTH')

    const handleExport = async () => {
        setIsExporting(true)
        setShowDialog(false)

        try {
            const includeRefunded = statusFilter === 'REFUNDED' || statusFilter === 'BOTH'
            const includeWaiting = statusFilter === 'PENDING' || statusFilter === 'BOTH'

            const data = await onExport({ includeRefunded, includeWaiting })

            if (exportType === 'CSV') {
                exportToCSV(data)
            } else {
                await exportToPDF(data)
            }
        } catch (error) {
            console.error('Export failed:', error)
            alert('Export failed. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    const exportToCSV = (data: ExportData) => {
        const headers = ['#', 'Full Name', 'Refund Type', 'Amount (DH)', 'Date', 'Status']
        const rows = data.items.map((item, index) => [
            (index + 1).toString(),
            `"${item.fullName.replace(/"/g, '""')}"`,
            `"${item.refundType}"`,
            item.amount.toString(),
            new Date(item.dateCreated).toLocaleDateString('en-US'),
            item.isRefunded ? 'Refunded' : 'Pending'
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `refund-report-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const exportToPDF = async (data: ExportData) => {
        const {jsPDF} = await import('jspdf')
        const {default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF({orientation: 'portrait',unit: 'mm',format: 'a4'})

        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 20
        let yPos = margin

        try {
            const response = await fetch('/1337.png')
            const blob = await response.blob()
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(blob)
            })
            doc.addImage(base64, 'PNG', margin, yPos, 30, 8)
        } catch {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(20)
            doc.setTextColor(0, 0, 0)
            doc.text('1337', margin, yPos + 8)
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text('Refund Analytic Report', pageWidth - margin, yPos + 3, { align: 'right' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        const startDate = data.summary.dateRange.start.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        const endDate = data.summary.dateRange.end.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
        doc.text(`From ${startDate} to ${endDate}`, pageWidth - margin, yPos + 10, { align: 'right' })

        yPos += 20

        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.line(margin, yPos, pageWidth - margin, yPos)

        yPos += 15

        const tableData = data.items.map((item, index) => [
            (index + 1).toString(),
            item.fullName,
            item.refundType,
            `${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} DH`,
            new Date(item.dateCreated).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            item.isRefunded ? 'Refunded' : 'Pending'
        ])

        const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0)

        autoTable(doc, {
            startY: yPos,
            head: [['#', 'Full Name', 'Refund Type', 'Amount', 'Date', 'Status']],
            body: tableData,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: [0, 0, 0],
                lineColor: [0, 0, 0],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                lineWidth: 0.3,
                lineColor: [0, 0, 0]
            },
            bodyStyles: {
                fillColor: [255, 255, 255]
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 45 },
                2: { cellWidth: 40 },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 22, halign: 'center' }
            },
            margin: { left: margin, right: margin },
            didDrawPage: () => {
                const pageNum = (doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }).internal.getCurrentPageInfo().pageNumber
                const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()

                doc.setFont('helvetica', 'normal')
                doc.setFontSize(8)
                doc.setTextColor(100, 100, 100)
                doc.text('1337 Refund Management System', margin, pageHeight - 10)
                doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
                doc.text(`${data.items.length} records`, pageWidth - margin, pageHeight - 10, { align: 'right' })
            }
        })

        const finalY = (doc as unknown as { lastAutoTable: { finalY?: number } }).lastAutoTable.finalY || yPos + 50

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        doc.text('Total Amount:', pageWidth - margin - 50, finalY + 10)
        doc.text(`${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} DH`, pageWidth - margin, finalY + 10, { align: 'right' })

        doc.save(`refund-report-${new Date().toISOString().split('T')[0]}.pdf`)
    }

    return (
        <>
            <button
                onClick={() => setShowDialog(true)}
                disabled={disabled || isExporting}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#18181b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
                    opacity: disabled || isExporting ? 0.7 : 1,
                    transition: 'all 150ms'
                }}
            >
                {isExporting ? (
                    <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                ) : (
                    <Download style={{ width: '1rem', height: '1rem' }} />
                )}
                {isExporting ? 'Exporting...' : 'Export Report'}
            </button>

            {showDialog && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            backdropFilter: 'blur(2px)',
                            zIndex: 50
                        }}
                        onClick={() => setShowDialog(false)}
                    />

                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'white',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            width: 'calc(100% - 2rem)',
                            maxWidth: '360px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            zIndex: 51,
                            border: '1px solid #e4e4e7'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#18181b', margin: 0 }}>Export Options</h3>
                            <button
                                onClick={() => setShowDialog(false)}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    padding: 0, 
                                    color: '#71717a', 
                                    borderRadius: '0.375rem', 
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '2.25rem',
                                    height: '2.25rem',
                                    transition: 'all 150ms'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f4f4f5'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X style={{ width: '1.25rem', height: '1.25rem' }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                            {/* Export Type Selector */}
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Export Format</p>
                                <div style={{ display: 'flex', padding: '0.25rem', backgroundColor: '#f4f4f5', borderRadius: '0.625rem', gap: '0.25rem' }}>
                                    {(['PDF', 'CSV'] as ExportType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setExportType(type)}
                                            style={{
                                                flex: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem',
                                                borderRadius: '0.4rem',
                                                border: 'none',
                                                fontSize: '0.8125rem',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                                                backgroundColor: exportType === type ? 'white' : 'transparent',
                                                color: exportType === type ? '#18181b' : '#71717a',
                                                boxShadow: exportType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                            }}
                                        >
                                            {type === 'PDF' ? <FileText size={14} /> : <FileSpreadsheet size={14} />}
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status Selector */}
                            <div>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>Status Filters</p>
                                <div style={{ display: 'flex', padding: '0.25rem', backgroundColor: '#f4f4f5', borderRadius: '0.625rem', gap: '0.25rem' }}>
                                    {(['REFUNDED', 'PENDING', 'BOTH'] as StatusFilter[]).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => setStatusFilter(status)}
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                borderRadius: '0.4rem',
                                                border: 'none',
                                                fontSize: '0.8125rem',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                                                backgroundColor: statusFilter === status ? 'white' : 'transparent',
                                                color: statusFilter === status ? '#18181b' : '#71717a',
                                                boxShadow: statusFilter === status ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                            }}
                                        >
                                            {status.charAt(0) + status.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowDialog(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    backgroundColor: 'white',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#3f3f46',
                                    cursor: 'pointer',
                                    transition: 'all 150ms'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExport}
                                style={{
                                    flex: 1.5,
                                    padding: '0.875rem',
                                    backgroundColor: '#18181b',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 150ms'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#18181b'}
                            >
                                Export {exportType}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    )
}
