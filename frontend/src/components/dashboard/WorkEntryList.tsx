import type { WorkEntry } from "@/types/domain"

import { Button } from "@/components/ui/button"

interface WorkEntryListProps {
  entries: WorkEntry[]
  onOpenReport: (reportId: number) => void
}

export function WorkEntryList({ entries, onOpenReport }: WorkEntryListProps) {
  return (
    <section className="card section-card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Recent work entries</p>
          <h3>Latest job documentation</h3>
        </div>
        <Button variant="ghost" size="sm">View all</Button>
      </div>

      <div className="work-entry-list">
        {entries.map((entry) => {
          const reportId = entry.reportId

          return (
            <article className="work-entry-row" key={entry.id}>
              <div>
                <span>{entry.workType}</span>
                <h4>{entry.jobName}</h4>
                <p className="muted">{entry.jobAddress}</p>
                <div className="proof-badges">
                  <span className={`badge ${entry.status === "COMPLETED" ? "success" : "warning"}`}>
                    {entry.status === "COMPLETED" ? "Completed" : "In progress"}
                  </span>
                  <span className={`badge ${entry.proofReady ? "success" : "warning"}`}>
                    {entry.proofReady ? "Proof ready" : "Needs evidence"}
                  </span>
                  <span className="badge">{entry.photoCount} photos</span>
                </div>
              </div>

              <div className="row-actions">
                <Button variant="secondary" size="sm">Open</Button>
                {typeof reportId === "number" ? (
                  <Button size="sm" onClick={() => onOpenReport(reportId)}>
                    View report
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm">Add photos</Button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
