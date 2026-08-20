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
  const evidenceTimeline = buildEvidenceTimeline(report.photos)
  const featuredEvidence = getFeaturedEvidenceItems(evidenceGroups)
  const totalPhotoCount = report.photos.length
  const documentedStageCount = Object.values(evidenceGroups).filter((photos) => photos.length > 0).length
  const evidencePages = buildEvidenceRecordPages(evidenceTimeline, report.reportNumber)
  const hasSeparateRecordPage = evidenceTimeline.length > 3
  const reportPageCount = 1 + evidencePages.length + (hasSeparateRecordPage ? 1 : 0)
  const reportVersionLabel = "1"
  const completionDateLabel = formatDate(report.workDate ?? report.generatedAt)
  const issueChanges = report.issues ?? []
  const workPerformedSummary = getWorkPerformedSummary(report)
  const proofSummaryItems = [
    {
      label: "Pre-work condition",
      complete: evidenceGroups.BEFORE.length > 0,
    },
    {
      label: "Work performed",
      complete: evidenceGroups.DURING.length > 0 || Boolean(report.workPerformed),
    },
    {
      label: "Final condition",
      complete: evidenceGroups.AFTER.length > 0,
    },
    {
      label: `${totalPhotoCount} evidence photo${totalPhotoCount === 1 ? "" : "s"}`,
      complete: totalPhotoCount > 0,
    },
  ]
  const completionReviewItems = [
    {
      label: "Work completed",
      complete: report.workStatus === "COMPLETED",
    },
    {
      label: "Final condition documented",
      complete: evidenceGroups.AFTER.length > 0,
    },
    {
      label: "Cleanup completed",
      complete: report.completionReview?.cleanupCompleted ?? report.workStatus === "COMPLETED",
    },
    {
      label: "Required evidence captured",
      complete: evidenceGroups.BEFORE.length > 0 && evidenceGroups.AFTER.length > 0,
    },
  ]

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
            <span>{report.reportNumber} - Version {reportVersionLabel}</span>
            <span>Page {pageNumber} of {reportPageCount}</span>
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

  function renderPhotoFrame(photo: WorkEntryPhoto | undefined, label: string) {
    return (
      <div className="proof-report-photo-frame">
        {photo && photoObjectUrls[photo.id] ? (
          <img
            src={photoObjectUrls[photo.id]}
            alt={photo.caption || label}
            loading="lazy"
          />
        ) : (
          <span>{label}</span>
        )}
      </div>
    )
  }

  function renderFeaturedEvidenceCard(item: FeaturedEvidenceItem) {
    return (
      <article className="proof-report-featured-evidence" key={item.stage}>
        <span>{item.shortLabel.toUpperCase()}</span>
        {renderPhotoFrame(item.photo, item.shortLabel)}
        <div>
          <strong>{item.title}</strong>
          <p>{item.photo ? getEvidenceCaptionTitle(item.photo) : item.emptyCopy}</p>
          <small>{item.photo ? formatTime(item.photo.uploadedAt) : "Not captured"}</small>
        </div>
      </article>
    )
  }

  function renderEvidenceTimelineItem(item: EvidenceTimelineItem) {
    const photoArea = getEvidenceAreaLabel(report, item.photo)
    const locationLabel = item.photo.locationLabel || report.jobAddress

    return (
      <article className="proof-report-timeline-item" key={item.photo.id}>
        <div className="proof-report-timeline-heading">
          <span>{String(item.sequence).padStart(2, "0")}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </div>
        {renderPhotoFrame(item.photo, item.title)}
        <div className="proof-report-timeline-caption">
          <strong>{getEvidenceCaptionTitle(item.photo)}</strong>
          <dl>
            <div>
              <dt>Stage</dt>
              <dd>{formatPhotoCategory(item.photo.category)}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{photoArea}</dd>
            </div>
            <div>
              <dt>Caption</dt>
              <dd>{getEvidenceCaption(item.photo)}</dd>
            </div>
            <div>
              <dt>Captured</dt>
              <dd>{formatDateTime(item.photo.uploadedAt)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{locationLabel}</dd>
            </div>
            <div>
              <dt>Verified</dt>
              <dd>{item.photo.locationVerified === false ? "Address on record" : "Location verified"}</dd>
            </div>
            {item.photo.capturedBy ? (
              <div>
                <dt>Captured by</dt>
                <dd>{item.photo.capturedBy}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </article>
    )
  }

  function renderIssuesAndChanges() {
    return (
      <section className="proof-report-issues-changes">
        <h2>Issues & Changes</h2>
        {issueChanges.length === 0 ? (
          <p>No issues or scope changes were documented.</p>
        ) : (
          <div className="proof-report-issue-list">
            {issueChanges.map((issue, index) => (
              <article key={`${issue.title}-${index}`}>
                <strong>{issue.title}</strong>
                <dl>
                  {issue.area ? (
                    <div>
                      <dt>Area</dt>
                      <dd>{issue.area}</dd>
                    </div>
                  ) : null}
                  {issue.impact ? (
                    <div>
                      <dt>Impact</dt>
                      <dd>{issue.impact}</dd>
                    </div>
                  ) : null}
                  {issue.actionTaken ? (
                    <div>
                      <dt>Action taken</dt>
                      <dd>{issue.actionTaken}</dd>
                    </div>
                  ) : null}
                  {typeof issue.customerNotified === "boolean" ? (
                    <div>
                      <dt>Customer notified</dt>
                      <dd>{issue.customerNotified ? "Yes" : "No"}</dd>
                    </div>
                  ) : null}
                  {typeof issue.evidencePhotoCount === "number" ? (
                    <div>
                      <dt>Evidence</dt>
                      <dd>
                        {issue.evidencePhotoCount} photo
                        {issue.evidencePhotoCount === 1 ? "" : "s"}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    )
  }

  function renderCompletionReview() {
    return (
      <section className="proof-report-completion-review">
        <h2>Completion review</h2>
        <ul className="proof-report-completion-list">
          {completionReviewItems.map((item) => (
            <li data-complete={item.complete ? "true" : "false"} key={item.label}>
              <span>{item.complete ? "✓" : "-"}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  function renderDocumentRecord() {
    const deliveryLabel = report.deliveredAt
      ? formatDateTime(report.deliveredAt)
      : report.status === "SHARED"
        ? "Shared link active"
        : "Not delivered yet"

    return (
      <section className="proof-report-document-record">
        <div>
          <h2>Document record</h2>
          <p>
            This report is a preserved snapshot of the job documentation available
            when this version was generated.
          </p>
        </div>
        <dl>
          <div>
            <dt>Report</dt>
            <dd>{report.reportNumber}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{reportVersionLabel}</dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{formatDateTime(report.generatedAt)}</dd>
          </div>
          <div>
            <dt>Delivered</dt>
            <dd>{deliveryLabel}</dd>
          </div>
          {report.deliveredVersion || report.deliveredAt ? (
            <div>
              <dt>Version delivered</dt>
              <dd>{report.deliveredVersion ?? `v${reportVersionLabel}`}</dd>
            </div>
          ) : null}
        </dl>
      </section>
    )
  }

  function renderEvidencePageRecordSections() {
    return (
      <div className="proof-report-record-sections">
        {renderIssuesAndChanges()}
        {renderCompletionReview()}
        {renderDocumentRecord()}
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
        <article className="report-document report-page proof-report-page proof-report-summary-page">
          {renderReportHeader(1)}

          <section className="proof-report-executive">
            <p className="report-label">Proof of Work Report</p>
            <h2>{report.workType} - {report.jobAddress}</h2>
            <p>{report.jobAddress}</p>
            <div className="proof-report-meta-line">
              <span>Customer: {report.customerName}</span>
              <span>Contractor: {report.workspaceName}</span>
              <span>Completed: {completionDateLabel}</span>
            </div>
          </section>

          <section className="proof-report-work-summary">
            <h2>Work performed</h2>
            <p>{workPerformedSummary}</p>
          </section>

          <section className="proof-report-proof-summary">
            <h2>Proof captured</h2>
            <ul>
              {proofSummaryItems.map((item) => (
                <li data-complete={item.complete ? "true" : "false"} key={item.label}>
                  <span>{item.complete ? "✓" : "-"}</span>
                  {item.label}
                </li>
              ))}
            </ul>
            <p>
              {documentedStageCount}/3 evidence stages documented
              <span aria-hidden="true"> · </span>
              {formatIssueSummary(issueChanges.length)}
              <span aria-hidden="true"> · </span>
              Completed {completionDateLabel}
            </p>
          </section>

          <section className="proof-report-featured-strip">
            <h2>Before / During / After</h2>
            <div>
              {featuredEvidence.map(renderFeaturedEvidenceCard)}
            </div>
          </section>

          {renderReportFooter(1)}
        </article>

        {evidencePages.map((evidencePage, pageIndex) => {
          const pageNumber = pageIndex + 2
          const shouldRenderRecordSections =
            !hasSeparateRecordPage && pageIndex === evidencePages.length - 1

          return (
            <article
              className="report-document report-page proof-report-page proof-report-evidence-page"
              key={`evidence-page-${pageNumber}`}
            >
              {renderReportHeader(pageNumber)}

              <section className="proof-report-evidence-timeline">
                <p className="report-label">Evidence record</p>
                <h2>{evidencePage.title}</h2>
                <p>{evidencePage.copy}</p>
                <div className="proof-report-timeline-list">
                  {evidencePage.items.length > 0 ? (
                    evidencePage.items.map(renderEvidenceTimelineItem)
                  ) : (
                    <p className="proof-report-empty">
                      No evidence photos were captured for this report.
                    </p>
                  )}
                </div>
              </section>

              {shouldRenderRecordSections ? renderEvidencePageRecordSections() : null}

              {renderReportFooter(pageNumber)}
            </article>
          )
        })}

        {hasSeparateRecordPage ? (
          <article className="report-document report-page proof-report-page proof-report-evidence-page">
            {renderReportHeader(reportPageCount)}

            <section className="proof-report-evidence-timeline proof-report-evidence-timeline--record">
              <p className="report-label">Evidence record</p>
              <h2>Completion and document record</h2>
              <p>
                Final review details for {report.reportNumber} and the preserved
                report version.
              </p>
            </section>

            {renderEvidencePageRecordSections()}

            {renderReportFooter(reportPageCount)}
          </article>
        ) : null}

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
  }).format(parseReportDate(value))
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

function formatTime(value?: string | null) {
  if (!value) {
    return "No time"
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function parseReportDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  return new Date(value)
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

function completeSentence(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return "The completed work was documented in FieldProof."
  }

  return /[.!?]$/.test(trimmedValue) ? trimmedValue : `${trimmedValue}.`
}

function getWorkPerformedSummary(report: ReportSnapshot) {
  if (report.workPerformed.trim()) {
    return completeSentence(report.workPerformed)
  }

  return "The documented work area was photographed before, during, and after completion."
}

function formatIssueSummary(issueCount: number) {
  if (issueCount === 0) {
    return "No issues or scope changes were documented"
  }

  return `${issueCount} issue or scope change${issueCount === 1 ? "" : "s"} documented`
}

interface FeaturedEvidenceItem {
  stage: WorkEntryPhoto["category"]
  shortLabel: string
  title: string
  emptyCopy: string
  photo?: WorkEntryPhoto
}

interface EvidenceTimelineItem {
  sequence: number
  title: string
  description: string
  photo: WorkEntryPhoto
}

interface EvidenceRecordPage {
  title: string
  copy: string
  items: EvidenceTimelineItem[]
}

const photoStageOrder: Record<WorkEntryPhoto["category"], number> = {
  BEFORE: 0,
  DURING: 1,
  AFTER: 2,
}

const featuredEvidenceLabels: Record<
  WorkEntryPhoto["category"],
  Omit<FeaturedEvidenceItem, "stage" | "photo">
> = {
  BEFORE: {
    shortLabel: "Before",
    title: "Pre-work condition",
    emptyCopy: "No pre-work photo was attached.",
  },
  DURING: {
    shortLabel: "During",
    title: "Work performed",
    emptyCopy: "No work-in-progress photo was attached.",
  },
  AFTER: {
    shortLabel: "After",
    title: "Final condition",
    emptyCopy: "No final-condition photo was attached.",
  },
}

const timelineStageCopy: Record<
  WorkEntryPhoto["category"],
  { title: string; description: string }
> = {
  BEFORE: {
    title: "Pre-work condition",
    description: "Existing condition before work began.",
  },
  DURING: {
    title: "Work performed",
    description: "Documented work activity and repair progress.",
  },
  AFTER: {
    title: "Final condition",
    description: "Completed work and final condition.",
  },
}

function getFeaturedEvidenceItems(
  evidenceGroups: Record<WorkEntryPhoto["category"], WorkEntryPhoto[]>,
): FeaturedEvidenceItem[] {
  return (["BEFORE", "DURING", "AFTER"] as const).map((stage) => ({
    stage,
    photo: evidenceGroups[stage][0],
    ...featuredEvidenceLabels[stage],
  }))
}

function getEvidenceCaption(photo: WorkEntryPhoto) {
  const caption = photo.caption.trim()

  if (caption) {
    return completeSentence(caption)
  }

  return completeSentence(timelineStageCopy[photo.category].description)
}

function getEvidenceCaptionTitle(photo: WorkEntryPhoto) {
  const caption = photo.caption.trim()

  if (caption) {
    return caption
  }

  return timelineStageCopy[photo.category].description.replace(/[.]$/, "")
}

function getEvidenceAreaLabel(report: ReportSnapshot, photo: WorkEntryPhoto) {
  if (photo.area?.trim()) {
    return photo.area.trim()
  }

  if (report.workType.trim()) {
    return `${report.workType.trim()} area`
  }

  return "Documented work area"
}

function buildEvidenceTimeline(photos: WorkEntryPhoto[]): EvidenceTimelineItem[] {
  return [...photos]
    .sort((firstPhoto, secondPhoto) => {
      const stageSort = photoStageOrder[firstPhoto.category] - photoStageOrder[secondPhoto.category]

      if (stageSort !== 0) {
        return stageSort
      }

      return new Date(firstPhoto.uploadedAt).getTime() - new Date(secondPhoto.uploadedAt).getTime()
    })
    .map((photo, index) => ({
      sequence: index + 1,
      photo,
      ...timelineStageCopy[photo.category],
    }))
}

function buildEvidenceRecordPages(
  items: EvidenceTimelineItem[],
  reportNumber: string,
): EvidenceRecordPage[] {
  if (items.length <= 3) {
    return [{
      title: `${reportNumber} - Preserved snapshot`,
      copy: "Before, work, and after evidence captured for this job record.",
      items,
    }]
  }

  return (["BEFORE", "DURING", "AFTER"] as const).flatMap((stage) =>
    chunkItems(
      items.filter((item) => item.photo.category === stage),
      3,
    ).map((stageItems, index, stageChunks) => ({
      title: stageChunks.length > 1
        ? `${timelineStageCopy[stage].title} (${index + 1} of ${stageChunks.length})`
        : timelineStageCopy[stage].title,
      copy: timelineStageCopy[stage].description,
      items: stageItems,
    })),
  )
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
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
