
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RequestCategory = 'transport' | 'equipment' | 'certification' | 'other'

interface WizardState {
  step: number
  data: {
    category: RequestCategory | null
    amount: string
    description: string
    date: Date | undefined
    title: string
    certificateId: string | null
    targetDate: Date | undefined
    departure: string
    destination: string
    invoiceAddressedTo: boolean 
  }
  setStep: (step: number) => void
  setData: (data: Partial<WizardState['data']>) => void
  reset: () => void
}

const initialData = {
  category: null,
  amount: '',
  description: '',
  title: '',
  date: undefined,
  certificateId: null,
  targetDate: undefined,
  departure: '',
  destination: '',
  invoiceAddressedTo: false,
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      step: 1,
      data: initialData,
      setStep: (step) => set({ step }),
      setData: (newData) => set((state) => ({ data: { ...state.data, ...newData } })),
      reset: () => set({
        step: 1,
        data: initialData
      }),
    }),
    {
      name: 'refund-wizard-storage',
      partialize: (state) => ({
        step: state.step,
        data: state.data
      }),
    }
  )
)

