import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Download,
  MoreHorizontal,
  Printer,
  Share2,
  X,
} from "lucide-react"

import {
  createReportShareLink,
  revokeReportShareLink,
  type ReportShareLinkResponse,
} from "@/lib/api"
import type { ReportSnapshot, ReportStatus, WorkEntryPhoto } from "@/types/domain"

import { Button } from "@/components/ui/button"

const FIRST_REPORT_COMPLETION_SEEN_KEY_PREFIX = "fieldproof.firstReportCompletionDialogSeen"
const REPORT_PAGE_COUNT = 3

interface ReportPreviewPageProps {
  report: ReportSnapshot
  authToken?: string
  isSharedView?: boolean
  forceFirstReportCompletion?: boolean
  showFirstReportCompletion?: boolean
  onReportReviewed?: (reportId: number) => Promise<string | null | undefined>
  onReportStatusChange?: (reportId: number, status: ReportStatus) => void
  onGoToDashboard?: () => void
  onBack: () => void
}

function getFirstReportCompletionSeenKey(reportId: number) {
  return `${FIRST_REPORT_COMPLETION_SEEN_KEY_PREFIX}:${reportId}`
}

function hasSeenFirstReportCompletionDialog(reportId: number) {
  try {
    return window.localStorage.getItem(getFirstReportCompletionSeenKey(reportId)) === "true"
  } catch {
    return false
  }
}

function markFirstReportCompletionDialogSeen(reportId: number) {
  try {
    window.localStorage.setItem(getFirstReportCompletionSeenKey(reportId), "true")
  } catch {
    // This only controls whether the local completion modal repeats.
  }
}

