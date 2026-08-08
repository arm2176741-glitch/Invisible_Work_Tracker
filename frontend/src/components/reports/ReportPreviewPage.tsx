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
import type { ReportSnapshot, ReportStatus } from "@/types/domain"

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
        <article className="report-document report-page">
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
              <span>Customer</span>
              <strong>{report.customerName}</strong>
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
        </article>

        <article className="report-document report-page">
          <section className="report-section report-section-first">
            <p className="report-label">Evidence snapshot</p>
            <h3>Before, during, and after photos</h3>
            <div className="evidence-grid">
              {report.photos.map((photo) => (
                <article className="report-evidence-card" key={photo.id}>
                  <div className="evidence-image">
                    {photoObjectUrls[photo.id] ? (
                      <img
                        src={photoObjectUrls[photo.id]}
                        alt={photo.caption}
                        loading="lazy"
                      />
                    ) : (
                      photo.category
                    )}
                  </div>
                  <div className="report-evidence-card-content">
                    <span>{photo.category} work</span>
                    <strong>{photo.caption}</strong>
                    <p>Uploaded {formatDate(photo.uploadedAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </article>

        <article className="report-document report-page">
          <section className="report-section report-section-first">
            <p className="report-label">Record details</p>
            <h3>Permanent proof record</h3>
            <div className="report-record-grid">
              <div>
                <span>Report number</span>
                <strong>{report.reportNumber}</strong>
              </div>
              <div>
                <span>Generated</span>
                <strong>{formatDate(report.generatedAt)}</strong>
              </div>
              <div>
                <span>Prepared by</span>
                <strong>{report.workspaceName}</strong>
              </div>
              <div>
                <span>Delivery status</span>
                <strong>{reportStatusLabel}</strong>
              </div>
            </div>
            <p className="report-record-note">
              This report is a saved snapshot generated from the documented work entry
              and attached field evidence.
            </p>
          </section>
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

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
