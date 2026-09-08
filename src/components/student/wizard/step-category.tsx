"use client"

import { useWizardStore, RequestCategory } from "@/store/wizard-store"
import { Plane, GraduationCap, HelpCircle } from "lucide-react"

const categories: { id: RequestCategory; label: string; icon: typeof Plane }[] = [
  { id: 'transport', label: 'Transport & Travel', icon: Plane },
  { id: 'certification', label: 'Certifications', icon: GraduationCap },
  { id: 'other', label: 'Other Expenses', icon: HelpCircle },
]

export function StepCategory() {
  const { data, setData, setStep } = useWizardStore()

  const handleSelect = (category: RequestCategory) => {
    setData({ category })
    setStep(2)
  }

  return (
    <div className="category-grid">
      <style>{`
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        @media (max-width: 640px) {
          .category-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {categories.map((cat) => {
        const Icon = cat.icon
        const isSelected = data.category === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelect(cat.id)}
            style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1.5rem',
              backgroundColor: isSelected ? '#fafafa' : 'white',
              border: `1px solid ${isSelected ? '#18181b' : '#e4e4e7'}`,
              borderRadius: '0.75rem',
              cursor: 'pointer',
              transition: 'all 150ms',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#d4d4d8'
                e.currentTarget.style.backgroundColor = '#fafafa'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#e4e4e7'
                e.currentTarget.style.backgroundColor = 'white'
              }
            }}
          >
            <div 
              style={{ 
                padding: '1rem',
                borderRadius: '50%',
                backgroundColor: isSelected ? '#18181b' : '#f4f4f5',
                transition: 'all 150ms'
              }}
            >
              <Icon 
                style={{ 
                  width: '1.5rem', 
                  height: '1.5rem', 
                  color: isSelected ? 'white' : '#71717a'
                }} 
              />
            </div>
            <span 
              style={{ 
                fontWeight: 500, 
                fontSize: '0.9375rem',
                color: '#18181b'
              }}
            >
              {cat.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