export function ReportPreviewPage({
  report,
  authToken,
  isSharedView = false,
  forceFirstReportCompletion = false,
  showFirstReportCompletion = false,
  onReportReviewed,
  onReportStatusChange,
  onGoToDashboard,
  onBack,
}: ReportPreviewPageProps) {
  const [photoObjectUrls, setPhotoObjectUrls] = useState<Record<number, string>>({})
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [completionDialogRecorded, setCompletionDialogRecorded] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [shareLink, setShareLink] = useState<ReportShareLinkResponse | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [isCopyingLink, setIsCopyingLink] = useState(false)
  const [isRevokingLink, setIsRevokingLink] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const reviewRequestStartedRef = useRef(false)
  const reportStatusLabel = report.status === "SHARED" ? "Shared" : "Ready to share"

  useEffect(() => {
    setShowCompletionDialog(false)
    setCompletionDialogRecorded(false)
    reviewRequestStartedRef.current = false
  }, [report.id])

  useEffect(() => {
    const objectUrls: string[] = []
    let isCurrent = true

    async function loadReportPhotos() {
      const photoEntries = await Promise.all(
        report.photos.map(async (photo) => {
          if (photo.previewUrl || !photo.contentUrl) {
            return [photo.id, photo.previewUrl] as const
          }

          const headers = new Headers()

          if (authToken) {
            headers.set("Authorization", `Bearer ${authToken}`)
          }

          const response = await fetch(photo.contentUrl, { headers })

          if (!response.ok) {
            return [photo.id, undefined] as const
          }

          const objectUrl = URL.createObjectURL(await response.blob())
          objectUrls.push(objectUrl)
          return [photo.id, objectUrl] as const
        }),
      )

      if (!isCurrent) {
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
        return
      }

      setPhotoObjectUrls(
        Object.fromEntries(
          photoEntries.filter((entry): entry is [number, string] =>
            Boolean(entry[1]),
          ),
        ),
      )
    }

    void loadReportPhotos()

    return () => {
      isCurrent = false
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
    }
  }, [authToken, report])

  useEffect(() => {
    if (
      isSharedView
      || !showFirstReportCompletion
      || completionDialogRecorded
    ) {
      return
    }

    setCompletionDialogRecorded(true)

    if (
      forceFirstReportCompletion
      || !hasSeenFirstReportCompletionDialog(report.id)
    ) {
      markFirstReportCompletionDialogSeen(report.id)
      setShowCompletionDialog(true)
    }

    if (report.reviewedAt || !onReportReviewed || reviewRequestStartedRef.current) {
      return
    }

    reviewRequestStartedRef.current = true

    void onReportReviewed(report.id).catch(() => {
      // The local completion moment can still show if backend review persistence fails.
    })
  }, [
    completionDialogRecorded,
    forceFirstReportCompletion,
    isSharedView,
    onReportReviewed,
    report.id,
    report.reviewedAt,
    showFirstReportCompletion,
  ])

  function handlePrint() {
    window.print()
  }

  async function handleCopySecureLink() {
    if (!authToken) {
      return
    }

    setIsCopyingLink(true)
    setShareError(null)
    setShareMessage(null)

    try {
      const activeShareLink =
        shareLink?.shareUrl && !shareLink.revokedAt
          ? shareLink
          : await createReportShareLink(authToken, report.id)

      if (!activeShareLink.shareUrl) {
        throw new Error("Share link was not returned.")
      }

      await navigator.clipboard.writeText(activeShareLink.shareUrl)
      setShareLink(activeShareLink)
      setShareMessage("Secure report link copied to clipboard.")
      onReportStatusChange?.(report.id, "SHARED")
    } catch {
      setShareError("Could not copy the secure report link.")
    } finally {
      setIsCopyingLink(false)
    }
  }

  async function handleRevokeLink() {
    if (!authToken || !shareLink) {
      return
    }

    setIsRevokingLink(true)
    setShareError(null)
    setShareMessage(null)

    try {
      const revokedLink = await revokeReportShareLink(
        authToken,
        report.id,
        shareLink.id,
      )

      setShareLink({
        ...revokedLink,
        shareUrl: null,
      })
      setShareMessage("Secure report link revoked.")
      onReportStatusChange?.(report.id, "GENERATED")
    } catch {
      setShareError("Could not revoke the secure report link.")
    } finally {
      setIsRevokingLink(false)
    }
  }

  const evidenceGroups = groupReportPhotos(report.photos)
  const beforeDuringPhotos = [
    ...evidenceGroups.BEFORE,
    ...evidenceGroups.DURING,
  ]
  const afterPhotos = evidenceGroups.AFTER
  const totalPhotoCount = report.photos.length
  const documentedStageCount = Object.values(evidenceGroups).filter((photos) => photos.length > 0).length
  const scheduleLabel = formatScheduleDateTime(
    report.workDate,
    report.scheduledStartTime,
    report.arrivalWindow,
  )

  function renderReportHeader(pageNumber: number) {
    return (
      <header className="proof-report-header">
        <div className="proof-report-brand">
          <span className="proof-report-logo" aria-hidden="true">FP</span>
          <div>
            <strong>FieldProof</strong>
            <p>Contractor documentation platform</p>
          </div>
        </div>

        <div className="proof-report-title-block">
          <h1>Proof of Work Report</h1>
          <p>
            <span>{report.reportNumber}</span>
            <span>Page {pageNumber} of {REPORT_PAGE_COUNT}</span>
          </p>
        </div>
      </header>
    )
  }

  function renderReportFooter(pageNumber: number) {
    return (
      <footer className="proof-report-footer">
        <span>FieldProof - Report {report.reportNumber} - Page {pageNumber}</span>
        <span>Generated {formatDateTime(report.generatedAt)}</span>
      </footer>
    )
  }

  function renderEvidenceCards(photos: WorkEntryPhoto[], emptyMessage: string) {
    if (photos.length === 0) {
      return <p className="proof-report-empty">{emptyMessage}</p>
    }

    return (
      <div className="proof-report-evidence-grid">
        {photos.map((photo) => (
          <article className="proof-report-photo-card" key={photo.id}>
            <div className="proof-report-photo-frame">
              {photoObjectUrls[photo.id] ? (
                <img
                  src={photoObjectUrls[photo.id]}
                  alt={photo.caption}
                  loading="lazy"
                />
              ) : (
                <span>{formatPhotoCategory(photo.category)}</span>
              )}
            </div>
            <div className="proof-report-photo-body">
              <div className="proof-report-photo-meta">
                <strong>{formatPhotoCategory(photo.category)} Work</strong>
                <span>{formatDateTime(photo.uploadedAt)}</span>
              </div>
              <p>{photo.caption || `${formatPhotoCategory(photo.category)} evidence`}</p>
              <small>Documented by {report.workspaceName}</small>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <section className="report-route">
      <div className="report-toolbar">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={16} />
          {isSharedView ? "Back" : "Back to dashboard"}
        </Button>

        <div className="report-toolbar-title">
          <strong>{report.reportNumber}</strong>
          <span>
            {reportStatusLabel} - Generated {formatDate(report.generatedAt)}
          </span>
        </div>

        <div className="report-toolbar-actions">
          <Button variant="secondary" onClick={handlePrint}>
            <Download aria-hidden="true" size={16} />
            Download PDF
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer aria-hidden="true" size={16} />
            Print
          </Button>
          {!isSharedView ? (
            <Button variant="secondary" onClick={() => setShareDialogOpen(true)}>
              <Share2 aria-hidden="true" size={16} />
              Share
            </Button>
          ) : null}
          {!isSharedView ? (
            <div className="report-more-menu">
              <Button
                variant="ghost"
                aria-label="More report actions"
                onClick={() => setMoreMenuOpen((isOpen) => !isOpen)}
              >
                <MoreHorizontal aria-hidden="true" size={18} />
              </Button>
              {moreMenuOpen ? (
                <div className="report-more-menu-panel">
                  <button type="button" onClick={onBack}>
                    Return to dashboard
                  </button>
                  <button type="button" onClick={() => setMoreMenuOpen(false)}>
                    Report details
                  </button>
                  <button type="button" onClick={() => setMoreMenuOpen(false)}>
                    Generate updated version
                  </button>
                  <button type="button" onClick={() => setMoreMenuOpen(false)}>
                    Archive report
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="report-pages">
        <article className="report-document report-page proof-report-page">
          {renderReportHeader(1)}

          <section className="proof-report-overview">
            <h2>Job Overview</h2>
            <div className="proof-report-overview-grid">
              <div className="proof-report-overview-row">
                <span>Job / Description</span>
                <strong>{report.jobName}</strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Status</span>
                <strong>
                  <span className="proof-report-status">{formatStatus(report.workStatus)}</span>
                </strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Property Address</span>
                <strong>{report.jobAddress}</strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Customer</span>
                <strong>{report.customerName}</strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Work Type</span>
                <strong>{report.workType}</strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Company</span>
                <strong>{report.workspaceName}</strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Scheduled</span>
                <strong>{scheduleLabel}</strong>
              </div>
              <div className="proof-report-overview-row">
                <span>Report Created</span>
                <strong>{formatDateTime(report.generatedAt)}</strong>
              </div>
            </div>
          </section>

          <section className="proof-report-callout">
            <p className="report-label">Executive Summary</p>
            <p>
              {report.workspaceName} documented this job using structured field notes
              and Before, During, and After photo evidence.
            </p>
          </section>

          <section className="proof-report-section">
            <h2>Detailed Work Documentation</h2>
            <div className="proof-report-documentation-list">
              <article>
                <span>1. Work Performed</span>
                <p>{report.workPerformed}</p>
              </article>
              <article>
                <span>2. Evidence Captured</span>
                <p>
                  {totalPhotoCount} photos were attached to this report across{" "}
                  {documentedStageCount} documented stage{documentedStageCount === 1 ? "" : "s"}.
                </p>
              </article>
              <article>
                <span>3. Completion Record</span>
                <p>
                  Job status at generation was {formatStatus(report.workStatus)}.
                  This report records the job documentation available when it was generated.
                </p>
              </article>
            </div>
          </section>

          {renderReportFooter(1)}
        </article>

        <article className="report-document report-page proof-report-page">
          {renderReportHeader(2)}

          <section className="proof-report-section proof-report-section-first">
            <h2>Photo Evidence - Before & During Work</h2>
            {renderEvidenceCards(
              beforeDuringPhotos,
              "No Before or During photos were included in this report.",
            )}
          </section>

          {renderReportFooter(2)}
        </article>

        <article className="report-document report-page proof-report-page">
          {renderReportHeader(3)}

          <section className="proof-report-section proof-report-section-first">
            <h2>Photo Evidence - After Work</h2>
            {renderEvidenceCards(afterPhotos, "No After photos were included in this report.")}
          </section>

          <section className="proof-report-section proof-report-metrics-section">
            <h2>Documentation Metrics</h2>
            <div className="proof-report-metrics-grid">
              <div>
                <span>Total Images Recorded</span>
                <strong>{totalPhotoCount} photos</strong>
              </div>
              <div>
                <span>Evidence Stages</span>
                <strong>{documentedStageCount} of 3</strong>
              </div>
              <div>
                <span>Record State</span>
                <strong>Snapshot Recorded</strong>
              </div>
              <div>
                <span>Delivery Status</span>
                <strong>{reportStatusLabel}</strong>
              </div>
            </div>
          </section>

          <section className="proof-report-record-notice">
            <strong>Official Record Notice</strong>
            <p>
              This report presents the saved job details and evidence references
              available when it was generated. Later edits to the active work entry
              do not change the saved report details.
            </p>
          </section>

          {renderReportFooter(3)}
        </article>
      </div>

      {showCompletionDialog ? (
        <div className="report-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="first-report-dialog-title"
            aria-modal="true"
            className="report-dialog first-report-dialog"
            role="dialog"
          >
            <button
              aria-label="Close"
              className="dialog-close-button"
              type="button"
              onClick={() => setShowCompletionDialog(false)}
            >
              <X aria-hidden="true" size={17} />
            </button>
            <div className="first-report-monogram" aria-hidden="true">
              FP
            </div>
            <h2 id="first-report-dialog-title">Your first proof report is ready</h2>
            <p>You completed the full FieldProof workflow.</p>
            <div className="report-dialog-actions">
              <Button onClick={handlePrint}>
                Download PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCompletionDialog(false)
                  setShareDialogOpen(true)
                }}
              >
                Share report
              </Button>
            </div>
            <div className="first-report-footer-action">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCompletionDialog(false)
                  onGoToDashboard?.()
                }}
              >
                Go to dashboard
                <span aria-hidden="true">-&gt;</span>
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {shareDialogOpen && !isSharedView ? (
        <div className="report-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="share-report-dialog-title"
            aria-modal="true"
            className="report-dialog share-report-dialog"
            role="dialog"
          >
            <button
              aria-label="Close"
              className="dialog-close-button"
              type="button"
              onClick={() => setShareDialogOpen(false)}
            >
              <X aria-hidden="true" size={17} />
            </button>
            <p className="eyebrow">Share report</p>
            <h2 id="share-report-dialog-title">Share report</h2>
            <p>
              Anyone with this secure link can view this report until{" "}
              {formatDate(shareLink?.expiresAt ?? getDefaultExpirationDate())}.
            </p>

            {shareLink?.shareUrl && !shareLink.revokedAt ? (
              <div className="share-link-preview">{shareLink.shareUrl}</div>
            ) : null}

            {shareMessage ? <p className="form-success">{shareMessage}</p> : null}
            {shareError ? <p className="form-error">{shareError}</p> : null}

            <div className="report-dialog-actions">
              <Button disabled={isCopyingLink} onClick={handleCopySecureLink}>
                <Share2 aria-hidden="true" size={16} />
                {isCopyingLink ? "Copying..." : "Copy secure link"}
              </Button>
              <Button
                variant="secondary"
                disabled={!shareLink || Boolean(shareLink.revokedAt) || isRevokingLink}
                onClick={handleRevokeLink}
              >
                {isRevokingLink ? "Revoking..." : "Revoke link"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function getDefaultExpirationDate() {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  return expiresAt.toISOString()
}

function formatDate(value?: string | null) {
  if (!value) {
    return "No date"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "No date"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatScheduleTime(value?: string | null) {
  if (!value) {
    return null
  }

  const [hours, minutes = "00"] = value.split(":")
  const hourNumber = Number(hours)

  if (Number.isNaN(hourNumber)) {
    return value
  }

  const period = hourNumber >= 12 ? "PM" : "AM"
  const twelveHour = hourNumber % 12 || 12

  return `${twelveHour}:${minutes} ${period}`
}

function formatScheduleDateTime(
  workDate?: string | null,
  scheduledStartTime?: string | null,
  arrivalWindow?: string | null,
) {
  const dateLabel = formatDate(workDate)
  const timeLabel = formatScheduleTime(scheduledStartTime)
    ?? arrivalWindow
    ?? null

  return timeLabel ? `${dateLabel} - ${timeLabel}` : dateLabel
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatPhotoCategory(category: WorkEntryPhoto["category"]) {
  return formatStatus(category)
}

function groupReportPhotos(photos: WorkEntryPhoto[]) {
  return photos.reduce<Record<WorkEntryPhoto["category"], WorkEntryPhoto[]>>(
    (groups, photo) => {
      groups[photo.category].push(photo)
      return groups
    },
    {
      BEFORE: [],
      DURING: [],
      AFTER: [],
    },
  )
}
