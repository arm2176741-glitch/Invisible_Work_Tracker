import type { WorkEntry } from "@/types/domain"

import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface WorkEntryListProps {
  entries: WorkEntry[]
  onOpenReport: (reportId: number) => void
  onContinueEntry: (entryId: number) => void
  emptyMessage?: string
}

function getStatusLabel(entry: WorkEntry) {
  if (entry.reportId) return "Completed"
  if (entry.status === "COMPLETED" || entry.proofReady) return "Report pending"
  if (entry.status === "SUBMITTED") return "In progress"

  return "Needs photos"
}

function getStatusTone(entry: WorkEntry) {
  if (entry.reportId) return "success"
  if (entry.status === "COMPLETED" || entry.proofReady) return "warning"
  if (entry.status === "SUBMITTED") return "info"

  return "warning"
}

export function WorkEntryList({
  entries,
  onOpenReport,
  onContinueEntry,
  emptyMessage = "Create a job to start documenting work.",
}: WorkEntryListProps) {
  return (
    <section className="card section-card work-entry-panel">
      <div className="section-title-row">
        <div>
          <h3>Recent jobs</h3>
        </div>
        <Button variant="ghost" size="sm">View all jobs</Button>
      </div>

      <div className="work-entry-table-header" aria-hidden="true">
        <span>Job name</span>
        <span>Address</span>
        <span>Report number</span>
        <span>Status</span>
        <span>Last active</span>
        <span>Action</span>
      </div>

      <div className="work-entry-list">
        {entries.length === 0 ? (
          <p className="empty-list-message">{emptyMessage}</p>
        ) : null}
        {entries.map((entry) => {
          const reportId = entry.reportId
          const statusTone = getStatusTone(entry)

          return (
            <article className="work-entry-row" key={entry.id}>
              <div className="work-entry-job-cell">
                <div className="work-entry-thumbnail" aria-hidden="true">
                  <img src={entry.thumbnailUrl} alt="" />
                </div>

                <div className="work-entry-main">
                  <h4 className="work-entry-title">{entry.jobName}</h4>
                  <p className="work-entry-state">
                    {entry.photoCount} photo{entry.photoCount === 1 ? "" : "s"} attached
                  </p>
                </div>
              </div>

              <p className="work-entry-cell muted">{entry.jobAddress}</p>
              <p className="work-entry-cell">{entry.reportNumber ?? "-"}</p>
              <p className="work-entry-cell">
                <span className={`work-entry-status-pill work-entry-status-pill-${statusTone}`}>
                  {getStatusLabel(entry)}
                </span>
              </p>
              <p className="work-entry-cell muted">{entry.updatedLabel}</p>

              <div className="row-actions work-entry-actions">
                {typeof reportId === "number" ? (
                  <Button
                    className="work-entry-action-button work-entry-action-button-outline"
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenReport(reportId)}
                  >
                    View report
                  </Button>
                ) : (
                  <Button
                    className="work-entry-action-button work-entry-action-button-primary"
                    variant="secondary"
                    size="sm"
                    onClick={() => onContinueEntry(entry.id)}
                  >
                    Continue
                    <ArrowRight aria-hidden="true" size={14} />
                  </Button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
