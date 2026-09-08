import { CertificateManagementView } from "./certificate-management-view"

export default async function CertificatesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 600, color: '#18181b', letterSpacing: '-0.025em' }}>
          Certificate Management
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#71717a', marginTop: '0.25rem' }}>
          Manage certificates available for refund requests.
        </p>
      </div>

      <CertificateManagementView />
    </div>
  )
}