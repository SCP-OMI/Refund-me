"use client"

import { signIn } from "@/lib/auth-client"
import { ArrowRight, CheckCircle2, Loader2, ReceiptText, ShieldCheck, X } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

function LoginContent() {
  const searchParams = useSearchParams()
  const [errorMessage, setErrorMessage] = useState(() =>
    searchParams.get("error") === "auth_required"
      ? "Your session ended. Sign in again to continue."
      : ""
  )
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    setIsSigningIn(true)
    setErrorMessage("")
    try {
      await signIn.social({
        provider: "42-school",
        callbackURL: searchParams.get("callbackUrl") || "/student",
      })
    } catch {
      setErrorMessage("We couldn't start sign-in. Please try again.")
      setIsSigningIn(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-label="Refund portal introduction">
        <div className="auth-brand">
          <span className="auth-brand-mark"><ReceiptText aria-hidden="true" /></span>
          <span>RefundMe</span>
        </div>
        <div className="auth-hero">
          <div className="auth-copy">
            <p className="auth-eyebrow">The 1337 reimbursement workspace</p>
            <h1>From receipt to refund, with a clear trail.</h1>
            <p className="auth-lede">Send the estimate, attach proof, and know exactly where your reimbursement stands.</p>
            <div className="auth-benefits">
              <span><CheckCircle2 aria-hidden="true" /> Status without guesswork</span>
              <span><CheckCircle2 aria-hidden="true" /> Receipts kept with the request</span>
            </div>
          </div>
          <div className="auth-receipt" aria-hidden="true">
            <div><span>REF 1337–042</span><span>09·08·26</span></div>
            <strong>Workshop supplies</strong>
            <p><span>Estimate</span><span>480.00 DH</span></p>
            <p><span>Receipt</span><span>476.50 DH</span></p>
            <footer><span>Ready to collect</span><CheckCircle2 /></footer>
          </div>
        </div>
        <p className="auth-footnote">Built for students and finance teams across 1337 campuses.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-icon"><ShieldCheck aria-hidden="true" /></div>
          <p className="auth-eyebrow">Secure campus access</p>
          <h2>Open your ledger</h2>
          <p className="auth-card-copy">Continue with the 42 account you use at school.</p>
          {errorMessage && (
            <div className="auth-alert" role="alert">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage("")} aria-label="Dismiss message"><X aria-hidden="true" /></button>
            </div>
          )}
          <button className="auth-button" type="button" onClick={handleSignIn} disabled={isSigningIn}>
            {isSigningIn ? <><Loader2 className="auth-spinner" aria-hidden="true" /> Connecting…</> : <>Continue with 42 <ArrowRight aria-hidden="true" /></>}
          </button>
          <p className="auth-privacy">Authentication is securely handled by 42. We never see your password.</p>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="auth-loading"><Loader2 className="auth-spinner" /> Loading…</div>}><LoginContent /></Suspense>
}
