import type { ReportSnapshot } from "@/types/domain"

import { Button } from "@/components/ui/button"

interface ReportPreviewPageProps {
  report: ReportSnapshot
  onBack: () => void
}

export function ReportPreviewPage({ report, onBack }: ReportPreviewPageProps) {
  return (
    <section className="report-route">
      <div className="report-toolbar">
        <Button variant="ghost" onClick={onBack}>
          Back to dashboard
        </Button>
        <div className="hero-actions">
          <Button variant="secondary">Print soon</Button>
          <Button>Download PDF soon</Button>
        </div>
      </div>

      <article className="report-document">
        <header className="report-header">
          <div className="brand-row">
            <div className="brand-mark">FP</div>
            <div>
              <strong>FieldProof</strong>
              <p>Proof-of-work report</p>
            </div>
          </div>
          <div>
            <p className="report-label">Report</p>
            <strong>{report.reportNumber}</strong>
          </div>
        </header>

        <section className="report-title">
          <p className="report-label">Generated report</p>
          <h2>{report.jobName}</h2>
          <p>{report.jobAddress}</p>
        </section>

        <section className="report-summary">
          <div>
            <span>Company</span>
            <strong>{report.workspaceName}</strong>
          </div>
          <div>
            <span>Work date</span>
            <strong>{formatDate(report.workDate)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{formatStatus(report.workStatus)}</strong>
          </div>
        </section>

        <section className="report-section">
          <p className="report-label">Work summary</p>
          <p>{report.workPerformed}</p>
        </section>

        <section className="report-section">
          <p className="report-label">Evidence snapshot</p>
          <h3>Before, during, and after photos</h3>
          <div className="evidence-grid">
            {report.photos.map((photo) => (
              <article className="evidence-card" key={photo.id}>
                <div className="evidence-image">{photo.category}</div>
                <div className="evidence-card-content">
                  <span>{photo.category} work</span>
                  <strong>{photo.caption}</strong>
                  <p>Uploaded {formatDate(photo.uploadedAt)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </article>
    </section>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
