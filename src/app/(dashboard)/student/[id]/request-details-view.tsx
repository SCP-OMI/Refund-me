"use client"

import { deleteRefundRequest, getRefundRequestById, rejectReceipt, updateRefundStatus } from "@/actions/refunds"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { ReceiptList } from "@/components/receipt-list"
import { AuditHistory } from "@/components/staff/audit-history"
import { RequestStatus, StatusBadge } from "@/components/status-badge"
import { MultiReceiptUpload } from "@/components/student/multi-receipt-upload"
import { CheckCircle2, Download, FileText, Loader2, Plus, Trash2, XCircle } from "lucide-react"

interface Receipt {
    id: string
    url: string
    amount: number
    createdAt: string
}

interface RequestDetailsViewProps {
    request: {
        id: string
        title: string
        amount: number
        totalAmount?: number
        date: string
        status: string
        category: string
        description: string | null
        receiptUrl: string | null
        receipts: Receipt[]
        staffNote?: string | null
        user: {
            name: string | null
            email: string
            image: string | null
        }
        certificate?: {
            id: string
            name: string
            provider: string
            fixedCost: number
            currency: string
        } | null
    }
    isStaff?: boolean
}

export function RequestDetailsView({ request: initialRequest, isStaff = false }: RequestDetailsViewProps) {
    const printRef = useRef<HTMLDivElement>(null)
    const queryClient = useQueryClient()
    const router = useRouter()
    const [showHistory, setShowHistory] = useState(false)

    // Staff action states
    const [isPending, startTransition] = useTransition()
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [showApproveEstimateDialog, setShowApproveEstimateDialog] = useState(false)
    const [showDeclineDialog, setShowDeclineDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showRequestMoreDialog, setShowRequestMoreDialog] = useState(false)
    const [rejectReason, setRejectReason] = useState("")
    const [declineReason, setDeclineReason] = useState("")
    const [requestMoreReason, setRequestMoreReason] = useState("")
    const [deleteReason, setDeleteReason] = useState("")
    const [finalAmount, setFinalAmount] = useState("")

    // Use Query for real-time data
    const { data: request } = useQuery({
        queryKey: ["refund", initialRequest.id],
        queryFn: async () => {
            const updated = await getRefundRequestById(initialRequest.id)
            if (!updated) throw new Error("Request not found")
            return {
                id: updated.id,
                title: updated.title,
                amount: updated.amountEst,
                totalAmount: updated.totalAmount,
                date: updated.createdAt.toISOString(),
                status: updated.status,
                category: updated.type,
                description: updated.description,
                receiptUrl: updated.receipts?.[0]?.url || null,
                staffNote: updated.staffNote,
                receipts: (updated.receipts || []).map((r: { id: string; url: string; amount: number; createdAt: Date | string }) => ({
                    id: r.id,
                    url: r.url,
                    amount: r.amount,
                    createdAt: typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toISOString()
                })),
                user: updated.user,
                certificate: updated.certificate
            }
        },
        initialData: initialRequest
    })

    const status = request.status as RequestStatus
    const receipts = request.receipts || []
    const receiptTotalDH = request.totalAmount || receipts.reduce((sum: number, r: Receipt) => sum + r.amount, 0)

    const handleUploadComplete = () => {
        queryClient.invalidateQueries({ queryKey: ["refund", request.id] })
        queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
    }


    // Staff action handlers
    const handleRejectReceipt = () => {
        setShowRejectDialog(true)
    }

    const confirmReject = () => {
        startTransition(async () => {
            await rejectReceipt(request.id, rejectReason)
            queryClient.invalidateQueries({ queryKey: ["refund", request.id] })
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
        setShowRejectDialog(false)
        setRejectReason("")
    }

    const handleVerifyPay = () => {
        // Use receipt total if staff has set amounts, otherwise use estimate
        const defaultAmount = receiptTotalDH > 0 ? receiptTotalDH : request.amount
        setFinalAmount(defaultAmount.toString())
        setShowApproveDialog(true)
    }

    const confirmVerifyPay = () => {
        startTransition(async () => {
            const amount = parseFloat(finalAmount)
            await updateRefundStatus(request.id, "READY_TO_PAY", undefined, isNaN(amount) ? undefined : amount)
            queryClient.invalidateQueries({ queryKey: ["refund", request.id] })
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
        setShowApproveDialog(false)
    }

    const handleDelete = () => {
        setShowDeleteDialog(true)
    }

    const confirmDelete = () => {
        startTransition(async () => {
            try {
                await deleteRefundRequest(request.id, deleteReason.trim() || undefined)
                router.push(isStaff ? '/staff' : '/student')
            } catch (error) {
                console.error('Delete failed:', error)
                // Could add toast notification here
            }
        })
        setShowDeleteDialog(false)
        setDeleteReason("")
    }

    const handleRequestMore = () => {
        setShowRequestMoreDialog(true)
    }

    const confirmRequestMore = () => {
        startTransition(async () => {
            const reason = requestMoreReason.trim() || "Staff requested additional receipt(s)"
            await updateRefundStatus(request.id, "PENDING_RECEIPTS", reason)
            queryClient.invalidateQueries({ queryKey: ["refund", request.id] })
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
        setShowRequestMoreDialog(false)
        setRequestMoreReason("")
    }

    // Approve estimate - moves to PENDING_RECEIPTS
    const handleApproveEstimate = () => {
        setShowApproveEstimateDialog(true)
    }

    const confirmApproveEstimate = () => {
        startTransition(async () => {
            await updateRefundStatus(request.id, "PENDING_RECEIPTS")
            queryClient.invalidateQueries({ queryKey: ["refund", request.id] })
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
        setShowApproveEstimateDialog(false)
    }

    // Decline estimate - moves to DECLINED
    const handleDeclineEstimate = () => {
        setShowDeclineDialog(true)
    }

    const confirmDeclineEstimate = () => {
        startTransition(async () => {
            await updateRefundStatus(request.id, "DECLINED", declineReason || undefined)
            queryClient.invalidateQueries({ queryKey: ["refund", request.id] })
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
        setShowDeclineDialog(false)
        setDeclineReason("")
    }

    const handleDownloadPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf')

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const pageWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const margin = 20
            const contentWidth = pageWidth - (margin * 2)
            let yPos = margin

            const dateFormatted = new Date(request.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })

            // ========================================
            // HEADER - Clean style matching export
            // ========================================

            // Logo on left
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
                doc.text('1337', margin, yPos + 6)
            }

            // Title on right
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(14)
            doc.setTextColor(0, 0, 0)
            doc.text('Refund Request', pageWidth - margin, yPos + 3, { align: 'right' })

            // Request ID and date
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text(`#${request.id.slice(0, 8)} • ${dateFormatted}`, pageWidth - margin, yPos + 10, { align: 'right' })

            yPos += 20

            // Separator line
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.5)
            doc.line(margin, yPos, pageWidth - margin, yPos)

            yPos += 12

            // ========================================
            // REQUEST DETAILS - Simple table style
            // ========================================

            // Title
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(16)
            doc.setTextColor(0, 0, 0)
            doc.text(request.title, margin, yPos)
            yPos += 10

            // Status badge
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            const statusText = status
            const statusColor = status === 'READY_TO_PAY' || status === 'FULLY_PAID' ? [22, 163, 74] : status === 'DECLINED' ? [220, 38, 38] : [0, 0, 0]
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
            doc.text(statusText, margin, yPos)
            yPos += 15

            // Details table
            const detailsData = [
                ['Submitted By', request.user.name || 'Unknown'],
                ['Email', request.user.email],
                ['Category', request.category],
                ['Date Submitted', new Date(request.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                ['Status', status]
            ]

            detailsData.forEach(([label, value]) => {
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(9)
                doc.setTextColor(100, 100, 100)
                doc.text(label, margin, yPos)

                doc.setFont('helvetica', 'bold')
                doc.setTextColor(0, 0, 0)
                doc.text(value, margin + 45, yPos)
                yPos += 7
            })

            yPos += 8

            // Description box
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.2)
            doc.rect(margin, yPos, contentWidth, 30)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text('DESCRIPTION', margin + 5, yPos + 7)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(10)
            doc.setTextColor(0, 0, 0)
            const descriptionLines = doc.splitTextToSize(request.description || 'No description provided', contentWidth - 10)
            doc.text(descriptionLines, margin + 5, yPos + 15)

            yPos += 40

            // ========================================
            // AMOUNT BOX
            // ========================================
            doc.setDrawColor(0, 0, 0)
            doc.setLineWidth(0.3)
            doc.rect(margin, yPos, contentWidth, 20)

            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.setTextColor(0, 0, 0)
            doc.text('Amount:', margin + 5, yPos + 12)

            doc.setFontSize(14)
            doc.text(`${request.amount.toFixed(2)} DH`, pageWidth - margin - 5, yPos + 12, { align: 'right' })

            yPos += 30

            // ========================================
            // RECEIPT SECTION (if exists)
            // ========================================
            if (request.receiptUrl) {
                const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(request.receiptUrl)

                if (isImage) {
                    // Add receipt on a new page for proper sizing
                    doc.addPage()
                    let receiptY = margin

                    // Header for receipt page
                    try {
                        const response = await fetch('/1337.png')
                        const blob = await response.blob()
                        const logoBase64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader()
                            reader.onloadend = () => resolve(reader.result as string)
                            reader.readAsDataURL(blob)
                        })
                        doc.addImage(logoBase64, 'PNG', margin, receiptY, 30, 8)
                    } catch {
                        doc.setFont('helvetica', 'bold')
                        doc.setFontSize(20)
                        doc.setTextColor(0, 0, 0)
                        doc.text('1337', margin, receiptY + 6)
                    }

                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(14)
                    doc.setTextColor(0, 0, 0)
                    doc.text('Receipt Attachment', pageWidth - margin, receiptY + 3, { align: 'right' })

                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(9)
                    doc.setTextColor(100, 100, 100)
                    doc.text(`${request.title}`, pageWidth - margin, receiptY + 10, { align: 'right' })

                    receiptY += 20

                    // Separator line
                    doc.setDrawColor(0, 0, 0)
                    doc.setLineWidth(0.5)
                    doc.line(margin, receiptY, pageWidth - margin, receiptY)

                    receiptY += 15

                    // Try to embed the actual image
                    try {
                        const response = await fetch(request.receiptUrl)
                        const blob = await response.blob()
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader()
                            reader.onloadend = () => resolve(reader.result as string)
                            reader.readAsDataURL(blob)
                        })

                        // Calculate available space (page height minus margins and footer)
                        const availableHeight = pageHeight - receiptY - 25

                        // Add image - jsPDF will auto-scale maintaining aspect ratio
                        doc.addImage(base64, 'JPEG', margin, receiptY, contentWidth, availableHeight, undefined, 'FAST')

                    } catch {
                        // Fallback to link if image fetch fails
                        doc.setFont('helvetica', 'normal')
                        doc.setFontSize(10)
                        doc.setTextColor(0, 0, 0)
                        doc.text('Image could not be loaded. View online:', margin, receiptY + 10)

                        doc.setTextColor(0, 0, 255)
                        doc.textWithLink(request.receiptUrl, margin, receiptY + 18, { url: request.receiptUrl })
                    }

                    // Footer for receipt page
                    doc.setDrawColor(200, 200, 200)
                    doc.setLineWidth(0.2)
                    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(8)
                    doc.setTextColor(100, 100, 100)
                    doc.text('1337 Refund Management System', margin, pageHeight - 10)
                    doc.text('Page 2', pageWidth - margin, pageHeight - 10, { align: 'right' })

                } else {
                    // For PDFs and other files, show link on same page
                    doc.setDrawColor(200, 200, 200)
                    doc.setLineWidth(0.2)
                    doc.rect(margin, yPos, contentWidth, 25)

                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(9)
                    doc.setTextColor(100, 100, 100)
                    doc.text('RECEIPT ATTACHMENT (PDF)', margin + 5, yPos + 7)

                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(9)
                    doc.setTextColor(0, 0, 255)
                    const displayUrl = request.receiptUrl.length > 70
                        ? request.receiptUrl.substring(0, 67) + '...'
                        : request.receiptUrl
                    doc.textWithLink(displayUrl, margin + 5, yPos + 17, { url: request.receiptUrl })
                }
            }

            // ========================================
            // FOOTER (Page 1)
            // ========================================
            doc.setPage(1)
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.2)
            doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(100, 100, 100)
            doc.text('1337 Refund Management System', margin, pageHeight - 10)
            const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
            doc.text(`Page 1${totalPages > 1 ? ` of ${totalPages}` : ''} • Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, pageWidth - margin, pageHeight - 10, { align: 'right' })

            // Save the PDF
            doc.save(`refund-${request.id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`)

        } catch (error) {
            console.error('Failed to generate PDF:', error)
            alert('PDF generation failed. Please try again.')
        }
    }

    return (
        <div style={{ maxWidth: '64rem', margin: '0 auto' }} ref={printRef}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '1rem', 
                marginBottom: '2rem', 
                padding: '0 0.5rem' // Mobile padding
            }}>
                {/* Title and Status Section */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: 600, 
                            color: '#18181b', 
                            letterSpacing: '-0.025em',
                            margin: 0,
                            lineHeight: 1.3,
                            flex: '1 1 auto',
                            minWidth: '200px'
                        }}>
                            {request.title}
                        </h1>
                        <div style={{ flexShrink: 0 }}>
                            <StatusBadge status={status} />
                        </div>
                    </div>
                    
                    {/* Subtitle with key info */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginTop: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#71717a'
                    }}>
                        <span>{request.category}</span>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#d4d4d8' }} />
                        <span suppressHydrationWarning>
                            {new Date(request.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Action Buttons Bar - Separate from header for better mobile UX */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                padding: '0 0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* Staff Actions */}
                {isStaff && status !== 'READY_TO_PAY' && status !== 'FULLY_PAID' && status !== 'DECLINED' && (
                    <>
                        {/* ESTIMATED status: Show Approve/Decline buttons */}
                        {status === 'ESTIMATED' && (
                            <>
                                <button
                                    onClick={handleDeclineEstimate}
                                    disabled={isPending}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.5rem 0.875rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        backgroundColor: 'white',
                                        border: '1px solid #fca5a5',
                                        color: isPending ? '#a1a1aa' : '#dc2626',
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        transition: 'all 150ms'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = '#fef2f2'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = 'white'
                                        }
                                    }}
                                >
                                    {isPending ? 
                                        <Loader2 style={{ width: '0.875rem', height: '0.875rem' }} className="animate-spin" /> : 
                                        <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                    }
                                    Reject
                                </button>
                                <button
                                    onClick={handleApproveEstimate}
                                    disabled={isPending}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.5rem 0.875rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        backgroundColor: isPending ? '#52525b' : '#18181b',
                                        border: 'none',
                                        color: 'white',
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        transition: 'all 150ms'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = '#27272a'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = '#18181b'
                                        }
                                    }}
                                >
                                    {isPending ? 
                                        <Loader2 style={{ width: '0.875rem', height: '0.875rem' }} className="animate-spin" /> : 
                                        <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
                                    }
                                    Approve
                                </button>
                            </>
                        )}

                        {/* PENDING_RECEIPTS or VERIFIED_READY status: Show receipt action buttons */}
                        {(status === 'VERIFIED_READY' || status === 'PENDING_RECEIPTS') && (
                            <>
                                {/* Reject Receipt Button - disabled when waiting for receipts */}
                                <button
                                    onClick={handleRejectReceipt}
                                    disabled={isPending || status === 'PENDING_RECEIPTS'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.5rem 0.875rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        backgroundColor: 'white',
                                        border: '1px solid #fca5a5',
                                        color: (isPending || status === 'PENDING_RECEIPTS') ? '#a1a1aa' : '#dc2626',
                                        cursor: (isPending || status === 'PENDING_RECEIPTS') ? 'not-allowed' : 'pointer',
                                        opacity: status === 'PENDING_RECEIPTS' ? 0.5 : 1,
                                        transition: 'all 150ms'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isPending && status !== 'PENDING_RECEIPTS') {
                                            e.currentTarget.style.backgroundColor = '#fef2f2'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isPending && status !== 'PENDING_RECEIPTS') {
                                            e.currentTarget.style.backgroundColor = 'white'
                                        }
                                    }}
                                    title={status === 'PENDING_RECEIPTS' ? 'Cannot reject while waiting for student to upload receipt' : 'Reject receipt and request re-upload'}
                                >
                                    {isPending ? 
                                        <Loader2 style={{ width: '0.875rem', height: '0.875rem' }} className="animate-spin" /> : 
                                        <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />
                                    }
                                    Reject Receipt
                                </button>
                                
                                {/* Request More Button */}
                                <button
                                    onClick={handleRequestMore}
                                    disabled={isPending}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.5rem 0.875rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        backgroundColor: 'white',
                                        border: '1px solid #fbbf24',
                                        color: isPending ? '#a1a1aa' : '#b45309',
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        transition: 'all 150ms'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = '#fffbeb'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = 'white'
                                        }
                                    }}
                                    title="Request additional receipts from student"
                                >
                                    {isPending ? 
                                        <Loader2 style={{ width: '0.875rem', height: '0.875rem' }} className="animate-spin" /> : 
                                        <Plus style={{ width: '0.875rem', height: '0.875rem' }} />
                                    }
                                    Request More
                                </button>
                                
                                {/* Verify & Pay Button */}
                                <button
                                    onClick={handleVerifyPay}
                                    disabled={isPending}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.5rem 0.875rem',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.8125rem',
                                        fontWeight: 500,
                                        backgroundColor: isPending ? '#52525b' : '#18181b',
                                        border: 'none',
                                        color: 'white',
                                        cursor: isPending ? 'not-allowed' : 'pointer',
                                        transition: 'all 150ms'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = '#27272a'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isPending) {
                                            e.currentTarget.style.backgroundColor = '#18181b'
                                        }
                                    }}
                                >
                                    {isPending ? 
                                        <Loader2 style={{ width: '0.875rem', height: '0.875rem' }} className="animate-spin" /> : 
                                        <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />
                                    }
                                    Verify & Pay
                                </button>
                            </>
                        )}
                    </>
                )}
                
                {/* Utility Buttons - Right side */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    {/* Delete button - show for staff only on non-paid requests */}
                    {isStaff && status !== 'READY_TO_PAY' && status !== 'FULLY_PAID' && (
                        <button
                            onClick={handleDelete}
                            title="Delete Request"
                            style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '0.375rem',
                                backgroundColor: 'white',
                                color: '#71717a',
                                border: '1px solid #e4e4e7',
                                cursor: 'pointer',
                                transition: 'all 150ms'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#fafafa'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white'
                            }}
                        >
                            <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                    )}

                    {/* Download button */}
                    {(status === 'READY_TO_PAY' || status === 'FULLY_PAID' || status === 'REJECTED' || status === 'DECLINED') && (
                        <button
                            onClick={handleDownloadPDF}
                            title="Download as PDF"
                            style={{
                                width: '2.25rem',
                                height: '2.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '0.375rem',
                                backgroundColor: '#18181b',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 150ms'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#27272a'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#18181b'
                            }}
                        >
                            <Download style={{ width: '0.875rem', height: '0.875rem' }} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {/* @media query alternative: Use CSS classes for responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 flex flex-col gap-6">

                        {/* Rejection Reason - Show for DECLINED status */}
                        {status === "DECLINED" && request.staffNote && (
                            <div
                                style={{
                                    backgroundColor: '#fef2f2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '0.75rem',
                                    padding: '1.5rem',
                                    marginBottom: '1rem'
                                }}
                            >
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>
                                    Rejection Reason
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                                    {request.staffNote}
                                </p>
                            </div>
                        )}

                        {/* Status Action Card - Only show upload for request owner (not staff) */}
                        {status === "PENDING_RECEIPTS" && !isStaff && (
                            <div
                                style={{
                                    backgroundColor: receipts.length > 0 ? '#fff7ed' : '#fffbeb',
                                    border: receipts.length > 0 ? '1px solid #fdba74' : '1px solid #fde68a',
                                    borderRadius: '0.75rem',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    gap: '1rem',
                                    marginBottom: '1rem'
                                }}
                            >
                                <div style={{
                                    width: '2.5rem',
                                    height: '2.5rem',
                                    borderRadius: '50%',
                                    backgroundColor: receipts.length > 0 ? '#f97316' : '#fbbf24',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <FileText style={{ width: '1.25rem', height: '1.25rem', color: 'white' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: receipts.length > 0 ? '#c2410c' : '#92400e', marginBottom: '0.25rem' }}>
                                        {receipts.length > 0 ? 'Additional Receipt Requested' : 'Action Required'}
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: receipts.length > 0 ? '#ea580c' : '#a16207', marginBottom: '1rem' }}>
                                        {receipts.length > 0
                                            ? 'Staff has requested additional receipt(s). Please upload more documentation to proceed.'
                                            : 'Please upload your receipt(s) for this expense to proceed with verification.'
                                        }
                                    </p>
                                    <MultiReceiptUpload
                                        requestId={request.id}
                                        onUploadComplete={handleUploadComplete}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Receipt List - Show for all statuses after receipts are uploaded */}
                        {receipts.length > 0 && (
                            <div
                                style={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e4e4e7',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                    overflow: 'hidden',
                                    marginBottom: '1rem'
                                }}
                            >
                                <div style={{
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid #f4f4f5',
                                    backgroundColor: '#fafafa',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Receipts
                                    </h3>
                                    {receiptTotalDH > 0 && (
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18181b' }}>
                                            Total: {receiptTotalDH.toFixed(2)} DH
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: '1rem 1.5rem' }}>
                                    <ReceiptList
                                        receipts={receipts.map((r: Receipt) => ({ ...r, createdAt: new Date(r.createdAt) }))}
                                        isStaff={isStaff}
                                        currency={request.certificate?.currency || 'DH'}
                                        onUpdate={handleUploadComplete}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Replace All Receipts Section - Show for students when receipts exist and status allows updates */}
                        {!isStaff && receipts.length > 0 && (status === 'ESTIMATED' || status === 'PENDING_RECEIPTS' || status === 'VERIFIED_READY') && (
                            <div
                                style={{
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid #fde68a',
                                    borderRadius: '0.75rem',
                                    padding: '1.5rem',
                                    marginBottom: '1rem'
                                }}
                            >
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>
                                    Replace All Receipts
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#a16207', marginBottom: '1rem' }}>
                                    Upload new receipt(s) to replace all existing receipts. This will permanently delete all current receipts and replace them with your new uploads.
                                </p>
                                <MultiReceiptUpload
                                    requestId={request.id}
                                    onUploadComplete={handleUploadComplete}
                                    replaceMode={true}
                                />
                            </div>
                        )}


                        {/* Details Card */}
                        <div
                            style={{
                                backgroundColor: 'white',
                                border: '1px solid #e4e4e7',
                                borderRadius: '0.75rem',
                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid #f4f4f5',
                                backgroundColor: '#fafafa'
                            }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Expense Details
                                </h3>
                            </div>
                            <div style={{ padding: '1.5rem' }}>
                                {(() => {
                                    const currency = request.certificate?.currency || (request.category === 'CERTIFICATION' ? 'USD' : 'DH');
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Row 1: Reference & Category */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Category</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18181b' }}>{request.category}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 2: Amounts */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Submitted</div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#18181b' }} suppressHydrationWarning>
                                                        {new Date(request.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 3: Date & Status */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Estimate</div>
                                                    {request.category === 'CERTIFICATION' && request.certificate && request.certificate.fixedCost > 300 ? (
                                                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#52525b' }}>
                                                            Refund: 300 {currency} — You pay {request.certificate.fixedCost - 300} {currency} yourself
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#52525b' }}>
                                                            {request.amount.toFixed(2)} <span style={{ color: '#a1a1aa' }}>{currency}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 500, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Total Amount</div>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#18181b' }}>
                                                        {receiptTotalDH.toFixed(2)} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#71717a' }}>DH</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{ height: '1px', backgroundColor: '#f4f4f5', margin: '1.5rem 0' }} />

                                <div>
                                    <div style={{ color: '#71717a', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                                        Description
                                    </div>
                                    <div
                                        style={{
                                            padding: '1rem 1.25rem',
                                            backgroundColor: '#fafafa',
                                            borderRadius: '0.5rem',
                                            fontSize: '0.875rem',
                                            color: '#3f3f46',
                                            lineHeight: 1.6,
                                            border: '1px solid #f4f4f5'
                                        }}
                                    >
                                        {request.description || "No description provided."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audit History - For all users */}
                        <AuditHistory
                            refundId={request.id}
                            isOpen={showHistory}
                            onToggle={() => setShowHistory(!showHistory)}
                        />
                    </div>
                </div>
            </div>

            {/* Reject Dialog */}
            {showRejectDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}
                    onClick={() => setShowRejectDialog(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '24rem',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontWeight: 600, color: '#18181b', marginBottom: '0.5rem' }}>
                            Reject Receipt
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Please provide a reason for rejecting this receipt. The student will be notified.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            style={{
                                width: '100%',
                                minHeight: '5rem',
                                padding: '0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #e4e4e7',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                marginBottom: '1rem'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowRejectDialog(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={!rejectReason.trim()}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: rejectReason.trim() ? '#dc2626' : '#fca5a5',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: rejectReason.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Reject Receipt
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Decline Estimate Dialog */}
            {showDeclineDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}
                    onClick={() => setShowDeclineDialog(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '24rem',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontWeight: 600, color: '#18181b', marginBottom: '0.5rem' }}>
                            Reject Request
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Please provide a reason for rejecting &quot;{request.title}&quot;
                        </p>
                        <textarea
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            style={{
                                width: '100%',
                                minHeight: '5rem',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #e4e4e7',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                marginBottom: '1rem'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowDeclineDialog(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeclineEstimate}
                                disabled={!declineReason.trim()}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: declineReason.trim() ? '#dc2626' : '#fca5a5',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: declineReason.trim() ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Reject Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve Estimate Confirmation Dialog */}
            {showApproveEstimateDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}
                    onClick={() => setShowApproveEstimateDialog(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '24rem',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontWeight: 600, color: '#18181b', marginBottom: '0.5rem' }}>
                            Confirm Approval
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Are you sure you want to approve this estimate? The student will be notified to upload their receipt.
                        </p>

                        {/* Request Details */}
                        <div style={{
                            backgroundColor: '#f4f4f5',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <p style={{ fontWeight: 500, color: '#18181b', fontSize: '0.875rem' }}>
                                {request.title}
                            </p>
                            <p style={{ color: '#71717a', fontSize: '0.8125rem' }}>
                                {request.user?.name || request.user?.email} • Estimated: {request.amount.toFixed(2)} {request.certificate?.currency || 'Dhs'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowApproveEstimateDialog(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmApproveEstimate}
                                disabled={isPending}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isPending ? '#52525b' : '#18181b',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem'
                                }}
                            >
                                {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verify & Pay Dialog */}
            {showApproveDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}
                    onClick={() => setShowApproveDialog(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '24rem',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontWeight: 600, color: '#18181b', marginBottom: '0.5rem' }}>
                            Set Final Refund Amount
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Enter the final refund amount. The student will be notified that their refund is ready.
                        </p>

                        {/* Request Details */}
                        <div style={{
                            backgroundColor: '#f4f4f5',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <p style={{ fontWeight: 500, color: '#18181b', fontSize: '0.875rem' }}>
                                {request.title}
                            </p>
                            <p style={{ color: '#71717a', fontSize: '0.8125rem' }}>
                                {request.user?.name || request.user?.email} • Estimated: {request.amount.toFixed(2)} {request.certificate?.currency || (request.category === 'CERTIFICATION' ? 'USD' : 'DH')}
                                {receiptTotalDH > 0 && (
                                    <> • Receipt Total: <span style={{ fontWeight: 600, color: '#18181b' }}>{receiptTotalDH.toFixed(2)}</span> DH</>
                                )}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#18181b',
                                marginBottom: '0.375rem'
                            }}>
                                Final Refund Amount (DH)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={finalAmount}
                                onChange={(e) => setFinalAmount(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.625rem 0.75rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowApproveDialog(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmVerifyPay}
                                disabled={isPending}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isPending ? '#52525b' : '#18181b',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem'
                                }}
                            >
                                {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                                Mark as Paid
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}
                    onClick={() => setShowDeleteDialog(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '24rem',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '50%',
                                backgroundColor: '#fef2f2',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Trash2 style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 600, color: '#18181b', margin: 0, marginBottom: '0.25rem' }}>
                                    Delete Request
                                </h3>
                                <p style={{ color: '#71717a', fontSize: '0.875rem', margin: 0 }}>
                                    This action cannot be undone
                                </p>
                            </div>
                        </div>
                        
                        <div style={{ 
                            padding: '1rem',
                            backgroundColor: '#fafafa',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            border: '1px solid #f4f4f5'
                        }}>
                            <p style={{ fontSize: '0.875rem', color: '#52525b', margin: 0, marginBottom: '0.5rem' }}>
                                <strong>{request.title}</strong>
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#71717a', margin: 0 }}>
                                Amount: {request.amount.toFixed(2)} {request.certificate?.currency || 'DH'}
                            </p>
                        </div>

                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                            Please provide a reason for deleting this request. The student will be notified.
                        </p>

                        <textarea
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            placeholder="Enter reason for deletion..."
                            style={{
                                width: '100%',
                                minHeight: '5rem',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #e4e4e7',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                marginBottom: '1rem'
                            }}
                        />

                        <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                            This action cannot be undone. All associated data including receipts and history will be permanently removed.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowDeleteDialog(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isPending}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: isPending ? '#fca5a5' : '#dc2626',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem'
                                }}
                            >
                                {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                                Delete Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request More Confirmation Dialog */}
            {showRequestMoreDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}
                    onClick={() => setShowRequestMoreDialog(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.75rem',
                            padding: '1.5rem',
                            width: '100%',
                            maxWidth: '24rem',
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontWeight: 600, color: '#18181b', marginBottom: '0.5rem' }}>
                            Request Additional Receipt
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Please provide a reason for requesting additional receipt(s). The student will be notified.
                        </p>

                        {/* Request Details */}
                        <div style={{
                            backgroundColor: '#f4f4f5',
                            borderRadius: '0.5rem',
                            padding: '0.75rem',
                            marginBottom: '1rem'
                        }}>
                            <p style={{ fontWeight: 500, color: '#18181b', fontSize: '0.875rem' }}>
                                {request.title}
                            </p>
                            <p style={{ color: '#71717a', fontSize: '0.8125rem' }}>
                                {request.user?.name || request.user?.email} • {receipts.length} receipt(s) uploaded
                            </p>
                        </div>

                        <textarea
                            value={requestMoreReason}
                            onChange={(e) => setRequestMoreReason(e.target.value)}
                            placeholder="Enter reason for requesting more receipts..."
                            style={{
                                width: '100%',
                                minHeight: '5rem',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid #e4e4e7',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                marginBottom: '1rem'
                            }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowRequestMoreDialog(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRequestMore}
                                disabled={isPending}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #fbbf24',
                                    backgroundColor: isPending ? '#fef3c7' : 'white',
                                    color: '#b45309',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: isPending ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem'
                                }}
                            >
                                {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <Plus style={{ width: '0.875rem', height: '0.875rem' }} />}
                                Request More
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
