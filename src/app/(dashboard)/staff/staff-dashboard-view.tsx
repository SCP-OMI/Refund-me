"use client"

import { getAllRefundRequests, getStaffTabCounts, rejectReceipt, updateRefundStatus } from "@/actions/refunds";
import { getTodaysPaidAmount } from "@/actions/analytics";
import { Pagination } from "@/components/ui/pagination";
import { PaginatedResult } from "@/types/pagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Download, Eye, EyeOff, FileText, Loader2, MapPin, Plus, ReceiptText, X, XCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useEffect, useRef, useState, useTransition } from "react";

// Types
interface Receipt {
    id: string
    url: string
    amount: number
}

import { BonDeCaisseButton } from "@/components/staff/bon-de-caisse-button";
import { RefundStatus, RefundType } from "@prisma/client";

interface RefundRequest {
    id: string
    userId: string
    user: {
        name: string | null
        email: string
        image: string | null
    }
    title: string
    description: string | null
    amountEst: number
    amountFinal: number | null
    totalAmount: number
    receipts: Receipt[]
    createdAt: Date
    updatedAt: Date
    status: RefundStatus
    type: RefundType
    staffNote: string | null
    // Additional fields from schema
    targetDate: Date | null
    departure: string | null
    destination: string | null
    invoiceAddressedTo: string | null
    certificateId: string | null
    certificate?: {
        id: string
        name: string
        provider: string
        fixedCost: number
        currency: string
    } | null
}

interface TabCounts {
    Validation: number
    receipts: number
    payouts: number
    fullyPaid: number
    fails: number
}

const tabs = [
    { id: "Validation", label: "Validation" },
    { id: "Processing", label: "Processing" },
    { id: "Completed", label: "Completed" },
    { id: "FullyPaid", label: "Fully Paid" },
    { id: "Fails", label: "Fails" },
] as const

type TabId = typeof tabs[number]["id"]

interface StaffDashboardViewProps {
    initialData: PaginatedResult<RefundRequest>
    initialCounts: TabCounts
}

