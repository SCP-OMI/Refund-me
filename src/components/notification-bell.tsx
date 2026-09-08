"use client"

import { clearAllNotifications, getNotifications, getUnreadCount, markAllAsRead, markAsRead } from "@/actions/notifications"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Bell, Check, CheckCheck, CreditCard, FileText, Trash2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"


interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    refundId: string | null
    createdAt: Date
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [mounted, setMounted] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const queryClient = useQueryClient()

    // TanStack Query for notifications (replaces polling)
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: getNotifications,
        staleTime: 30000, // Consider data fresh for 30 seconds
    })

    // TanStack Query for unread count
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ["notificationCount"],
        queryFn: getUnreadCount,
        staleTime: 30000,
    })

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true)
        }, 0)
        
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', checkMobile)
        }
    }, [])

    const handleMarkAllAsRead = useCallback(async () => {
        await markAllAsRead()
        // Invalidate queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
        queryClient.invalidateQueries({ queryKey: ["notificationCount"] })
    }, [queryClient])

    useEffect(() => {
        if (isOpen && notifications.length > 0) {
            const unreadNotifications = notifications.filter((n: Notification) => !n.read)

            if (unreadNotifications.length > 0) {
                const timer = setTimeout(async () => {
                    await handleMarkAllAsRead()
                }, 2000)

                return () => clearTimeout(timer)
            }
        }
    }, [isOpen, notifications, handleMarkAllAsRead])


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            markAsRead(notification.id).catch(console.error)
            // Invalidate queries to refetch updated data
            queryClient.invalidateQueries({ queryKey: ["notifications"] })
            queryClient.invalidateQueries({ queryKey: ["notificationCount"] })
        }

        setIsOpen(false)

        if (notification.type === "NEW_REQUEST") {
            router.push("/staff?tab=Validation")
        } else if (notification.type === "RECEIPT_UPLOADED") {
            router.push("/staff?tab=Processing")
        } else if (notification.refundId) {
            router.push(`/student/${notification.refundId}`)
        }
    }


    const handleClearAll = async () => {
        await clearAllNotifications()
        // Invalidate queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
        queryClient.invalidateQueries({ queryKey: ["notificationCount"] })
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "NEW_REQUEST":
                return <FileText style={{ width: '1rem', height: '1rem' }} />
            case "RECEIPT_UPLOADED":
                return <Upload style={{ width: '1rem', height: '1rem' }} />
            case "APPROVED":
                return <Check style={{ width: '1rem', height: '1rem' }} />
            case "REJECTED":
                return <AlertCircle style={{ width: '1rem', height: '1rem' }} />
            case "READY_TO_PAY":
                return <CreditCard style={{ width: '1rem', height: '1rem' }} />
            case "FULLY_PAID":
                return <CreditCard style={{ width: '1rem', height: '1rem' }} />
            default:
                return <Bell style={{ width: '1rem', height: '1rem' }} />
        }
    }

    const getIconBg = (type: string) => {
        switch (type) {
            case "NEW_REQUEST":
                return { bg: '#dbeafe', color: '#2563eb' }
            case "RECEIPT_UPLOADED":
                return { bg: '#e0e7ff', color: '#4f46e5' } // Indigo for receipt uploads
            case "APPROVED":
                return { bg: '#dcfce7', color: '#16a34a' }
            case "REJECTED":
                return { bg: '#fee2e2', color: '#dc2626' }
            case "READY_TO_PAY":
                return { bg: '#dbeafe', color: '#2563eb' }
            case "FULLY_PAID":
                return { bg: '#d1fae5', color: '#059669' }
            default:
                return { bg: '#f4f4f5', color: '#71717a' }
        }
    }

    const formatTime = (date: Date) => {
        const now = new Date()
        const diff = now.getTime() - new Date(date).getTime()
        const minutes = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (minutes < 1) return "Just now"
        if (minutes < 60) return `${minutes}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return new Date(date).toLocaleDateString()
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    width: '2.5rem',
                    height: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0.375rem',
                    border: '1px solid #e4e4e7',
                    backgroundColor: isOpen ? '#18181b' : 'white',
                    color: isOpen ? 'white' : '#71717a',
                    cursor: 'pointer',
                    transition: 'all 150ms'
                }}
                onMouseEnter={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.backgroundColor = '#f4f4f5'
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.backgroundColor = 'white'
                    }
                }}
            >
                <Bell style={{ width: '1.125rem', height: '1.125rem' }} />

                {/* Badge */}
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '-0.25rem',
                            right: '-0.25rem',
                            minWidth: '1.25rem',
                            height: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '9999px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0 0.25rem',
                            border: '2px solid white'
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: (mounted && isMobile) ? 'fixed' : 'absolute',
                        top: (mounted && isMobile) ? '4rem' : 'calc(100% + 1rem)',
                        right: (mounted && isMobile) ? '0.75rem' : 0,
                        left: (mounted && isMobile) ? '0.75rem' : 'auto',
                        width: (mounted && isMobile) ? 'auto' : '22rem',
                        maxHeight: (mounted && isMobile) ? 'calc(100vh - 5rem)' : '28rem',
                        backgroundColor: 'white',
                        borderRadius: '0.75rem',
                        border: '1px solid #e4e4e7',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                        overflow: 'hidden',
                        zIndex: 50
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid #f4f4f5'
                        }}
                    >
                        <h3 style={{ fontWeight: 600, color: '#18181b', fontSize: '0.9375rem' }}>
                            Notifications
                        </h3>
                        {unreadCount > 0 ? (
                            <button
                                onClick={handleMarkAllAsRead}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    padding: '0.375rem 0.625rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: '#f4f4f5',
                                    color: '#71717a',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 150ms'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#e4e4e7'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f4f4f5'
                                }}
                            >
                                <CheckCheck style={{ width: '0.875rem', height: '0.875rem' }} />
                                Mark all read
                            </button>
                        ) : notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    padding: '0.375rem 0.625rem',
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 150ms'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fee2e2'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#fef2f2'
                                }}
                            >
                                <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div style={{ maxHeight: '22rem', overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{
                                padding: '3rem 1.5rem',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <div style={{
                                    width: '3rem',
                                    height: '3rem',
                                    borderRadius: '50%',
                                    backgroundColor: '#f4f4f5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Bell style={{ width: '1.25rem', height: '1.25rem', color: '#a1a1aa' }} />
                                </div>
                                <p style={{ color: '#71717a', fontSize: '0.875rem' }}>
                                    No notifications yet
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const iconStyle = getIconBg(notification.type)
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        style={{
                                            display: 'flex',
                                            gap: '0.875rem',
                                            padding: '1rem 1.25rem',
                                            borderBottom: '1px solid #f4f4f5',
                                            backgroundColor: notification.read ? 'white' : '#fafafa',
                                            cursor: notification.refundId ? 'pointer' : 'default',
                                            transition: 'background-color 150ms'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (notification.refundId) {
                                                e.currentTarget.style.backgroundColor = '#f4f4f5'
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = notification.read ? 'white' : '#fafafa'
                                        }}
                                    >
                                        {/* Icon */}
                                        <div
                                            style={{
                                                width: '2.25rem',
                                                height: '2.25rem',
                                                borderRadius: '50%',
                                                backgroundColor: iconStyle.bg,
                                                color: iconStyle.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}
                                        >
                                            {getIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                                gap: '0.5rem'
                                            }}>
                                                <p style={{
                                                    fontWeight: notification.read ? 500 : 600,
                                                    color: '#18181b',
                                                    fontSize: '0.8125rem',
                                                    lineHeight: 1.4
                                                }}>
                                                    {notification.title}
                                                </p>
                                                {!notification.read && (
                                                    <div style={{
                                                        width: '0.5rem',
                                                        height: '0.5rem',
                                                        borderRadius: '50%',
                                                        backgroundColor: '#3b82f6',
                                                        flexShrink: 0,
                                                        marginTop: '0.25rem'
                                                    }} />
                                                )}
                                            </div>
                                            <p style={{
                                                color: '#71717a',
                                                fontSize: '0.75rem',
                                                lineHeight: 1.5,
                                                marginTop: '0.125rem'
                                            }}>
                                                {notification.message}
                                            </p>
                                            <p style={{
                                                color: '#a1a1aa',
                                                fontSize: '0.6875rem',
                                                marginTop: '0.375rem'
                                            }} suppressHydrationWarning>
                                                {formatTime(notification.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
