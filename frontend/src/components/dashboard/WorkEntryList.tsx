import type { WorkEntry } from "@/types/domain"

import { useEffect, useState } from "react"
import { ArrowRight, Camera } from "lucide-react"

import { Button } from "@/components/ui/button"

interface WorkEntryListProps {
  entries: WorkEntry[]
  authToken?: string
  onOpenReport: (reportId: number) => void
  onContinueEntry: (entryId: number) => void
  onViewAllJobs?: () => void
  title?: string
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

function WorkEntryThumbnail({
  authToken,
  entry,
}: {
  authToken?: string
  entry: WorkEntry
}) {
  const [fetchedThumbnailUrl, setFetchedThumbnailUrl] = useState<string | null>(null)

  useEffect(() => {
    setFetchedThumbnailUrl(null)

    if (entry.thumbnailUrl || !entry.thumbnailContentUrl || !authToken) {
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null
    let isCurrent = true

    async function loadThumbnail() {
      try {
        const headers = new Headers()
        headers.set("Authorization", `Bearer ${authToken}`)

        const response = await fetch(entry.thumbnailContentUrl as string, {
          headers,
          signal: controller.signal,
        })

        if (!response.ok || !isCurrent) {
          return
        }

        objectUrl = URL.createObjectURL(await response.blob())

        if (isCurrent) {
          setFetchedThumbnailUrl(objectUrl)
        }
      } catch {
        if (isCurrent) {
          setFetchedThumbnailUrl(null)
        }
      }
    }

    void loadThumbnail()

    return () => {
      isCurrent = false
      controller.abort()

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [authToken, entry.thumbnailContentUrl, entry.thumbnailUrl])

  const thumbnailUrl = entry.thumbnailUrl ?? fetchedThumbnailUrl

  return (
    <div className="work-entry-thumbnail" aria-hidden="true">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" />
      ) : (
        <span className="work-entry-thumbnail-placeholder">
          <Camera aria-hidden="true" size={15} />
        </span>
      )}
    </div>
  )
}

export function WorkEntryList({
  entries,
  authToken,
  onOpenReport,
  onContinueEntry,
  onViewAllJobs,
  title = "Recent jobs",
  emptyMessage = "Create a job to start documenting work.",
}: WorkEntryListProps) {
  return (
    <section className="card section-card work-entry-panel">
      <div className="section-title-row">
        <div>
          <h3>{title}</h3>
        </div>
        {onViewAllJobs ? (
          <Button variant="ghost" size="sm" onClick={onViewAllJobs}>
            View all jobs
          </Button>
        ) : null}
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
                <WorkEntryThumbnail authToken={authToken} entry={entry} />

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
