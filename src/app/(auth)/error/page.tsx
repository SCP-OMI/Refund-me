"use client"

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const messages: Record<string, string> = {
  invalid_code: "That sign-in link is no longer valid. Start a fresh sign-in to continue.",
  oauth_code_verification_failed: "We couldn't verify your 42 sign-in. Please start again.",
  access_denied: "Access was cancelled before sign-in finished.",
}

function ErrorContent() {
  const code = (useSearchParams().get("error") || "unknown_error").toLowerCase()
  const message = messages[code] || "We couldn't complete sign-in. Please try again in a moment."
  return (
    <main className="auth-error-shell">
      <div className="auth-error-card">
        <div className="auth-error-icon"><AlertTriangle aria-hidden="true" /></div>
        <p className="auth-eyebrow">Sign-in interrupted</p>
        <h1>Let’s try that again</h1>
        <p>{message}</p>
        <Link className="auth-button" href="/login"><RefreshCw aria-hidden="true" /> Start a new sign-in</Link>
        <Link className="auth-text-link" href="/login"><ArrowLeft aria-hidden="true" /> Back to login</Link>
      </div>
    </main>
  )
}

export default function ErrorPage() {
  return <Suspense fallback={null}><ErrorContent /></Suspense>
}