export function StaffDashboardView({ initialData, initialCounts }: StaffDashboardViewProps) {
    const queryClient = useQueryClient()
    const [isPending, startTransition] = useTransition()

    const [activeTab, setActiveTab] = useQueryState(
        'tab',
        parseAsStringLiteral(['Validation', 'Processing', 'Completed', 'FullyPaid', 'Fails'] as const)
            .withDefault('Validation')
    )

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const { data: counts } = useQuery({
        queryKey: ["staffTabCounts"],
        queryFn: getStaffTabCounts,
        initialData: initialCounts
    })

    const { data: todaysPaidAmount } = useQuery({
        queryKey: ["todaysPaidAmount"],
        queryFn: getTodaysPaidAmount,
        initialData: 0,
        refetchInterval: 60000, // Refetch every minute
    })

    const { data: currentTabData, isLoading, isFetching } = useQuery({
        queryKey: ["refunds", { status: activeTab, page, pageSize }],
        queryFn: () => getAllRefundRequests({ page, pageSize, statusFilter: activeTab }),
        initialData: (activeTab === 'Validation' && page === 1) ? initialData : undefined,
        placeholderData: (previousData) => previousData,
    })

    const handleTabChange = (tab: TabId) => {
        startTransition(() => {
            setActiveTab(tab)
            setPage(1)
        })
    }

    const handlePageChange = (newPage: number) => {
        startTransition(() => {
            setPage(newPage)
        })
    }

    const handlePageSizeChange = (newPageSize: number) => {
        startTransition(() => {
            setPageSize(newPageSize)
            setPage(1)
        })
    }

    const displayData = currentTabData || {
        data: [],
        pagination: {
            page,
            pageSize,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
        }
    }

    const getContent = () => {
        // Only show loading spinner on initial load, not on tab switches
        if (isLoading && !currentTabData) {
            return (
                <div style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin" style={{ width: '1.5rem', height: '1.5rem', color: '#71717a' }} />
                </div>
            )
        }

        if (displayData.data.length === 0) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            backgroundColor: '#f4f4f5',
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <FileText style={{ width: '1.5rem', height: '1.5rem', color: '#a1a1aa' }} />
                        </div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#18181b' }}>No requests</h3>
                        <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem' }}>
                            There are no requests in this category.
                        </p>
                    </div>
                </div>
            )
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {displayData.data.map((request) => {
                    return (
                        <div
                            key={request.id}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: 0,
                                border: 'none',
                                background: 'transparent',
                            }}
                        >
                            {activeTab === 'Validation' ? (
                                <InboxCard request={request} type="estimate" />
                            ) : activeTab === 'Processing' ? (
                                <InboxCard request={request} type="receipt" />
                            ) : (
                                <InboxCard request={request} type="payout" />
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="staff-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <style>{`
                .staff-tabs {
                    display: flex;
                    width: 100%;
                    border-radius: 0.5rem;
                    background-color: #f4f4f5;
                    padding: 0.25rem;
                }
                .staff-tab {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.375rem;
                    padding: 0.5rem 0.5rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    border-radius: 0.375rem;
                    border: none;
                    cursor: pointer;
                    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                }
                .staff-tab-badge {
                    font-size: 0.6875rem;
                    padding: 0.125rem 0.375rem;
                    border-radius: 9999px;
                    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
                }
                @keyframes progressBar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
                @media (min-width: 480px) {
                    .staff-tabs {
                        display: inline-flex;
                        width: auto;
                    }
                    .staff-tab {
                        flex: none;
                        padding: 0.5rem 1rem;
                        font-size: 0.875rem;
                        gap: 0.5rem;
                    }
                    .staff-tab-badge {
                        font-size: 0.75rem;
                        padding: 0.125rem 0.5rem;
                    }
                }
            `}</style>

            {/* Tabs */}
            <div className="staff-tabs">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    // Map tab IDs to counts - tab names don't match count field names exactly
                    const countMap: Record<string, keyof typeof counts> = {
                        Validation: 'Validation',
                        Processing: 'receipts',
                        Completed: 'payouts',
                        Fails: 'fails'
                    }
                    const count = counts[countMap[tab.id]] || 0
                    
                    // For FullyPaid tab, show today's amount
                    const showTodayAmount = tab.id === 'FullyPaid' && todaysPaidAmount && todaysPaidAmount > 0
                    
                    return (
                        <button
                            key={tab.id}
                            className="staff-tab"
                            data-active={isActive}
                            onClick={() => handleTabChange(tab.id)}
                            style={{
                                backgroundColor: isActive ? 'white' : 'transparent',
                                color: isActive ? '#18181b' : '#71717a',
                                boxShadow: isActive ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none',
                                opacity: isPending && !isActive ? 0.5 : 1
                            }}
                        >
                            {tab.label}
                            {showTodayAmount && (
                                <span
                                    className="staff-tab-badge"
                                    style={{
                                        backgroundColor: isActive ? '#16a34a' : '#dcfce7',
                                        color: isActive ? 'white' : '#166534'
                                    }}
                                >
                                    {todaysPaidAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH Today
                                </span>
                            )}
                            {!showTodayAmount && count > 0 && (
                                <span
                                    className="staff-tab-badge"
                                    style={{
                                        backgroundColor: isActive ? '#18181b' : '#e4e4e7',
                                        color: isActive ? 'white' : '#71717a'
                                    }}
                                >
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Content */}
            <div className="staff-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', opacity: isPending ? 0.6 : 1, transition: 'opacity 150ms' }}>
                {(isFetching || isPending) && currentTabData && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: '#f4f4f5',
                        overflow: 'hidden',
                        borderRadius: '2px',
                        zIndex: 10
                    }}>
                        <div style={{
                            height: '100%',
                            backgroundColor: '#18181b',
                            animation: 'progressBar 1s ease-in-out infinite',
                            width: '30%'
                        }} />
                    </div>
                )}
                {getContent()}
            </div>

            {/* Pagination */}
            {displayData.data.length > 0 && (
                <Pagination
                    pagination={displayData.pagination}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    )
}



function PdfPreview({ url }: { url: string }) {
    const { data: blob, isLoading, isError } = useQuery({
        queryKey: ['pdf-blob', url],
        queryFn: async () => {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to load')
            return res.blob()
        },
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    })

    const [blobUrl, setBlobUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!blob) return

        const pdfBlob = new Blob([blob], { type: 'application/pdf' })
        const objectUrl = URL.createObjectURL(pdfBlob)
        setBlobUrl(objectUrl)

        return () => {
            URL.revokeObjectURL(objectUrl)
        }
    }, [blob])

    if (isError) {
        return (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f5', borderRadius: '0.5rem', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
                <p style={{ color: '#71717a', fontSize: '0.875rem' }}>Preview unavailable</p>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
                    Download PDF
                </a>
            </div>
        )
    }

    if (isLoading || !blobUrl) {
        return (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f5', borderRadius: '0.5rem' }}>
                <Loader2 className="animate-spin" style={{ width: '1.5rem', height: '1.5rem', color: '#71717a' }} />
            </div>
        )
    }

    return (
        <iframe
            src={blobUrl}
            title="PDF Preview"
            style={{
                width: '100%',
                height: '500px',
                border: 'none',
                borderRadius: '0.5rem',
                backgroundColor: 'white'
            }}
        />
    )
}

function InlineReceiptPreview({ url, label }: { url: string, label: string }) {
    const { data: blob, isLoading, isError } = useQuery({
        queryKey: ['inline-receipt-blob', url],
        queryFn: async () => {
            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to load receipt')
            return response.blob()
        },
        staleTime: Infinity,
        gcTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    })
    const [blobUrl, setBlobUrl] = useState<string | null>(null)
    const [isPreviewable, setIsPreviewable] = useState(true)

    useEffect(() => {
        if (!blob) return
        const extension = url.split('?')[0].split('.').pop()?.toLowerCase()
        const fallbackTypes: Record<string, string> = {
            pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv',
        }
        const mimeType = blob.type && blob.type !== 'application/octet-stream' ? blob.type : (fallbackTypes[extension || ''] || '')
        const canPreview = mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/')
        setIsPreviewable(canPreview)
        if (!canPreview) return

        const normalizedBlob = mimeType === blob.type ? blob : new Blob([blob], { type: mimeType })
        const objectUrl = URL.createObjectURL(normalizedBlob)
        setBlobUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [blob, url])

    if (isLoading) return <div className="staff-preview-file-state"><Loader2 className="animate-spin" /> Loading preview…</div>
    if (isError) return <div className="staff-preview-file-state">This receipt could not be loaded.</div>
    if (!isPreviewable) return <div className="staff-preview-file-state">This file type cannot be safely previewed in the browser.</div>
    if (!blobUrl) return null
    return <iframe src={blobUrl} title={label} />
}

function InboxCard({ request, type }: { request: RefundRequest, type: 'estimate' | 'receipt' | 'payout' }) {
    const isEstimate = type === 'estimate'
    const router = useRouter()
    const queryClient = useQueryClient()
    const [isPending, startTransition] = useTransition()
    const [showPreview, setShowPreview] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [showRequestMoreDialog, setShowRequestMoreDialog] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedReceiptIndex, setSelectedReceiptIndex] = useState<number | null>(null)
    const [rejectReason, setRejectReason] = useState("")
    const [requestMoreReason, setRequestMoreReason] = useState("")

    // Calculate receipt total from staff-entered amounts
    const receiptTotal = request.receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
    // Use receipt total if available and > 0, otherwise fall back to estimate
    const [finalAmount, setFinalAmount] = useState(
        receiptTotal > 0 ? receiptTotal.toString() : request.amountEst.toString()
    )
    const [isMobile, setIsMobile] = useState(false)
    const [mounted, setMounted] = useState(false)
    // Simple session-based viewed state - starts false (unviewed), becomes true when clicked
    const [hasViewedReceipt, setHasViewedReceipt] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    const closeDetailsModal = () => {
        setShowDetailsModal(false)
        setSelectedReceiptIndex(null)
    }

    useEffect(() => {
        setMounted(true)
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (!showDetailsModal) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeDetailsModal()
        }
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [showDetailsModal])

    const handlePreviewToggle = () => {
        setShowPreview(!showPreview)
        if (!showPreview) {
            if (!hasViewedReceipt) setHasViewedReceipt(true)
        }
    }

    const handleAction = (newStatus: "PENDING_RECEIPTS" | "VERIFIED_READY" | "READY_TO_PAY" | "FULLY_PAID" | "DECLINED", reason?: string, amountFinal?: number) => {
        startTransition(async () => {
            await updateRefundStatus(request.id, newStatus, reason, amountFinal)
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
    }

    const handleReject = () => {
        // Show dialog for both Validation and receipts to get rejection reason
        setShowRejectDialog(true)
    }

    const confirmReject = () => {
        if (type === 'receipt') {
            startTransition(async () => {
                await rejectReceipt(request.id, rejectReason)
                queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
                router.refresh()
            })
        } else {
            // For Validation, use updateRefundStatus with DECLINED
            handleAction("DECLINED", rejectReason || undefined)
        }
        setShowRejectDialog(false)
        setRejectReason("")
    }

    const handleApprove = () => {
        // Update finalAmount when opening dialog - use receipt total if staff has set amounts, otherwise use estimate
        const defaultAmount = receiptTotal > 0 ? receiptTotal : request.amountEst
        setFinalAmount(defaultAmount.toString())
        setShowApproveDialog(true)
    }

    const confirmApprove = () => {
        if (isEstimate) {
            handleAction("PENDING_RECEIPTS")
        } else {
            const amount = parseFloat(finalAmount)
            handleAction("READY_TO_PAY", undefined, isNaN(amount) ? undefined : amount)
        }
        setShowApproveDialog(false)
    }

    const handleRequestAdditionalReceipt = () => {
        setShowRequestMoreDialog(true)
    }

    const confirmRequestMore = () => {
        startTransition(async () => {
            const reason = requestMoreReason.trim() || "Staff requested additional receipt(s)"
            await updateRefundStatus(request.id, "PENDING_RECEIPTS", reason)
            queryClient.invalidateQueries({ queryKey: ["auditLogs", request.id] })
            router.refresh()
        })
        setShowRequestMoreDialog(false)
        setRequestMoreReason("")
    }

    const handleDownloadCard = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!cardRef.current) return
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

            const dateFormatted = new Date(request.createdAt).toLocaleDateString('en-US', {
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
            const statusText = request.status
            const statusColor = request.status === 'READY_TO_PAY' || request.status === 'FULLY_PAID' ? [22, 163, 74] : request.status === 'DECLINED' ? [220, 38, 38] : [0, 0, 0]
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
            doc.text(statusText, margin, yPos)
            yPos += 15

            // Details table
            const detailsData = [
                ['Submitted By', request.user.name || 'Unknown'],
                ['Email', request.user.email],
                ['Category', request.type],
                ['Date Submitted', new Date(request.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                ['Status', request.status]
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

            // Use totalAmount if available, otherwise estimate. Show USD for certifications, DH otherwise
            const displayAmount = (request.totalAmount && request.totalAmount > 0) ? request.totalAmount : request.amountEst
            const displayCurrency = request.type === 'CERTIFICATION' ? 'USD' : 'DH'
            doc.setFontSize(14)
            doc.text(`${displayAmount.toFixed(2)} ${displayCurrency}`, pageWidth - margin - 5, yPos + 12, { align: 'right' })

            yPos += 30

            // ========================================
            // RECEIPT SECTION (if exists)
            // ========================================
            if (request.receipts && request.receipts.length > 0) {
                const receiptUrl = request.receipts[0].url
                const isImage = /\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i.test(receiptUrl)

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
                        const receiptUrl = request.receipts[0].url
                        const response = await fetch(receiptUrl)
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

                        const receiptUrl = request.receipts[0].url
                        doc.setTextColor(0, 0, 255)
                        doc.textWithLink(receiptUrl, margin, receiptY + 18, { url: receiptUrl })
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
                    const receiptUrl = request.receipts[0].url
                    const displayUrl = receiptUrl.length > 70
                        ? receiptUrl.substring(0, 67) + '...'
                        : receiptUrl
                    doc.textWithLink(displayUrl, margin + 5, yPos + 17, { url: receiptUrl })
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
        <div
            className="staff-inbox-card"
            ref={cardRef}
            onClick={() => setShowDetailsModal(true)}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setShowDetailsModal(true)
                }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Preview request ${request.title}`}
            style={{
                backgroundColor: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                transition: 'all 150ms',
                opacity: isPending ? 0.6 : 1,
                pointerEvents: isPending ? 'none' : 'auto',
                cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#d4d4d8'
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e4e4e7'
                e.currentTarget.style.boxShadow = '0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}
        >
            {/* Header */}
            <div style={{
                padding: (mounted && isMobile) ? '1rem' : '1.25rem',
                display: 'flex',
                flexDirection: (mounted && isMobile) ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: (mounted && isMobile) ? 'stretch' : 'flex-start',
                gap: (mounted && isMobile) ? '0.75rem' : '0'
            }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* User row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                    }}>
                        {request.user.image ? (
                            <Image
                                src={request.user.image}
                                alt={request.user.name || 'User'}
                                width={32}
                                height={32}
                                unoptimized
                                style={{
                                    width: (mounted && isMobile) ? '1.75rem' : '2rem',
                                    height: (mounted && isMobile) ? '1.75rem' : '2rem',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    flexShrink: 0
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: (mounted && isMobile) ? '1.75rem' : '2rem',
                                    height: (mounted && isMobile) ? '1.75rem' : '2rem',
                                    borderRadius: '50%',
                                    backgroundColor: '#18181b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: (mounted && isMobile) ? '0.625rem' : '0.75rem',
                                    fontWeight: 600,
                                    flexShrink: 0
                                }}
                            >
                                {(request.user.name || request.user.email).charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span style={{
                            fontSize: (mounted && isMobile) ? '0.875rem' : '0.9375rem',
                            fontWeight: 500,
                            color: '#18181b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {request.user.name || request.user.email}
                        </span>
                    </div>

                    {/* Title Row */}
                    <div style={{
                        fontSize: (mounted && isMobile) ? '0.9375rem' : '1rem',
                        fontWeight: 600,
                        color: '#18181b',
                        marginBottom: '0.5rem',
                        lineHeight: 1.4
                    }}>
                        {request.title}
                    </div>

                    {/* Tags row */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <span
                            style={{
                                padding: '0.1875rem 0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: '#f4f4f5',
                                fontSize: (mounted && isMobile) ? '0.6875rem' : '0.75rem',
                                fontWeight: 500,
                                color: '#52525b'
                            }}
                        >
                            {request.type}
                        </span>
                        <span
                            style={{
                                padding: '0.1875rem 0.5rem',
                                borderRadius: '0.25rem',
                                backgroundColor: request.status === 'READY_TO_PAY' || request.status === 'FULLY_PAID' ? '#dcfce7' : request.status === 'DECLINED' ? '#fee2e2' : '#f4f4f5',
                                color: request.status === 'READY_TO_PAY' || request.status === 'FULLY_PAID' ? '#166534' : request.status === 'DECLINED' ? '#991b1b' : '#52525b',
                                fontSize: (mounted && isMobile) ? '0.6875rem' : '0.75rem',
                                fontWeight: 500
                            }}
                        >
                            {request.status}
                        </span>
                        {/* Receipt count badge */}
                        {request.receipts && request.receipts.length > 0 && (
                            <span
                                style={{
                                    padding: '0.1875rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    fontSize: (mounted && isMobile) ? '0.6875rem' : '0.75rem',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}
                            >
                                📎 {request.receipts.length} receipt{request.receipts.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Amount & Date + Action Icons */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: (mounted && isMobile) ? 'space-between' : 'flex-end',
                    gap: '1rem'
                }}>
                    <div style={{ textAlign: (mounted && isMobile) ? 'left' : 'right' }}>
                        <div style={{ fontWeight: 600, color: '#18181b', fontSize: (mounted && isMobile) ? '1rem' : '1.125rem' }}>
                            {(request.totalAmount && request.totalAmount > 0)
                                ? request.totalAmount.toFixed(2)
                                : request.amountEst.toFixed(2)
                            } <span style={{ color: '#71717a', fontSize: (mounted && isMobile) ? '0.8125rem' : '0.875rem', fontWeight: 500 }}>
                                {request.type === 'CERTIFICATION' ? 'USD' : 'DH'}
                            </span>
                            {(!request.totalAmount || request.totalAmount === 0) && (
                                <span style={{ color: '#a1a1aa', fontSize: '0.6875rem', fontWeight: 400, marginLeft: '0.375rem' }}>(estimated)</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: (mounted && isMobile) ? 'flex-start' : 'flex-end', gap: '0.375rem', fontSize: '0.75rem', color: '#71717a', marginTop: '0.125rem' }} suppressHydrationWarning>
                            <Calendar style={{ width: '0.75rem', height: '0.75rem' }} />
                            {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    </div>

                    {/* Icon Buttons */}
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                        {!isEstimate && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownloadCard(e)
                                }}
                                title="Download as Image"
                                style={{
                                    width: '2rem',
                                    height: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#71717a',
                                    cursor: 'pointer',
                                    transition: 'all 150ms'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#18181b'
                                    e.currentTarget.style.color = 'white'
                                    e.currentTarget.style.borderColor = '#18181b'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white'
                                    e.currentTarget.style.color = '#71717a'
                                    e.currentTarget.style.borderColor = '#e4e4e7'
                                }}
                            >
                                <Download style={{ width: '0.875rem', height: '0.875rem' }} />
                            </button>
                        )}
                        {(request.status === 'READY_TO_PAY' || request.status === 'FULLY_PAID') && (
                            <BonDeCaisseButton
                                requestId={request.id}
                                title="Générer Bon de Caisse"
                                style={{
                                    width: '2rem',
                                    height: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: 'white',
                                    color: '#16a34a', // Green
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    padding: 0
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#16a34a'
                                    e.currentTarget.style.color = 'white'
                                    e.currentTarget.style.borderColor = '#16a34a'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'white'
                                    e.currentTarget.style.color = '#16a34a'
                                    e.currentTarget.style.borderColor = '#e4e4e7'
                                }}
                            >
                                <FileText style={{ width: '0.875rem', height: '0.875rem' }} />
                            </BonDeCaisseButton>
                        )}
                        {request.receipts && request.receipts.length > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePreviewToggle()
                                }}
                                title={showPreview ? 'Hide Receipt Preview' : 'Show Receipt Preview'}
                                style={{
                                    width: '2rem',
                                    height: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #e4e4e7',
                                    backgroundColor: showPreview ? '#18181b' : 'white',
                                    color: showPreview ? 'white' : '#71717a',
                                    cursor: 'pointer',
                                    transition: 'all 150ms',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    if (!showPreview) {
                                        e.currentTarget.style.backgroundColor = '#f4f4f5'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showPreview) {
                                        e.currentTarget.style.backgroundColor = 'white'
                                    }
                                }}
                            >
                                {/* Blue dot indicator for unseen receipt (notification style) */}
                                {!hasViewedReceipt && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            width: '6px',
                                            height: '6px',
                                            backgroundColor: '#3b82f6',
                                            borderRadius: '50%'
                                        }}
                                    />
                                )}
                                {showPreview ? (
                                    <EyeOff style={{ width: '0.875rem', height: '0.875rem' }} />
                                ) : (
                                    <Eye style={{ width: '0.875rem', height: '0.875rem' }} />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Message / Description */}
            <div style={{ padding: '0 1.25rem 0rem 1.25rem' }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        padding: '0.875rem',
                        backgroundColor: '#fafafa',
                        borderRadius: '0.5rem',
                        fontSize: '0.8125rem',
                        color: '#71717a'
                    }}
                >
                    {/* Rejection Reason */}
                    {request.status === 'DECLINED' && request.staffNote && (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: '1px solid #e4e4e7' }}>
                            <div
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: '#fee2e2'
                                }}
                            >
                                <XCircle style={{ width: '1rem', height: '1rem', color: '#dc2626' }} />
                            </div>
                            <div>
                                <p style={{ marginBottom: '0.25rem', fontWeight: 500, color: '#991b1b' }}>Rejection Reason:</p>
                                <span style={{ color: '#7f1d1d' }}>{request.staffNote}</span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div
                            style={{
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                backgroundColor: '#f4f4f5'
                            }}
                        >
                            <FileText style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
                        </div>
                        <div>
                            <p style={{ marginBottom: '0.25rem', fontWeight: 500, color: '#18181b' }}>Description:</p>
                            <span>{request.description}</span>
                        </div>
                    </div>

                    {/* Receipt Status/Preview Section */}
                    {request.status === 'PENDING_RECEIPTS' && (!request.receipts || request.receipts.length === 0) ? (
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid #e4e4e7', paddingTop: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#f4f4f5' }}>
                                <Loader2 className="animate-spin" style={{ width: '1rem', height: '1rem', color: '#71717a' }} />
                            </div>
                            <p style={{ fontSize: '0.875rem', color: '#71717a', fontStyle: 'italic' }}>
                                Waiting for student to upload receipt...
                            </p>
                        </div>
                    ) : null}

                    {/* Image/PDF Preview - Multiple Receipts */}
                    {showPreview && request.receipts && request.receipts.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            marginTop: '0.5rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#71717a' }}>
                                Previewing {request.receipts.length} receipt{request.receipts.length > 1 ? 's' : ''}:
                            </div>
                            {request.receipts.map((receipt: Receipt, index: number) => {
                                const isImage = /\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i.test(receipt.url)
                                const isPdf = /\.pdf(\?.*)?$/i.test(receipt.url)
                                return (
                                    <div
                                        key={receipt.id || index}
                                        style={{
                                            borderRadius: '0.5rem',
                                            overflow: 'hidden',
                                            border: '1px solid #e4e4e7',
                                            maxWidth: '100%'
                                        }}
                                    >
                                        <div style={{
                                            padding: '0.5rem 0.75rem',
                                            backgroundColor: '#f4f4f5',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottom: '1px solid #e4e4e7'
                                        }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#18181b' }}>
                                                Receipt #{index + 1}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {receipt.amount > 0 && (
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a' }}>
                                                        {receipt.amount.toFixed(2)} DH
                                                    </span>
                                                )}
                                                <a
                                                    href={receipt.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ fontSize: '0.6875rem', color: '#3b82f6', textDecoration: 'none' }}
                                                >
                                                    Open ↗
                                                </a>
                                            </div>
                                        </div>
                                        {isImage ? (
                                            <Image
                                                src={receipt.url}
                                                alt={`Receipt ${index + 1}`}
                                                width={400}
                                                height={300}
                                                unoptimized
                                                style={{
                                                    width: '100%',
                                                    maxHeight: '300px',
                                                    objectFit: 'contain',
                                                    backgroundColor: '#fafafa'
                                                }}
                                            />
                                        ) : isPdf ? (
                                            <PdfPreview url={receipt.url} />
                                        ) : (
                                            <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#fafafa', color: '#71717a', fontSize: '0.875rem' }}>
                                                Preview not available - <a href={receipt.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>View file</a>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            {type === 'payout' && request.status === 'READY_TO_PAY' ? (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        padding: '0.5rem 1.25rem'
                    }}
                >
                    {/* Mark as Fully Paid button - for Completed tab */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleAction("FULLY_PAID")
                        }}
                        disabled={isPending}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            padding: '0.5rem 0.875rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            backgroundColor: isPending ? '#52525b' : '#16a34a',
                            border: 'none',
                            color: 'white',
                            cursor: isPending ? 'not-allowed' : 'pointer',
                            transition: 'all 150ms'
                        }}
                        onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = '#15803d')}
                        onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = '#16a34a')}
                    >
                        {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                        Mark as Fully Paid
                    </button>
                </div>
            ) : type !== 'payout' ? (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        padding: '0.5rem 1.25rem'
                    }}
                >
                    {/* Reject button - disabled when waiting for receipt */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleReject()
                        }}
                        disabled={isPending || request.status === 'PENDING_RECEIPTS'}
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
                            color: (isPending || request.status === 'PENDING_RECEIPTS') ? '#a1a1aa' : '#dc2626',
                            cursor: (isPending || request.status === 'PENDING_RECEIPTS') ? 'not-allowed' : 'pointer',
                            opacity: request.status === 'PENDING_RECEIPTS' ? 0.5 : 1,
                            transition: 'all 150ms'
                        }}
                        onMouseEnter={(e) => {
                            if (!isPending && request.status !== 'PENDING_RECEIPTS') {
                                e.currentTarget.style.backgroundColor = '#fef2f2'
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isPending && request.status !== 'PENDING_RECEIPTS') {
                                e.currentTarget.style.backgroundColor = 'white'
                            }
                        }}
                        title={request.status === 'PENDING_RECEIPTS' ? 'Cannot reject while waiting for student to upload receipt' : ''}
                    >
                        {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <XCircle style={{ width: '0.875rem', height: '0.875rem' }} />}
                        {type === 'receipt' ? 'Reject Receipt' : 'Reject'}
                    </button>
                    {/* Request Additional Receipt - always show for receipt type */}
                    {type === 'receipt' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleRequestAdditionalReceipt()
                            }}
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
                                color: '#b45309',
                                cursor: isPending ? 'not-allowed' : 'pointer',
                                transition: 'all 150ms'
                            }}
                            onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = '#fffbeb')}
                            onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = 'white')}
                            title="Request additional receipt from student"
                        >
                            {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <Plus style={{ width: '0.875rem', height: '0.875rem' }} />}
                            Request More
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            handleApprove()
                        }}
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
                        onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = '#27272a')}
                        onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = '#18181b')}
                    >
                        {isPending ? <Loader2 className="animate-spin" style={{ width: '0.875rem', height: '0.875rem' }} /> : <CheckCircle2 style={{ width: '0.875rem', height: '0.875rem' }} />}
                        {isEstimate ? 'Approve' : 'Verify & Pay'}
                    </button>
                </div>
            ) : null}

            {/* Fast request preview for inbox review */}
            {showDetailsModal && (
                <div className="staff-preview-overlay" role="presentation" onClick={(e) => {
                    e.stopPropagation()
                    closeDetailsModal()
                }}>
                    <section
                        className="staff-preview-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`preview-title-${request.id}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="staff-preview-header">
                            <div>
                                <span className="staff-preview-kicker">Request preview</span>
                                <h2 id={`preview-title-${request.id}`}>{request.title}</h2>
                                <p>#{request.id.slice(0, 8)} · {new Date(request.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                            <button type="button" onClick={closeDetailsModal} aria-label="Close preview"><X /></button>
                        </header>

                        <div className="staff-preview-body">
                            <div className="staff-preview-facts">
                                <div>
                                    {request.user.image ? (
                                        <Image className="staff-preview-avatar" src={request.user.image} alt="" width={36} height={36} unoptimized />
                                    ) : (
                                        <span className="staff-preview-avatar staff-preview-avatar-fallback">{(request.user.name || request.user.email).charAt(0).toUpperCase()}</span>
                                    )}
                                    <span><small>Submitted by</small><strong>{request.user.name || 'Unknown student'}</strong><em>{request.user.email}</em></span>
                                </div>
                                <div><ReceiptText /><span><small>Amount</small><strong>{((request.totalAmount && request.totalAmount > 0) ? request.totalAmount : request.amountEst).toFixed(2)} {request.type === 'CERTIFICATION' ? 'USD' : 'DH'}</strong><em>{request.totalAmount ? 'Final amount' : 'Estimated amount'}</em></span></div>
                                <div><FileText /><span><small>Category</small><strong>{request.type.replaceAll('_', ' ')}</strong><em>{request.status.replaceAll('_', ' ')}</em></span></div>
                                {(request.departure || request.destination) && (
                                    <div><MapPin /><span><small>Route</small><strong>{request.departure || '—'} → {request.destination || '—'}</strong><em>Travel details</em></span></div>
                                )}
                            </div>

                            <div className="staff-preview-section">
                                <h3>Description</h3>
                                <p>{request.description || 'No description was provided.'}</p>
                            </div>

                            <div className="staff-preview-section">
                                <div className="staff-preview-section-title">
                                    <h3>Receipts</h3>
                                    <span>{request.receipts.length}</span>
                                </div>
                                {request.receipts.length ? (
                                    <div className="staff-preview-receipts">
                                        {request.receipts.map((receipt, index) => (
                                            <button
                                                type="button"
                                                key={receipt.id}
                                                className={selectedReceiptIndex === index ? 'is-selected' : ''}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedReceiptIndex(selectedReceiptIndex === index ? null : index)
                                                }}
                                            >
                                                <ReceiptText />
                                                <span>Receipt {index + 1}</span>
                                                <small>{receipt.amount > 0 ? `${receipt.amount.toFixed(2)} DH` : 'Preview'}</small>
                                            </button>
                                        ))}
                                    </div>
                                ) : <p className="staff-preview-empty">No receipts uploaded yet.</p>}

                                {selectedReceiptIndex !== null && request.receipts[selectedReceiptIndex] && (() => {
                                    const receipt = request.receipts[selectedReceiptIndex]
                                    return (
                                        <div className="staff-preview-viewer">
                                            <div><span>Receipt {selectedReceiptIndex + 1}</span><button type="button" onClick={() => setSelectedReceiptIndex(null)} aria-label="Close receipt preview"><X /></button></div>
                                            <InlineReceiptPreview url={receipt.url} label={`Receipt ${selectedReceiptIndex + 1}`} />
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>

                        <footer className="staff-preview-footer">
                            <button type="button" className="staff-preview-secondary" onClick={closeDetailsModal}>Close</button>
                            {type !== 'payout' && (
                                <>
                                    <button
                                        type="button"
                                        className="staff-preview-deny"
                                        disabled={isPending || request.status === 'PENDING_RECEIPTS'}
                                        onClick={() => { closeDetailsModal(); handleReject() }}
                                    >
                                        <XCircle /> Deny
                                    </button>
                                    <button
                                        type="button"
                                        className="staff-preview-approve"
                                        disabled={isPending}
                                        onClick={() => { closeDetailsModal(); handleApprove() }}
                                    >
                                        <CheckCircle2 /> {isEstimate ? 'Approve' : 'Verify & pay'}
                                    </button>
                                </>
                            )}
                            {type === 'payout' && request.status === 'READY_TO_PAY' && (
                                <button type="button" className="staff-preview-approve" disabled={isPending} onClick={() => { closeDetailsModal(); handleAction('FULLY_PAID') }}>
                                    <CheckCircle2 /> Mark paid
                                </button>
                            )}
                            <button type="button" className="staff-preview-primary" onClick={() => router.push(`/staff/${request.id}`)}>Open full request <Eye /></button>
                        </footer>
                    </section>
                </div>
            )}

            {/* Rejection Reason Dialog */}
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
                            {type === 'receipt' ? 'Reject Receipt' : 'Reject Request'}
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            {type === 'receipt'
                                ? `Please provide a reason for rejecting the receipt for "${request.title}". The student will need to upload a new receipt.`
                                : `Please provide a reason for rejecting "${request.title}"`
                            }
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
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
                                Reject Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Confirmation Dialog */}
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
                            {isEstimate ? 'Confirm Approval' : 'Set Final Refund Amount'}
                        </h3>
                        <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            {isEstimate
                                ? 'Are you sure you want to approve this estimate? The student will be notified to upload their receipt.'
                                : 'Enter the final refund amount for this request. The student will be notified that their refund is ready.'}
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
                                {request.user?.name || request.user?.email} • Estimated: {request.amountEst.toFixed(2)} {request.type === 'CERTIFICATION' ? 'USD' : 'DH'}
                                {receiptTotal > 0 && (
                                    <> • Receipt Total: <span style={{ fontWeight: 600, color: '#18181b' }}>{receiptTotal.toFixed(2)}</span> DH</>
                                )}
                            </p>
                        </div>

                        {/* Final Amount Input for Receipts */}
                        {!isEstimate && (
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
                                        fontSize: '0.875rem',
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#18181b'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#e4e4e7'}
                                />
                            </div>
                        )}

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
                                onClick={confirmApprove}
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
                                {isEstimate ? 'Approve' : 'Mark as Paid'}
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
                                {request.user?.name || request.user?.email} • {request.receipts?.length || 0} receipt(s) uploaded
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
                                    gap: '0.375rem',
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
