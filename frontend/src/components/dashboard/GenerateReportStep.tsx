import { useState, type CSSProperties } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api"
import type {
  OnboardingEvidenceItem,
  OnboardingFirstWorkEntry,
} from "@/lib/onboarding"

interface GenerateReportStepProps {
  workEntry: OnboardingFirstWorkEntry
  workspaceName: string
  onBackToDashboard: () => void
  onSaveWorkEntry: (summary: string) => Promise<void> | void
  onGenerateReport: (summary: string) => Promise<void> | void
  onReviewEvidence?: () => void
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not set"
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Not set"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Time not recorded"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Time not recorded"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatPhotoCount(count: number) {
  return `${count} photo${count === 1 ? "" : "s"}`
}

function countEvidenceByCategory(
  evidence: OnboardingEvidenceItem[],
  category: OnboardingEvidenceItem["category"],
) {
  return evidence.filter((item) => item.category === category).length
}

function getEvidenceByCategory(
  evidence: OnboardingEvidenceItem[],
  category: OnboardingEvidenceItem["category"],
) {
  return evidence.filter((item) => item.category === category)
}

function getShortAddress(value?: string | null) {
  return value?.split(",")[0]?.trim() || "No property address"
}

function getReportSourceTitle(workEntry: OnboardingFirstWorkEntry) {
  if (workEntry.jobTitle?.trim()) {
    return workEntry.jobTitle.trim()
  }

  const workType = workEntry.workType?.trim() || "Job"
  const address = getShortAddress(workEntry.propertyAddress)

  return `${workType} - ${address}`
}

function getCategoryLabel(category: OnboardingEvidenceItem["category"]) {
  if (category === "BEFORE") {
    return "Before Work"
  }

  if (category === "DURING") {
    return "During Work"
  }

  return "After Work"
}

const reportGenerationSteps = [
  "Saving job documentation",
  "Preparing evidence",
  "Creating report snapshot",
  "Rendering preview",
]

function getGenerateReportErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Your session expired. Sign in again, then generate the report."
    }

    if (error.status === 404) {
      return "This job was not found in the backend. Refresh the dashboard and try again."
    }

    return error.message
  }

  return "Report generation failed. Make sure the backend is running and try again."
}

