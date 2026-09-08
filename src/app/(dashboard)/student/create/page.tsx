"use client"

import { useWizardStore } from "@/store/wizard-store"
import { StepCategory } from "@/components/student/wizard/step-category"
import { StepDetails } from "@/components/student/wizard/step-details"
import { StepSummary } from "@/components/student/wizard/step-summary"
import { FolderOpen, FileText, CheckCircle, AlertCircle, Info, Check, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"



const steps = [
  { id: 1, label: "Category", icon: FolderOpen },
  { id: 2, label: "Details", icon: FileText },
  { id: 3, label: "Review", icon: CheckCircle },
]

export default function CreateRequestPage() {
  const { step } = useWizardStore()
  const [showDisclaimer, setShowDisclaimer] = useState(true)

  // Check if current user is staff
  useEffect(() => {
    const checkStaffRole = async () => {
      await authClient.getSession()
      // Staff role checked but not used in this component
    }
    checkStaffRole()
  }, [])

  /*const handleBack = () => {
    if (step === 1) {
      reset()
      router.push("/student")
    } else {
      setStep(step - 1)
    }
  }*/

  // Disclaimer Modal
  if (showDisclaimer) {
    return (
      <>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 50;
            animation: fadeIn 0.15s ease-out;
          }
          .modal-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 51;
            width: 100%;
            max-width: 24rem;
            padding: 0 1rem;
            animation: slideUp 0.2s ease-out;
          }
          .modal-content {
            background: white;
            border-radius: 0.75rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
            border: 1px solid #e4e4e7;
          }
        `}</style>

        <div className="modal-overlay" />
        <div className="modal-container">
          <div className="modal-content">
            {/* Header */}
            <div style={{ padding: '1.5rem 1.5rem 0' }}>
              <h2 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#18181b',
                margin: 0
              }}>
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.625rem',
                  backgroundColor: '#f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Info style={{ width: '1.25rem', height: '1.25rem', color: '#18181b' }} />
                </div>
                Important Information
              </h2>
            </div>

            {/* Content */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ 
                fontSize: '0.8125rem', 
                color: '#71717a', 
                marginBottom: '1rem' 
              }}>
                Before you proceed, please note:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Item 1 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '50%',
                    backgroundColor: '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.0625rem'
                  }}>
                    <Check style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} strokeWidth={2.5} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#3f3f46', margin: 0, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: '#18181b' }}>Certifications refund will match your receipt</span>, up to a maximum of <span style={{ fontWeight: 600, color: '#18181b' }}>300$</span>
                  </p>
                </div>

                {/* Item 2 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '50%',
                    backgroundColor: '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.0625rem'
                  }}>
                    <Check style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} strokeWidth={2.5} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#3f3f46', margin: 0, lineHeight: 1.5 }}>
                    Refunds are based on <span style={{ fontWeight: 600, color: '#18181b' }}>what you PAID</span>, not estimates.
                  </p>
                </div>

                {/* Item 3 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <div style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '50%',
                    backgroundColor: '#18181b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.0625rem'
                  }}>
                    <Check style={{ width: '0.625rem', height: '0.625rem', color: 'white' }} strokeWidth={2.5} />
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#3f3f46', margin: 0, lineHeight: 1.5 }}>
                    Ensure all invoices (Marjan, HyperU, etc.) are addressed to <span style={{ fontWeight: 600, color: '#18181b' }}>LEET INITIATIVE</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}></span>
              <button
                onClick={() => setShowDisclaimer(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
                  backgroundColor: '#18181b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 150ms'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#27272a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#18181b'}
              >
                Get started
                <ArrowRight style={{ width: '0.75rem', height: '0.75rem' }} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }


  return (
    <div className="wizard-container">
      <style>{`
        .wizard-container {
          max-width: 40rem;
          margin: 0 auto;
          padding: 1.5rem 1rem;
        }
        
        .wizard-header {
          margin-bottom: 2rem;
        }
        
        .wizard-header-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-left: -0.5rem;
        }
        
        .wizard-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #18181b;
          letter-spacing: -0.025em;
          margin: 0;
        }
        
        .wizard-subtitle {
          font-size: 0.875rem;
          color: #71717a;
          margin-top: 0.25rem;
        }
        
        .steps-container {
          margin-bottom: 1.5rem;
          padding: 0;
        }
        
        .steps-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;
        }
        
        .step-label {
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
        }
        
        .wizard-card {
          background-color: white;
          border: 1px solid #e4e4e7;
          border-radius: 0.75rem;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          padding: 1.5rem;
        }

        @media (max-width: 640px) {
          .wizard-container {
            padding: 1rem;
          }
          
          .wizard-title {
            font-size: 1.5rem;
          }

          .wizard-header-top {
            margin-left: 0;
            gap: 1rem;
          }

          .step-label {
            font-size: 0.7rem;
            display: none; /* Hide labels on very small screens */
          }
          
          .wizard-card {
            padding: 1.25rem;
          }
        }
        
        @media (min-width: 480px) {
          .step-label {
            display: block;
          }
        }

        .warning-container {
          margin-top: 2rem;
          padding: 1rem;
          background-color: #fff1f2;
          border: 1px solid #fee2e2;
          border-radius: 0.75rem;
          display: flex;
          gap: 0.75rem;
          align-items: center;
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .warning-icon {
          color: #e11d48;
          flex-shrink: 0;
        }

        .warning-text {
          font-size: 0.8125rem;
          color: #9f1239;
          font-weight: 500;
          line-height: 1.4;
        }
      `}</style>

      {/* Header */}
      <div className="wizard-header">
        <h1 className="wizard-title">
          New Refund Request
        </h1>
        <p className="wizard-subtitle">
          Follow the steps to submit your expense.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="steps-container">
        <div className="steps-inner">
          {steps.map((s, index) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isCompleted = step > s.id

            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', flex: index < steps.length - 1 ? 1 : 'none' }}>
                {/* Step Item */}
                <div className="step-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: isCompleted || isActive ? '#18181b' : '#e4e4e7',
                      backgroundColor: isCompleted ? '#18181b' : 'white',
                      color: isCompleted ? 'white' : isActive ? '#18181b' : '#a1a1aa',
                      transition: 'all 200ms',
                      zIndex: 1,
                      flexShrink: 0
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle style={{ width: '1rem', height: '1rem' }} />
                    ) : (
                      <Icon style={{ width: '0.875rem', height: '0.875rem' }} />
                    )}
                  </div>
                  <span
                    className="step-label"
                    style={{
                      color: isActive || isCompleted ? '#18181b' : '#71717a',
                    }}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      margin: '0 0.75rem',
                      marginTop: 'calc(2.25rem / 2 - 1px)',
                      backgroundColor: '#e4e4e7',
                      borderRadius: '1px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: '#18181b',
                        transition: 'width 300ms',
                        width: step > s.id ? '100%' : '0%'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-card">
        {step === 1 && <StepCategory />}
        {step === 2 && <StepDetails />}
        {step === 3 && <StepSummary />}
      </div>

      {/* Warning Footer */}
      <div className="warning-container">
        <AlertCircle className="warning-icon" size={18} />
        <p className="warning-text">
          <strong>Important:</strong> Please ensure your submission is valid and accurate.
        </p>
      </div>
    </div>
  )

}
