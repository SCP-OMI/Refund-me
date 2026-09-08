"use client"

import Link from "next/link"
import { FileX, ArrowLeft, Home } from "lucide-react"

export default function RequestNotFound() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <div style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
            }}>
                <FileX style={{ width: '2rem', height: '2rem', color: '#dc2626' }} />
            </div>

            <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: '#18181b',
                marginBottom: '0.5rem'
            }}>
                Request Not Found
            </h1>

            <p style={{
                color: '#71717a',
                fontSize: '0.9375rem',
                marginBottom: '0.5rem',
                maxWidth: '24rem'
            }}>
                This refund request doesn&apos;t exist or has been deleted.
            </p>

            {/* <p style={{
                color: '#a1a1aa',
                fontSize: '0.8125rem',
                marginBottom: '2rem',
                maxWidth: '24rem'
            }}>
                If you received a notification about this request, it may have been removed by staff.
            </p> */}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                    href="/student"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        borderRadius: '0.375rem',
                        backgroundColor: 'white',
                        border: '1px solid #e4e4e7',
                        color: '#52525b',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'all 150ms'
                    }}
                >
                    <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
                    Back to Dashboard
                </Link>

                <Link
                    href="/student/create"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1rem',
                        borderRadius: '0.375rem',
                        backgroundColor: '#18181b',
                        border: 'none',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textDecoration: 'none',
                        transition: 'all 150ms'
                    }}
                >
                    <Home style={{ width: '1rem', height: '1rem' }} />
                    New Request
                </Link>
            </div>
        </div>
    )
}