export function GenerateReportStep({
  workEntry,
  workspaceName,
  onBackToDashboard,
  onSaveWorkEntry,
  onGenerateReport,
  onReviewEvidence,
}: GenerateReportStepProps) {
  const initialSummary = workEntry.workPerformedSummary ?? workEntry.description ?? ""
  const [summary, setSummary] = useState(initialSummary)
  const [lastSavedSummary, setLastSavedSummary] = useState(initialSummary.trim())
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false)
  const [selectedEvidence, setSelectedEvidence] =
    useState<OnboardingEvidenceItem | null>(null)
  const evidence = workEntry.evidence ?? []
  const beforeEvidence = getEvidenceByCategory(evidence, "BEFORE")
  const duringEvidence = getEvidenceByCategory(evidence, "DURING")
  const afterEvidence = getEvidenceByCategory(evidence, "AFTER")
  const beforeCount = countEvidenceByCategory(evidence, "BEFORE")
  const duringCount = countEvidenceByCategory(evidence, "DURING")
  const afterCount = countEvidenceByCategory(evidence, "AFTER")
  const totalEvidence = evidence.length
  const normalizedSummary = summary.trim()
  const hasWorkSummary =
    normalizedSummary.length > 0 && !/^(.)\1{4,}$/i.test(normalizedSummary)
  const hasUnsavedSummary = normalizedSummary !== lastSavedSummary
  const reportSourceTitle = getReportSourceTitle(workEntry)
  const shortAddress = getShortAddress(workEntry.propertyAddress)
  const customerName = workEntry.customerName?.trim()
  const missingCaptionCount = evidence.filter((item) => !item.caption.trim()).length
  const requiredEvidenceCaptioned = [...beforeEvidence, ...afterEvidence].every((item) =>
    item.caption.trim(),
  )
  const readyToGenerate = beforeCount > 0 && afterCount > 0 && hasWorkSummary
  const evidencePhases = [
    {
      category: "BEFORE" as const,
      title: "Before",
      items: beforeEvidence,
      emptyText: "No Before photos added.",
    },
    {
      category: "DURING" as const,
      title: "During",
      items: duringEvidence,
      emptyText: "No During photos added.",
    },
    {
      category: "AFTER" as const,
      title: "After",
      items: afterEvidence,
      emptyText: "No After photos added.",
    },
  ]
  const readinessItems = [
    {
      label: "Before photos",
      value: formatPhotoCount(beforeCount),
      complete: beforeCount > 0,
      optional: false,
    },
    {
      label: "After photos",
      value: formatPhotoCount(afterCount),
      complete: afterCount > 0,
      optional: false,
    },
    {
      label: "Work summary",
      value: hasWorkSummary ? "Complete" : "Missing",
      complete: hasWorkSummary,
      optional: false,
    },
    {
      label: "During photos",
      value: `${formatPhotoCount(duringCount)} added`,
      complete: duringCount > 0,
      optional: true,
    },
  ]
  const requiredReadinessItems = readinessItems.filter((item) => !item.optional)
  const missingRequiredReadinessItems = requiredReadinessItems.filter(
    (item) => !item.complete,
  )
  const readinessPercent = Math.round(
    (requiredReadinessItems.filter((item) => item.complete).length /
      requiredReadinessItems.length) *
      100,
  )
  const missingReadinessLabel =
    missingRequiredReadinessItems.length > 0
      ? `${missingRequiredReadinessItems.length} missing from: ${missingRequiredReadinessItems
          .map((item) => item.label)
          .join(", ")}`
      : "All required items complete"
  const readinessReviewItems = [
    {
      label: "Job details",
      detail: workEntry.jobTitle || shortAddress,
      complete: Boolean(workEntry.jobTitle || workEntry.propertyAddress),
    },
    {
      label: "Evidence",
      detail: `${formatPhotoCount(totalEvidence)} - Before ${beforeCount}, During ${duringCount}, After ${afterCount}`,
      complete: beforeCount > 0 && afterCount > 0,
    },
    {
      label: "Job snapshot",
      detail: "Ready to create",
      complete: true,
    },
    {
      label: "Work summary",
      detail: hasWorkSummary ? "Ready for report" : "Needed before generating",
      complete: hasWorkSummary,
    },
  ]
  const readinessReviewCompletedCount = readinessReviewItems.filter(
    (item) => item.complete,
  ).length
  const completedReadinessItems = readinessReviewItems.filter((item) => item.complete)
  const primaryReadinessBlocker = readinessReviewItems.find((item) => !item.complete)
  const readinessRingStyle = {
    "--readiness-progress": `${
      (readinessReviewCompletedCount / readinessReviewItems.length) * 360
    }deg`,
  } as CSSProperties
  const evidencePreviewItems = evidence.slice(0, 4)
  const reportIncludeItems = [
    {
      label: "Company branding",
      value: workspaceName,
      status: "complete",
    },
    {
      label: "Customer / property details",
      value: customerName ? `${customerName} - ${shortAddress}` : "Customer not added",
      status: customerName ? "complete" : "warning",
    },
    {
      label: "Work performed summary",
      value: hasWorkSummary ? "Included" : "Missing",
      status: hasWorkSummary ? "complete" : "missing",
    },
    {
      label: "Before photos",
      value: formatPhotoCount(beforeCount),
      status: beforeCount > 0 ? "complete" : "missing",
    },
    {
      label: "During photos",
      value: `${formatPhotoCount(duringCount)} optional`,
      status: "optional",
    },
    {
      label: "After photos",
      value: formatPhotoCount(afterCount),
      status: afterCount > 0 ? "complete" : "missing",
    },
    {
      label: "Photo captions",
      value:
        missingCaptionCount === 0
          ? "All photos captioned"
          : `${missingCaptionCount} missing`,
      status: missingCaptionCount === 0 ? "complete" : "warning",
    },
    {
      label: "Job date",
      value: formatDate(workEntry.workDate),
      status: workEntry.workDate ? "complete" : "warning",
    },
  ]
  const qualityItems = [
    {
      label: "Before and After coverage complete",
      status: beforeCount > 0 && afterCount > 0 ? "complete" : "missing",
    },
    {
      label: "Required photos have captions",
      status: requiredEvidenceCaptioned ? "complete" : "warning",
    },
    {
      label: "Work summary completed",
      status: hasWorkSummary ? "complete" : "missing",
    },
    {
      label: customerName ? "Customer name included" : "Customer name not added",
      status: customerName ? "complete" : "warning",
    },
  ]

  function validateSummary() {
    if (!hasWorkSummary) {
      setError("Add a work performed summary before generating a report.")
      setSaveMessage(null)
      return false
    }

    return true
  }

  function focusWorkSummary() {
    const field = document.getElementById("work-summary") as HTMLTextAreaElement | null

    field?.scrollIntoView({ behavior: "smooth", block: "center" })
    window.setTimeout(() => field?.focus({ preventScroll: true }), 260)
  }

  async function saveSummaryForReport() {
    if (!validateSummary()) {
      return false
    }

    if (!hasUnsavedSummary) {
      return true
    }

    setIsSaving(true)
    setError(null)
    setSaveMessage(null)

    try {
      await onSaveWorkEntry(normalizedSummary)
      setLastSavedSummary(normalizedSummary)
      setSaveMessage("Job summary saved.")
      return true
    } catch (saveError) {
      setError(getGenerateReportErrorMessage(saveError))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePreviewReport() {
    const saved = await saveSummaryForReport()

    if (!saved) {
      return
    }

    setError(null)
    setPreviewOpen(true)
  }

  function handleRequestGenerateReport() {
    if (!readyToGenerate || !validateSummary()) {
      return
    }

    setError(null)
    setConfirmGenerateOpen(true)
  }

  async function handleGenerateReport() {
    if (!validateSummary()) {
      return
    }

    setConfirmGenerateOpen(false)
    setIsGenerating(true)
    setError(null)
    setSaveMessage(null)

    try {
      await onGenerateReport(normalizedSummary)
      setLastSavedSummary(normalizedSummary)
    } catch (generateError) {
      setError(getGenerateReportErrorMessage(generateError))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="generate-report-page">
      <header className="create-entry-topbar">
        <button className="back-link-button" type="button" onClick={onBackToDashboard}>
          <ArrowLeft aria-hidden="true" size={18} />
          Back to dashboard
        </button>

        <span className="workspace-status-pill">{workspaceName}</span>
      </header>

      <section className="card generate-report-card">
        <div className="generate-report-workspace">
          <div className="generate-report-header">
            <div>
              <p className="eyebrow">Step 4 of 5</p>
              <h1>Generate your first proof report</h1>
              <p>
                Review the job summary and evidence before creating the customer
                report. FieldProof saves the current details, photos, and captions
                into a report snapshot.
              </p>
            </div>

            <div className="generate-report-icon" aria-hidden="true">
              <FileText size={32} />
            </div>
          </div>

          <section className="generate-report-source">
            <div className="generate-source-line">
              <span className="generate-source-chip">Job record</span>
              <div className="generate-source-copy">
                <strong>{reportSourceTitle}</strong>
                <span>
                  {shortAddress} - {formatDate(workEntry.workDate)} - {formatPhotoCount(totalEvidence)}
                  {customerName ? ` - ${customerName}` : ""}
                </span>
              </div>
            </div>

            <span className="generate-source-immutable">
              <ShieldCheck aria-hidden="true" size={13} />
              Saved snapshot
            </span>
          </section>

          <section className="generate-readiness-review" data-ready={readyToGenerate}>
            <div className="generate-readiness-card-header">
              <div>
                <p className="eyebrow">Report readiness</p>
                <h2>
                  Step {readinessReviewCompletedCount} of {readinessReviewItems.length} Complete
                </h2>
              </div>
              <div
                className="generate-readiness-ring"
                style={readinessRingStyle}
                aria-label={`${readinessReviewCompletedCount} of ${readinessReviewItems.length} readiness items complete`}
              >
                <span>
                  {readinessReviewCompletedCount}/{readinessReviewItems.length}
                </span>
              </div>
            </div>

            {primaryReadinessBlocker ? (
              <div className="generate-readiness-blocker-card">
                <div className="generate-readiness-blocker-title">
                  <span aria-hidden="true">
                    <AlertTriangle size={15} />
                  </span>
                  <h3>
                    {primaryReadinessBlocker.label === "Work summary"
                      ? "Work summary needed"
                      : `${primaryReadinessBlocker.label} needed`}
                  </h3>
                </div>
                <p>
                  Needed before generating. Add what your crew completed to
                  finalize the document.
                </p>
                <Button
                  className="generate-readiness-summary-button"
                  type="button"
                  variant="secondary"
                  onClick={
                    primaryReadinessBlocker.label === "Evidence" && onReviewEvidence
                      ? onReviewEvidence
                      : focusWorkSummary
                  }
                >
                  {primaryReadinessBlocker.label === "Evidence"
                    ? "Review evidence"
                    : "Add work summary"}
                </Button>
              </div>
            ) : (
              <div className="generate-readiness-blocker-card" data-ready="true">
                <div className="generate-readiness-blocker-title">
                  <span aria-hidden="true">
                    <CheckCircle2 size={15} />
                  </span>
                  <h3>Ready to generate</h3>
                </div>
                <p>
                  {formatPhotoCount(totalEvidence)} and your work summary will be
                  organized into the customer report.
                </p>
              </div>
            )}

            <div className="generate-readiness-completed">
              <p className="eyebrow">Completed tasks</p>
              <div>
                {completedReadinessItems.map((item) => (
                  <div key={item.label}>
                    <span aria-hidden="true" />
                    <strong>{item.label}</strong>
                    <em>{item.detail}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="generate-report-main-stack">
            <section className="generate-report-summary-editor">
              <div>
                <p className="eyebrow">Work performed</p>
                <Label htmlFor="work-summary">What did your crew complete? *</Label>
                <p className="generate-field-help">
                  Briefly describe what was inspected, repaired, replaced, or installed.
                </p>
              </div>
              <Textarea
                id="work-summary"
                value={summary}
                maxLength={2000}
                placeholder="Write a short summary for this job."
                onChange={(event) => {
                  setSummary(event.target.value)
                  setSaveMessage(null)

                  if (error === "Add a work performed summary before generating a report.") {
                    setError(null)
                  }
                }}
                disabled={isGenerating || isSaving}
              />
              <p className="generate-summary-example">
                Example: Replaced damaged shingles, repaired 3 sheets of decking,
                installed underlayment, and completed cleanup.
              </p>
              <div className="summary-prompt-row" aria-label="Helpful summary prompts">
                <span>Materials used</span>
                <span>Issues discovered</span>
                <span>Additional work</span>
              </div>
              <div className="field-footer-row">
                <p>
                  {isSaving
                    ? "Saving..."
                    : saveMessage
                      ? "Saved"
                      : hasUnsavedSummary
                        ? "Unsaved changes"
                        : "This summary appears in the customer-ready report."}
                </p>
                <span>{summary.length}/2000</span>
              </div>
              {saveMessage ? (
                <p className="form-success generate-report-save-message" role="status">
                  {saveMessage}
                </p>
              ) : null}
            </section>

            <section className="generate-report-evidence">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Report evidence</p>
                  <h3>Photos grouped by report section</h3>
                </div>
                <div className="generate-evidence-title-actions">
                  <span>{formatPhotoCount(totalEvidence)}</span>
                  {onReviewEvidence ? (
                    <Button type="button" variant="secondary" size="sm" onClick={onReviewEvidence}>
                      Review photos
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="generate-evidence-mobile-summary">
                <div>
                  <strong>{formatPhotoCount(totalEvidence)}</strong>
                  <span>
                    Before {beforeCount} - During {duringCount} - After {afterCount}
                  </span>
                </div>

                <div className="generate-evidence-thumb-row">
                  {evidencePreviewItems.length > 0 ? (
                    evidencePreviewItems.map((item) => (
                      <button
                        className="generate-evidence-thumb"
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedEvidence(item)}
                        aria-label={`Preview ${getCategoryLabel(item.category)} evidence`}
                      >
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="" />
                        ) : (
                          <Camera aria-hidden="true" size={16} />
                        )}
                        <span>{item.category.toLowerCase()}</span>
                      </button>
                    ))
                  ) : (
                    <p>No photos attached yet.</p>
                  )}
                </div>

                {onReviewEvidence ? (
                  <button
                    className="generate-evidence-review-link"
                    type="button"
                    onClick={onReviewEvidence}
                  >
                    Review evidence -&gt;
                  </button>
                ) : null}
              </div>

              <div className="generate-evidence-phases">
                {evidencePhases.map((phase) => (
                  <section className="generate-evidence-phase" key={phase.category}>
                    <div className="generate-evidence-phase-header">
                      <h4>
                        {phase.title} <span>{phase.items.length}</span>
                      </h4>
                    </div>

                    {phase.items.length > 0 ? (
                      <div className="generate-evidence-list">
                        {phase.items.map((item) => (
                          <button
                            className="generate-evidence-item"
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedEvidence(item)}
                          >
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt="" />
                            ) : (
                              <span className="generate-evidence-placeholder">
                                <Camera aria-hidden="true" size={17} />
                              </span>
                            )}
                            <div>
                              <strong>{item.caption || "No caption added"}</strong>
                              <p>
                                {getCategoryLabel(item.category)}
                                {item.fileName ? ` - ${item.fileName}` : ""}
                              </p>
                            </div>
                            <ExternalLink
                              aria-hidden="true"
                              className="generate-evidence-open-icon"
                              size={15}
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="generate-evidence-empty">{phase.emptyText}</p>
                    )}
                  </section>
                ))}
              </div>

              {isGenerating ? (
                <section className="generation-progress-panel" role="status" aria-live="polite">
                  <p className="eyebrow">Generating report</p>
                  <div className="generation-progress-list">
                    {reportGenerationSteps.map((step) => (
                      <div key={step}>
                        <CheckCircle2 aria-hidden="true" size={17} />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {error ? (
                <p className="form-error generate-report-error" role="alert">
                  {error}
                </p>
              ) : null}

              <section className="generate-mobile-report-include">
                <p className="eyebrow">Customer report</p>
                <h3>Will include</h3>
                <div>
                  <span>Job information</span>
                  <span>Work performed</span>
                  <span>Photo evidence</span>
                  <span>Dates and verification</span>
                </div>
              </section>

              <div className="generate-report-actions" data-ready={readyToGenerate}>
                {!readyToGenerate ? (
                  <p className="generate-mobile-action-warning">
                    <AlertTriangle aria-hidden="true" size={14} />
                    Work summary required
                  </p>
                ) : null}
                <Button
                  className="generate-report-cancel-button"
                  type="button"
                  variant="ghost"
                  onClick={onBackToDashboard}
                >
                  Cancel
                </Button>
                <Button
                  className="generate-report-preview-button"
                  type="button"
                  variant="secondary"
                  disabled={isGenerating || isSaving || !hasWorkSummary}
                  onClick={() => void handlePreviewReport()}
                >
                  <Eye aria-hidden="true" size={17} />
                  Preview report
                </Button>
                <Button
                  className="generate-report-generate-button"
                  type="button"
                  disabled={isGenerating || isSaving || !readyToGenerate}
                  onClick={handleRequestGenerateReport}
                >
                  {isGenerating ? "Generating report..." : "Generate report"}
                  <ArrowRight aria-hidden="true" size={17} />
                </Button>
              </div>
            </section>
          </div>
        </div>

        <aside className="generate-report-side-stack">
          <div className="report-sidebar-brand">
            <strong>FieldProof</strong>
            <span>Draft</span>
          </div>

          <section className="generate-report-readiness" data-ready={readyToGenerate}>
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Report readiness</p>
                <h3>{readyToGenerate ? "Ready to generate" : "Missing required items"}</h3>
                <p className="report-readiness-summary">{missingReadinessLabel}</p>
              </div>
              {readyToGenerate ? (
                <CheckCircle2 aria-hidden="true" size={22} />
              ) : (
                <AlertTriangle aria-hidden="true" size={22} />
              )}
            </div>

            <div className="report-sidebar-meter" aria-hidden="true">
              <span style={{ width: `${readinessPercent}%` }} />
            </div>

            <div className="report-readiness-list">
              {readinessItems.map((item) => (
                <div
                  data-complete={item.complete ? "true" : item.optional ? "optional" : "false"}
                  key={item.label}
                >
                  {item.complete ? (
                    <CheckCircle2 aria-hidden="true" size={18} />
                  ) : item.optional ? (
                    <ShieldCheck aria-hidden="true" size={18} />
                  ) : (
                    <Circle aria-hidden="true" size={18} />
                  )}
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="generate-report-include">
            <p className="eyebrow">Report will include</p>
            <div className="report-include-list">
              {reportIncludeItems.map((item) => (
                <div data-status={item.status} key={item.label}>
                  {item.status === "complete" ? (
                    <CheckCircle2 aria-hidden="true" size={16} />
                  ) : item.status === "warning" ? (
                    <AlertTriangle aria-hidden="true" size={16} />
                  ) : (
                    <Circle aria-hidden="true" size={16} />
                  )}
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="generate-report-quality">
            <p className="eyebrow">Documentation quality</p>
            <div className="documentation-quality-list">
              {qualityItems.map((item) => (
                <div data-status={item.status} key={item.label}>
                  {item.status === "complete" ? (
                    <CheckCircle2 aria-hidden="true" size={16} />
                  ) : (
                    <AlertTriangle aria-hidden="true" size={16} />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {previewOpen ? (
        <div className="report-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="draft-report-preview-title"
            aria-modal="true"
            className="report-dialog draft-report-preview-dialog"
            role="dialog"
          >
            <button
              aria-label="Close report preview"
              className="dialog-close-button"
              type="button"
              onClick={() => setPreviewOpen(false)}
            >
              <X aria-hidden="true" size={17} />
            </button>

            <div className="draft-report-paper">
              <header>
                <div>
                  <p>{workspaceName}</p>
                  <h2 id="draft-report-preview-title">{reportSourceTitle}</h2>
                  <span>
                    {customerName || "Customer not added"} - {formatDate(workEntry.workDate)}
                  </span>
                </div>
                <strong>DRAFT</strong>
              </header>

              <section>
                <h3>Work completed</h3>
                <p>{normalizedSummary}</p>
              </section>

              <section>
                <h3>Evidence</h3>
                <div className="draft-report-evidence-grid">
                  {evidencePhases.map((phase) => (
                    <div key={phase.category}>
                      <strong>
                        {phase.title} - {phase.items.length}
                      </strong>
                      {phase.items.slice(0, 2).map((item) => (
                        <p key={item.id}>{item.caption || "No caption added"}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="report-dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setPreviewOpen(false)}>
                Close preview
              </Button>
              <Button type="button" onClick={handleRequestGenerateReport}>
                Generate report
                <ArrowRight aria-hidden="true" size={17} />
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {confirmGenerateOpen ? (
        <div className="report-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="generate-confirm-title"
            aria-modal="true"
            className="report-dialog generate-confirm-dialog"
            role="dialog"
          >
            <button
              aria-label="Close generate confirmation"
              className="dialog-close-button"
              type="button"
              onClick={() => setConfirmGenerateOpen(false)}
            >
              <X aria-hidden="true" size={17} />
            </button>

            <FileText aria-hidden="true" className="generate-confirm-icon" size={34} />
            <h2 id="generate-confirm-title">Generate proof report?</h2>
            <p>
              FieldProof will create a saved report snapshot using the current job
              details, summary, photos, and captions.
            </p>
            <p>
              Later edits to the job record will not silently change this report. You
              can create an updated version afterward.
            </p>

            <div className="report-dialog-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmGenerateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={isGenerating} onClick={handleGenerateReport}>
                {isGenerating ? "Generating report..." : "Generate report"}
                <ArrowRight aria-hidden="true" size={17} />
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedEvidence ? (
        <div className="report-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="evidence-preview-title"
            aria-modal="true"
            className="report-dialog evidence-preview-dialog"
            role="dialog"
          >
            <button
              aria-label="Close photo preview"
              className="dialog-close-button"
              type="button"
              onClick={() => setSelectedEvidence(null)}
            >
              <X aria-hidden="true" size={17} />
            </button>

            <p className="eyebrow">{getCategoryLabel(selectedEvidence.category)}</p>
            <h2 id="evidence-preview-title">Photo caption check</h2>

            {selectedEvidence.previewUrl ? (
              <img
                className="evidence-preview-image"
                src={selectedEvidence.previewUrl}
                alt=""
              />
            ) : (
              <span className="evidence-preview-placeholder">
                <Camera aria-hidden="true" size={24} />
              </span>
            )}

            <div className="evidence-preview-details">
              <h3>{selectedEvidence.caption || "No caption added"}</h3>
              <p>
                {formatDateTime(selectedEvidence.createdAt)}
                {selectedEvidence.fileName ? ` - ${selectedEvidence.fileName}` : ""}
              </p>
            </div>

            {onReviewEvidence ? (
              <div className="report-dialog-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSelectedEvidence(null)
                    onReviewEvidence()
                  }}
                >
                  Review photos
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
