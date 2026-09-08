"use client";

import Image from "next/image"
import { useQuery } from "@tanstack/react-query";
import { getRefundAuditLogs } from "@/actions/audit";
import {
    Upload,
    CheckCircle,
    XCircle,
    User,
    ChevronDown,
    ChevronUp,
    History,
    FileText,
    RefreshCw,
    CircleDot,
} from "lucide-react";

interface AuditHistoryProps {
    refundId: string;
    isOpen: boolean;
    onToggle: () => void;
}

const actionConfig: Record<
    string,
    { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
    CREATE: {
        icon: <FileText size={14} strokeWidth={1.5} />,
        label: "Created Request",
        color: "#3b82f6",
        bgColor: "#eff6ff",
    },
    UPDATE: {
        icon: <RefreshCw size={14} strokeWidth={1.5} />,
        label: "Updated",
        color: "#f59e0b",
        bgColor: "#fffbeb",
    },
    APPROVE: {
        icon: <CheckCircle size={14} strokeWidth={1.5} />,
        label: "Approved",
        color: "#22c55e",
        bgColor: "#f0fdf4",
    },
    REJECT: {
        icon: <XCircle size={14} strokeWidth={1.5} />,
        label: "Rejected",
        color: "#ef4444",
        bgColor: "#fef2f2",
    },
    UPLOAD: {
        icon: <Upload size={14} strokeWidth={1.5} />,
        label: "Uploaded Receipt",
        color: "#8b5cf6",
        bgColor: "#faf5ff",
    },
};

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AuditHistory({ refundId, isOpen, onToggle }: AuditHistoryProps) {
    const { data: logs = [], isLoading: loading, isError } = useQuery({
        queryKey: ["auditLogs", refundId],
        queryFn: () => getRefundAuditLogs(refundId),
        enabled: isOpen,
        staleTime: 3000,
        refetchOnWindowFocus: true,
        refetchInterval: isOpen ? 5000 : false,
    });

    return (
        <div
            style={{
                backgroundColor: 'white',
                border: '1px solid #e4e4e7',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                overflow: 'hidden',
                marginTop: '1.5rem'
            }}
        >
            {/* Header */}
            <button
                onClick={onToggle}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "1rem 1.5rem",
                    background: "#fafafa",
                    border: "none",
                    borderBottom: isOpen ? "1px solid #e4e4e7" : "none",
                    cursor: "pointer",
                }}
            >
                <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#18181b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <History size={14} strokeWidth={1.5} style={{ color: '#71717a' }} />
                    Activity History
                </h3>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    color: '#71717a'
                }}>
                    {logs.length > 0 && (
                        <span style={{ 
                            fontSize: '0.75rem', 
                            color: '#a1a1aa',
                            fontWeight: 500
                        }}>
                            {logs.length}
                        </span>
                    )}
                    {isOpen ? <ChevronUp size={16} strokeWidth={1.5} /> : <ChevronDown size={16} strokeWidth={1.5} />}
                </div>
            </button>

            {/* Content */}
            {isOpen && (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {/* Loading State */}
                    {loading && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#a1a1aa' }}>
                            <RefreshCw size={18} strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    )}

                    {/* Error State */}
                    {isError && (
                        <div style={{
                            padding: '1.5rem',
                            textAlign: 'center',
                            color: '#a1a1aa',
                            fontSize: '0.8125rem'
                        }}>
                            Failed to load
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && !isError && logs.length === 0 && (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#a1a1aa',
                            fontSize: '0.8125rem'
                        }}>
                            No activity yet
                        </div>
                    )}

                    {/* Activity List */}
                    {!loading && logs.length > 0 && (
                        <div>
                            {logs.map((log, index) => {
                                const config = actionConfig[log.action] || {
                                    icon: <CircleDot size={14} strokeWidth={1.5} />,
                                    label: log.action,
                                    color: "#71717a",
                                    bgColor: "#f4f4f5",
                                };

                                return (
                                    <div
                                        key={log.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                            padding: "0.875rem 1.5rem",
                                            borderBottom: index < logs.length - 1 ? "1px solid #f4f4f5" : "none",
                                        }}
                                    >
                                        {/* Icon */}
                                        <div
                                            style={{
                                                width: "2rem",
                                                height: "2rem",
                                                borderRadius: "0.5rem",
                                                backgroundColor: config.bgColor,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: config.color,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {config.icon}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {/* Avatar */}
                                                {log.user.image ? (
                                                    <Image
                                                        src={log.user.image}
                                                        alt={log.user.name || "User"}
                                                        width={24}
                                                        height={24}
                                                        unoptimized
                                                        style={{
                                                            width: "1.25rem",
                                                            height: "1.25rem",
                                                            borderRadius: "50%",
                                                            objectFit: "cover",
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            width: "1.25rem",
                                                            height: "1.25rem",
                                                            borderRadius: "50%",
                                                            backgroundColor: "#e4e4e7",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            color: "#71717a",
                                                        }}
                                                    >
                                                        <User size={10} strokeWidth={1.5} />
                                                    </div>
                                                )}

                                                {/* Name */}
                                                <span style={{
                                                    fontSize: "0.8125rem",
                                                    fontWeight: 500,
                                                    color: "#18181b",
                                                }}>
                                                    {log.user.name || log.user.email?.split('@')[0]}
                                                </span>

                                                {/* Role badge */}
                                                <span
                                                    style={{
                                                        fontSize: "0.625rem",
                                                        fontWeight: 600,
                                                        color: log.user.role === 'STAFF' ? '#7c3aed' : '#71717a',
                                                        backgroundColor: log.user.role === 'STAFF' ? '#f5f3ff' : '#f4f4f5',
                                                        padding: "0.125rem 0.375rem",
                                                        borderRadius: "0.25rem",
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.025em",
                                                    }}
                                                >
                                                    {log.user.role}
                                                </span>
                                            </div>

                                            {/* Action */}
                                            <div style={{
                                                fontSize: "0.8125rem",
                                                color: "#52525b",
                                                marginTop: "0.125rem"
                                            }}>
                                                {config.label}
                                            </div>
                                        </div>

                                        {/* Time */}
                                        <span style={{
                                            fontSize: "0.75rem",
                                            color: "#a1a1aa",
                                            flexShrink: 0,
                                        }}>
                                            {formatTimeAgo(log.createdAt)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
