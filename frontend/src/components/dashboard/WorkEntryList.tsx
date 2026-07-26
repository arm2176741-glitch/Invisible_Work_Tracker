import { MoreVertical } from "lucide-react"

import type { WorkEntry } from "@/types/domain"

import { Button } from "@/components/ui/button"

interface WorkEntryListProps {
  entries: WorkEntry[]
  onOpenReport: (reportId: number) => void
}

function getStatusLabel(entry: WorkEntry) {
  if (entry.status === "COMPLETED") return "Proof ready"
  if (entry.status === "SUBMITTED") return "In progress"

  return "Needs evidence"
}

function getStatusTone(entry: WorkEntry) {
  if (entry.proofReady) return "success"
  if (entry.status === "SUBMITTED") return "info"

  return "warning"
}

export function WorkEntryList({ entries, onOpenReport }: WorkEntryListProps) {
  return (
    <section className="card section-card work-entry-panel">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Recent work entries</p>
          <h3>Latest job documentation</h3>
        </div>
        <Button variant="ghost" size="sm">View all work entries</Button>
      </div>

      <div className="work-entry-table-header" aria-hidden="true">
        <span>Work entry</span>
        <span>Address</span>
        <span>Report ID</span>
        <span>Updated</span>
        <span>Action</span>
      </div>

      <div className="work-entry-list">
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
                  <p className={`work-entry-state work-entry-state-${statusTone}`}>
                    {getStatusLabel(entry)} - {entry.photoCount} evidence photo{entry.photoCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <p className="work-entry-cell muted">{entry.jobAddress}</p>
              <p className="work-entry-cell">{entry.reportNumber ?? "-"}</p>
              <p className="work-entry-cell muted">{entry.updatedLabel}</p>

              <div className="row-actions work-entry-actions">
                {typeof reportId === "number" ? (
                  <Button size="sm" onClick={() => onOpenReport(reportId)}>
                    View report
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm">Open entry</Button>
                )}
                <button className="more-button" type="button" aria-label={`More actions for ${entry.jobName}`}>
                  <MoreVertical aria-hidden="true" size={17} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
