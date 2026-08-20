import {
  ArrowRight,
  ArrowDownUp,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  ListFilter,
  Mail,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { createReportShareLink } from "@/lib/api"
import { hasRequiredEvidence } from "@/lib/onboarding"
import type {
  OnboardingDashboardSnapshot,
  OnboardingFirstWorkEntry,
} from "@/lib/onboarding"
import {
  JOB_FILTER_ROUTES,
  REPORT_FILTER_ROUTES,
  getJobFilterFromSearch,
  getReportFilterFromSearch,
  type AppView,
  type ReportFilter,
} from "@/lib/navigation"
import type { PhotoCategory, ReportStatus, WorkEntry, WorkEntryPhoto } from "@/types/domain"

interface NavigationPagesProps {
  view: AppView
  userName: string
  authToken: string
  dashboard: OnboardingDashboardSnapshot
  dashboardLoadError: string | null
  routeSearch: string
  onNavigate: (view: AppView) => void
  onNavigatePath: (path: string, replace?: boolean) => void
  onOpenReport: (reportId: number) => void
  onReportStatusChange: (reportId: number, status: ReportStatus) => void
  onStartDashboardCommand: (
    command:
      | { action: "create-job" }
      | { action: "open-entry" | "add-evidence" | "generate-report"; entryId: number },
  ) => void
}

interface ReportRow {
  id: number
  reportNumber: string
  jobName: string
  jobAddress: string
  customerName: string
  customerEmail?: string | null
  workType: string
  workPerformed: string
  workStatus?: string
  status: ReportStatus
  generatedAt?: string
  reviewedAt?: string | null
  evidenceSummary: ReportEvidenceSummary
  evidenceItems: WorkEntryPhoto[]
  deliveryState: ReportDeliveryState
  deliveryLabel: string
  deliveryDetail: string
  deliveryTone: "needs-review" | "ready" | "sent" | "failed"
  nextActionLabel: string
  generatedTime: number
  versionLabel: string
}

interface ReportEvidenceSummary {
  total: number
  before: number
  during: number
  after: number
}

type ReportDeliveryState =
  | "needs-review"
  | "ready-to-send"
  | "sending"
  | "sent"
  | "delivery-failed"
type ReportsSortMode = "recent" | "oldest" | "report" | "customer"

interface ReportListSnapshot {
  workEntry?: {
    jobName?: string
    jobAddress?: string
    customerName?: string
    customerEmail?: string | null
    workType?: string
    workPerformedSummary?: string
    description?: string
    status?: string
  }
  photos?: Array<{
    id?: number
    category?: PhotoCategory
    caption?: string | null
    originalFilename?: string
    createdAt?: string
    area?: string | null
    locationLabel?: string | null
    locationVerified?: boolean | null
    capturedBy?: string | null
  }>
}

interface ReportPreviewEvidenceItem {
  stage: PhotoCategory
  shortLabel: string
  title: string
  emptyCopy: string
  photo?: WorkEntryPhoto
}

const reportPhotoStageOrder: Record<PhotoCategory, number> = {
  BEFORE: 0,
  DURING: 1,
  AFTER: 2,
}

const reportPreviewEvidenceLabels: Record<
  PhotoCategory,
  Omit<ReportPreviewEvidenceItem, "stage" | "photo">
> = {
  BEFORE: {
    shortLabel: "Before",
    title: "Pre-work condition",
    emptyCopy: "No pre-work photo captured.",
  },
  DURING: {
    shortLabel: "During",
    title: "Work performed",
    emptyCopy: "No work-in-progress photo captured.",
  },
  AFTER: {
    shortLabel: "After",
    title: "Final condition",
    emptyCopy: "No final-condition photo captured.",
  },
}

function getDashboardEntries(dashboard: OnboardingDashboardSnapshot) {
  if (dashboard.workEntries?.length) {
    return dashboard.workEntries
  }

  return dashboard.firstWorkEntry ? [dashboard.firstWorkEntry] : []
}

function parseLocalDate(value?: string | null) {
  if (!value) {
    return null
  }

  const dateOnly = value.split("T")[0]
  const [year, month, day] = dateOnly.split("-").map(Number)

  if (!year || !month || !day) {
    return new Date(value)
  }

  return new Date(year, month - 1, day)
}

function formatShortDate(value?: string | null) {
  const date = parseLocalDate(value)

  if (!date || Number.isNaN(date.getTime())) {
    return "No date"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatShortTime(value?: string | null) {
  if (!value) {
    return "No time"
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function pluralizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function buildOperationalEntries(entries: OnboardingFirstWorkEntry[]): WorkEntry[] {
  return entries.map((entry) => {
    const proofReady = hasRequiredEvidence(entry)
    const report = entry.report
    const photoCount = entry.evidence?.length ?? 0
    const thumbnailEvidence = entry.evidence?.find((item) =>
      Boolean(item.previewUrl || item.contentUrl),
    )

    return {
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      jobName: entry.jobTitle ?? "Untitled job",
      jobAddress: entry.propertyAddress ?? "No property address added",
      customerName: entry.customerName ?? "Customer not recorded",
      customerPhone: entry.customerPhone,
      customerEmail: entry.customerEmail,
      customerContactName: entry.customerContactName,
      workType: entry.workType ?? "General work",
      workDate: entry.workDate ?? new Date().toISOString(),
      scheduledStartTime: entry.scheduledStartTime,
      arrivalWindow: entry.arrivalWindow,
      estimatedDuration: entry.estimatedDuration,
      assignedCrew: entry.assignedCrew,
      status: entry.status ?? (report ? "COMPLETED" : "DRAFT"),
      workPerformed: entry.workPerformedSummary ?? entry.description ?? "",
      plannedScope: entry.plannedScope,
      proofReady,
      reportId: report?.id,
      reportNumber: report?.reportNumber,
      reportStatus: report?.status,
      thumbnailUrl: thumbnailEvidence?.previewUrl,
      thumbnailContentUrl: thumbnailEvidence?.contentUrl,
      updatedLabel: formatShortDate(
        entry.updatedAt ?? report?.generatedAt ?? entry.createdAt ?? entry.workDate,
      ),
      photoCount,
      photos: (entry.evidence ?? []).map((item) => ({
        id: item.id,
        category: item.category,
        caption: item.caption,
        uploadedAt: item.createdAt,
        previewUrl: item.previewUrl,
        contentUrl: item.contentUrl,
      })),
    }
  })
}

function parseReportListSnapshot(snapshotJson?: string): ReportListSnapshot | null {
  if (!snapshotJson) {
    return null
  }

  try {
    return JSON.parse(snapshotJson) as ReportListSnapshot
  } catch {
    return null
  }
}

function isPhotoCategory(value: unknown): value is PhotoCategory {
  return value === "BEFORE" || value === "DURING" || value === "AFTER"
}

function getReportEvidenceCategories(
  entry: OnboardingFirstWorkEntry,
  snapshot: ReportListSnapshot | null,
) {
  const snapshotCategories = (snapshot?.photos ?? [])
    .map((photo) => photo.category)
    .filter(isPhotoCategory)

  if (snapshotCategories.length > 0) {
    return snapshotCategories
  }

  return (entry.evidence ?? []).map((photo) => photo.category)
}

function getReportEvidenceItems(
  entry: OnboardingFirstWorkEntry,
  snapshot: ReportListSnapshot | null,
  reportId: number,
): WorkEntryPhoto[] {
  const snapshotItems = (snapshot?.photos ?? []).flatMap((photo) => {
    if (typeof photo.id !== "number" || !photo.category) {
      return []
    }

    return [{
      id: photo.id,
      category: photo.category,
      caption: photo.caption ?? photo.originalFilename ?? `${photo.category} evidence`,
      uploadedAt: photo.createdAt ?? entry.report?.generatedAt ?? new Date().toISOString(),
      area: photo.area,
      locationLabel: photo.locationLabel,
      locationVerified: photo.locationVerified,
      capturedBy: photo.capturedBy,
      contentUrl: `/api/reports/${reportId}/photos/${photo.id}/content`,
    }]
  })

  if (snapshotItems.length > 0) {
    return snapshotItems
  }

  return (entry.evidence ?? []).map((photo) => ({
    id: photo.id,
    category: photo.category,
    caption: photo.caption,
    uploadedAt: photo.createdAt,
    previewUrl: photo.previewUrl,
    contentUrl: photo.contentUrl,
  }))
}

function getReportPreviewEvidenceItems(
  photos: WorkEntryPhoto[],
): ReportPreviewEvidenceItem[] {
  const photosByStage = [...photos]
    .sort((firstPhoto, secondPhoto) => {
      const stageSort =
        reportPhotoStageOrder[firstPhoto.category] - reportPhotoStageOrder[secondPhoto.category]

      if (stageSort !== 0) {
        return stageSort
      }

      return new Date(firstPhoto.uploadedAt).getTime() - new Date(secondPhoto.uploadedAt).getTime()
    })
    .reduce<Record<PhotoCategory, WorkEntryPhoto[]>>(
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

  return (["BEFORE", "DURING", "AFTER"] as const).map((stage) => ({
    stage,
    photo: photosByStage[stage][0],
    ...reportPreviewEvidenceLabels[stage],
  }))
}

function getReportPreviewCaption(photo: WorkEntryPhoto | undefined, fallback: string) {
  const caption = photo?.caption.trim()

  return caption || fallback
}

function buildReportEvidenceSummary(categories: PhotoCategory[]): ReportEvidenceSummary {
  return categories.reduce<ReportEvidenceSummary>(
    (summary, category) => {
      if (category === "BEFORE") {
        summary.before += 1
      }

      if (category === "DURING") {
        summary.during += 1
      }

      if (category === "AFTER") {
        summary.after += 1
      }

      summary.total += 1
      return summary
    },
    {
      total: 0,
      before: 0,
      during: 0,
      after: 0,
    },
  )
}

function getReportDeliveryState(
  report: NonNullable<OnboardingFirstWorkEntry["report"]>,
): ReportDeliveryState {
  if (report.status === "SHARED") {
    return "sent"
  }

  return report.reviewedAt ? "ready-to-send" : "needs-review"
}

function getReportDeliveryLabel(deliveryState: ReportDeliveryState) {
  if (deliveryState === "delivery-failed") {
    return "Delivery failed"
  }

  if (deliveryState === "sent") {
    return "Sent"
  }

  if (deliveryState === "sending") {
    return "Sending"
  }

  if (deliveryState === "ready-to-send") {
    return "Ready to send"
  }

  return "Needs review"
}

function getReportDeliveryDetail(deliveryState: ReportDeliveryState) {
  if (deliveryState === "delivery-failed") {
    return "Customer delivery needs attention"
  }

  if (deliveryState === "sent") {
    return "Delivery record preserved"
  }

  if (deliveryState === "sending") {
    return "Delivery in progress"
  }

  if (deliveryState === "ready-to-send") {
    return "Proof requirements complete"
  }

  return "Generated and waiting for approval"
}

function getReportDeliveryTone(deliveryState: ReportDeliveryState): ReportRow["deliveryTone"] {
  if (deliveryState === "delivery-failed") {
    return "failed"
  }

  if (deliveryState === "sent") {
    return "sent"
  }

  if (deliveryState === "ready-to-send") {
    return "ready"
  }

  return "needs-review"
}

function getReportNextActionLabel(deliveryState: ReportDeliveryState) {
  if (deliveryState === "delivery-failed") {
    return "Try again"
  }

  if (deliveryState === "sent") {
    return "View sent report"
  }

  if (deliveryState === "sending") {
    return "Sending"
  }

  if (deliveryState === "ready-to-send") {
    return "Review & send"
  }

  return "Review report"
}

function getReportReadinessItems(report: Pick<
  ReportRow,
  "evidenceSummary" | "workPerformed" | "workStatus"
>) {
  return [
    {
      label: "Pre-work condition documented",
      complete: report.evidenceSummary.before > 0,
    },
    {
      label: "Work performed documented",
      complete: Boolean(report.workPerformed),
    },
    {
      label: "After condition documented",
      complete: report.evidenceSummary.after > 0,
    },
    {
      label: "Completion confirmed",
      complete: report.workStatus === "COMPLETED",
    },
  ]
}

function getReportReadinessCompleteCount(report: Pick<
  ReportRow,
  "evidenceSummary" | "workPerformed" | "workStatus"
>) {
  return getReportReadinessItems(report).filter((item) => item.complete).length
}

function getReportRows(entries: OnboardingFirstWorkEntry[]): ReportRow[] {
  return entries
    .flatMap((entry) => {
      if (!entry.report?.id) {
        return []
      }

      const report = entry.report
      const snapshot = parseReportListSnapshot(report.snapshotJson)
      const evidenceItems = getReportEvidenceItems(entry, snapshot, report.id)
      const evidenceSummary = buildReportEvidenceSummary(
        evidenceItems.length > 0
          ? evidenceItems.map((item) => item.category)
          : getReportEvidenceCategories(entry, snapshot),
      )
      const deliveryState = getReportDeliveryState(report)
      const jobAddress =
        snapshot?.workEntry?.jobAddress
        ?? entry.propertyAddress
        ?? "No property address added"
      const jobName =
        normalizeOptionText(snapshot?.workEntry?.jobName ?? entry.jobTitle ?? "")
        || entry.workType
        || "Untitled job"
      const workPerformed =
        normalizeOptionText(
          snapshot?.workEntry?.workPerformedSummary
            ?? snapshot?.workEntry?.description
            ?? entry.workPerformedSummary
            ?? entry.description
            ?? "",
        )

      return [{
        id: report.id,
        reportNumber: report.reportNumber ?? `Report ${report.id}`,
        jobName,
        jobAddress: formatAddressLabel(jobAddress),
        customerName: formatDisplayName(
          snapshot?.workEntry?.customerName ?? entry.customerName ?? "",
        ),
        customerEmail: snapshot?.workEntry?.customerEmail ?? entry.customerEmail ?? null,
        workType:
          normalizeOptionText(snapshot?.workEntry?.workType ?? entry.workType ?? "")
          || "General work",
        workPerformed,
        workStatus: snapshot?.workEntry?.status ?? entry.status,
        status: report.status ?? "GENERATED",
        generatedAt: report.generatedAt,
        reviewedAt: report.reviewedAt,
        evidenceSummary,
        evidenceItems,
        deliveryState,
        deliveryLabel: getReportDeliveryLabel(deliveryState),
        deliveryDetail: getReportDeliveryDetail(deliveryState),
        deliveryTone: getReportDeliveryTone(deliveryState),
        nextActionLabel: getReportNextActionLabel(deliveryState),
        generatedTime: getTimestamp(report.generatedAt),
        versionLabel: "v1",
      }]
    })
    .sort((firstReport, secondReport) =>
      secondReport.generatedTime - firstReport.generatedTime,
    )
}

function filterReportRows(rows: ReportRow[], filter: ReportFilter) {
  if (filter === "ready") {
    return rows.filter((row) => row.deliveryState === "ready-to-send")
  }

  if (filter === "needs-review") {
    return rows.filter((row) => row.deliveryState === "needs-review")
  }

  if (filter === "sent") {
    return rows.filter((row) => row.deliveryState === "sent")
  }

  return rows
}

function getReportFilterCount(rows: ReportRow[], filter: ReportFilter) {
  return filterReportRows(rows, filter).length
}

function matchesReportSearch(row: ReportRow, searchTerm: string) {
  if (!searchTerm) {
    return true
  }

  return [
    row.reportNumber,
    row.jobName,
    row.jobAddress,
    row.customerName,
    row.workType,
    row.deliveryLabel,
  ].some((value) => value.toLowerCase().includes(searchTerm))
}

function sortReportRows(rows: ReportRow[], sortMode: ReportsSortMode) {
  return [...rows].sort((firstRow, secondRow) => {
    if (sortMode === "oldest") {
      return firstRow.generatedTime - secondRow.generatedTime
    }

    if (sortMode === "report") {
      return firstRow.reportNumber.localeCompare(secondRow.reportNumber)
    }

    if (sortMode === "customer") {
      return firstRow.customerName.localeCompare(secondRow.customerName)
    }

    return secondRow.generatedTime - firstRow.generatedTime
  })
}

function getReportsFooterLabel(
  visibleCount: number,
  startIndex: number,
  endIndex: number,
) {
  if (visibleCount === 0) {
    return "Showing 0 reports"
  }

  return `Showing ${startIndex}-${endIndex} of ${pluralizeCount(visibleCount, "report")}`
}

function filterEntries(
  entries: OnboardingFirstWorkEntry[],
  filter: string | null,
) {
  if (filter === "open") {
    return entries.filter((entry) =>
      entry.status !== "COMPLETED" && entry.status !== "ARCHIVED",
    )
  }

  if (filter === "completed") {
    return entries.filter((entry) => entry.status === "COMPLETED")
  }

  if (filter === "archived") {
    return entries.filter((entry) => entry.status === "ARCHIVED")
  }

  return entries.filter((entry) => entry.status !== "ARCHIVED")
}

function getWorkspaceName(dashboard: OnboardingDashboardSnapshot) {
  return dashboard.workspace?.name ?? "No workspace selected"
}

function NavigationMetric({
  label,
  value,
  detail,
}: {
  label: string
  value: number | string
  detail: string
}) {
  return (
    <article className="navigation-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

function NavigationHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow?: string
  title: string
  copy: string
  action?: ReactNode
}) {
  return (
    <header className="page-header navigation-page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        <p className="page-copy operational-page-copy">{copy}</p>
      </div>
      {action ? <div className="dashboard-controls">{action}</div> : null}
    </header>
  )
}

const JOB_PAGE_FILTERS: Array<{
  label: string
  status: string | null
  href: string
}> = [
  { label: "All", status: null, href: JOB_FILTER_ROUTES.All },
  { label: "Open", status: "open", href: JOB_FILTER_ROUTES.Open },
  { label: "Completed", status: "completed", href: JOB_FILTER_ROUTES.Completed },
  { label: "Archived", status: "archived", href: JOB_FILTER_ROUTES.Archived },
]

type JobsSortMode = "recent" | "oldest" | "job" | "customer"
type JobsWorkflowState = "needs-photos" | "ready-for-report" | "ready-to-send"
type JobsDateFilter = "all" | "today" | "last-7" | "last-30" | "custom"

interface JobsDateRange {
  start: string
  end: string
}

const emptyJobsDateRange: JobsDateRange = {
  start: "",
  end: "",
}

interface JobsPageRow {
  id: number
  title: string
  address: string
  customer: string
  photoLabel: string
  thumbnailUrl?: string
  thumbnailContentUrl?: string
  workType: string
  crewNames: string[]
  workDate?: string | null
  reportId?: number
  reportNumber?: string
  lifecycleLabel: string
  lifecycleTone: "open" | "complete" | "ready" | "archived"
  progressDetail: string
  workflowStates: JobsWorkflowState[]
  nextActionLabel: string
  nextActionKind: "add-photos" | "generate-report" | "review-send" | "view-report"
  lastActiveLabel: string
  lastActiveTime: number
}

function getPhotoLabel(photoCount: number) {
  return `${photoCount} photo${photoCount === 1 ? "" : "s"}`
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function normalizeOptionText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function formatNamePart(value: string) {
  const withoutTrailingPeriods = value.replace(/\.+$/, "")

  if (/^[a-z]$/i.test(withoutTrailingPeriods)) {
    return `${withoutTrailingPeriods.toUpperCase()}.`
  }

  if (withoutTrailingPeriods === withoutTrailingPeriods.toLowerCase()
    || withoutTrailingPeriods === withoutTrailingPeriods.toUpperCase()) {
    return `${withoutTrailingPeriods[0]?.toUpperCase() ?? ""}${withoutTrailingPeriods.slice(1).toLowerCase()}`
  }

  return value
}

function formatDisplayName(value: string) {
  const normalizedValue = normalizeOptionText(value)

  if (!normalizedValue) {
    return "Customer not recorded"
  }

  return normalizedValue
    .split(" ")
    .map((part) => part
      .split("-")
      .map(formatNamePart)
      .join("-"),
    )
    .join(" ")
}

function getAddressWordLabel(word: string) {
  const normalizedWord = word.toLowerCase()
  const streetSuffixes: Record<string, string> = {
    apartment: "Apt",
    apt: "Apt",
    avenue: "Ave",
    ave: "Ave",
    boulevard: "Blvd",
    blvd: "Blvd",
    circle: "Cir",
    cir: "Cir",
    court: "Ct",
    ct: "Ct",
    drive: "Dr",
    dr: "Dr",
    highway: "Hwy",
    hwy: "Hwy",
    lane: "Ln",
    ln: "Ln",
    parkway: "Pkwy",
    pkwy: "Pkwy",
    place: "Pl",
    pl: "Pl",
    road: "Rd",
    rd: "Rd",
    street: "St",
    st: "St",
    suite: "Ste",
    ste: "Ste",
    terrace: "Ter",
    ter: "Ter",
    trail: "Trl",
    trl: "Trl",
    unit: "Unit",
    way: "Way",
  }

  if (/^\d+(st|nd|rd|th)$/i.test(word)) {
    return word.toLowerCase()
  }

  if (/^(n|s|e|w|ne|nw|se|sw)$/i.test(word)) {
    return normalizedWord.toUpperCase()
  }

  if (streetSuffixes[normalizedWord]) {
    return streetSuffixes[normalizedWord]
  }

  return `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`
}

function formatAddressLabel(value: string) {
  return value
    .split(/(\s+|,)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === ",") {
        return part
      }

      return part
        .split("-")
        .map((word) => getAddressWordLabel(word))
        .join("-")
    })
    .join("")
}

function getDisplayJobTitle(entry: WorkEntry, address: string) {
  const title = normalizeOptionText(entry.jobName)

  if (!title) {
    return entry.workType || "Untitled job"
  }

  const normalizedAddress = normalizeOptionText(address).toLowerCase()
  const rawAddress = normalizeOptionText(entry.jobAddress).toLowerCase()
  const titleSegments = title
    .split(/\s+-\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  const nonAddressSegments = titleSegments.filter((segment) => {
    const normalizedSegment = segment.toLowerCase()

    return normalizedSegment !== normalizedAddress
      && normalizedSegment !== rawAddress
      && !normalizedSegment.includes(normalizedAddress)
      && !normalizedSegment.includes(rawAddress)
  })

  if (titleSegments.length > 1 && nonAddressSegments.length > 0) {
    return nonAddressSegments.join(" - ")
  }

  return title
}

function splitAssignedCrew(value?: string | null) {
  return (value ?? "")
    .split(/[,;/]+/)
    .map((name) => normalizeOptionText(name))
    .filter(Boolean)
}

function getProofLabel(entry: WorkEntry) {
  const hasBeforePhoto = entry.photos.some((photo) => photo.category === "BEFORE")
  const hasAfterPhoto = entry.photos.some((photo) => photo.category === "AFTER")

  if (entry.reportId) {
    return entry.reportStatus === "SHARED" ? "Report sent" : "Report generated"
  }

  if (hasBeforePhoto && hasAfterPhoto) {
    return "Before & after photos attached"
  }

  if (!hasBeforePhoto && !hasAfterPhoto) {
    return "Needs before & after photos"
  }

  if (!hasBeforePhoto) {
    return "Needs before photo"
  }

  return "Needs after photo"
}

function getWorkflowStates(entry: WorkEntry): JobsPageRow["workflowStates"] {
  if (entry.status === "ARCHIVED") {
    return []
  }

  if (entry.reportId) {
    return entry.reportStatus === "SHARED" ? [] : ["ready-to-send"]
  }

  if (entry.proofReady) {
    return ["ready-for-report"]
  }

  return ["needs-photos"]
}

function getProgressDetail(entry: WorkEntry) {
  if (entry.status === "ARCHIVED") {
    return "Hidden from everyday job views"
  }

  if (!entry.reportId && entry.proofReady) {
    return "Documentation complete"
  }

  return getProofLabel(entry)
}

function getNextActionLabel(entry: WorkEntry) {
  if (entry.reportId) {
    return entry.reportStatus === "SHARED" ? "View report" : "Review & send"
  }

  if (entry.proofReady) {
    return "Generate report"
  }

  return "Add photos"
}

function getNextActionKind(entry: WorkEntry): JobsPageRow["nextActionKind"] {
  if (entry.reportId) {
    return entry.reportStatus === "SHARED" ? "view-report" : "review-send"
  }

  if (entry.proofReady) {
    return "generate-report"
  }

  return "add-photos"
}

function getLifecycleLabel(entry: WorkEntry) {
  if (entry.status === "ARCHIVED") {
    return "Archived"
  }

  if (entry.reportId || entry.status === "COMPLETED") {
    return "Completed"
  }

  if (entry.proofReady) {
    return "Ready for report"
  }

  return "In progress"
}

function getLifecycleTone(entry: WorkEntry): JobsPageRow["lifecycleTone"] {
  if (entry.status === "ARCHIVED") {
    return "archived"
  }

  if (entry.reportId || entry.status === "COMPLETED") {
    return "complete"
  }

  if (entry.proofReady) {
    return "ready"
  }

  return "open"
}

function getTimestamp(value?: string | null) {
  const date = value?.includes("T") ? new Date(value) : parseLocalDate(value)

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0
}

function buildJobsPageRow(entry: WorkEntry): JobsPageRow {
  const address = formatAddressLabel(entry.jobAddress)
  const lastActiveValue = entry.updatedAt ?? entry.createdAt

  return {
    id: entry.id,
    title: getDisplayJobTitle(entry, address),
    address,
    customer: formatDisplayName(entry.customerName),
    photoLabel: getPhotoLabel(entry.photoCount),
    thumbnailUrl: entry.thumbnailUrl,
    thumbnailContentUrl: entry.thumbnailContentUrl,
    workType: normalizeOptionText(entry.workType),
    crewNames: splitAssignedCrew(entry.assignedCrew),
    workDate: entry.workDate,
    reportId: entry.reportId,
    reportNumber: entry.reportNumber,
    lifecycleLabel: getLifecycleLabel(entry),
    lifecycleTone: getLifecycleTone(entry),
    progressDetail: getProgressDetail(entry),
    workflowStates: getWorkflowStates(entry),
    nextActionLabel: getNextActionLabel(entry),
    nextActionKind: getNextActionKind(entry),
    lastActiveLabel: formatShortDate(lastActiveValue),
    lastActiveTime: getTimestamp(lastActiveValue),
  }
}

function getJobsEmptyState({
  filter,
  hasAnyJobs,
  hasWorkspace,
}: {
  filter: string | null
  hasAnyJobs: boolean
  hasWorkspace: boolean
}) {
  if (!hasWorkspace) {
    return {
      title: "No workspace selected",
      copy: "Create or select a workspace before adding job records.",
      actionLabel: null,
    }
  }

  if (!hasAnyJobs) {
    return {
      title: "No jobs yet",
      copy: "Create your first job when field work is ready to document.",
      actionLabel: "Create your first job",
    }
  }

  if (filter === "archived") {
    return {
      title: "No archived jobs",
      copy: "Archived jobs will appear here after old, test, or canceled records move out of active views.",
      actionLabel: null,
    }
  }

  return {
    title: "No jobs match this view",
    copy: "Use another Jobs filter or return to the dashboard to continue open work.",
    actionLabel: null,
  }
}

function getJobsFilterCount(entries: OnboardingFirstWorkEntry[], filter: string | null) {
  return filterEntries(entries, filter).length
}

function getLifecycleNoun(filter: string | null) {
  if (filter === "open") {
    return "open job"
  }

  if (filter === "completed") {
    return "completed job"
  }

  if (filter === "archived") {
    return "archived job"
  }

  return "job"
}

function getJobsHeaderCopy({
  filter,
  filteredCount,
  hasWorkspace,
  totalCount,
  workspaceName,
}: {
  filter: string | null
  filteredCount: number
  hasWorkspace: boolean
  totalCount: number
  workspaceName: string
}) {
  if (!hasWorkspace) {
    return "Create a workspace before adding jobs."
  }

  if (filter) {
    return `${pluralizeCount(filteredCount, getLifecycleNoun(filter))} - ${pluralizeCount(totalCount, "active job")}`
  }

  return `${pluralizeCount(totalCount, "job")} in ${workspaceName}.`
}

function getJobsFooterLabel(
  visibleCount: number,
  startIndex: number,
  endIndex: number,
  filter: string | null,
) {
  const noun = getLifecycleNoun(filter)

  if (visibleCount === 0) {
    return `Showing 0 ${noun}s`
  }

  return `Showing ${startIndex}-${endIndex} of ${pluralizeCount(visibleCount, noun)}`
}

function getUniqueOptions(values: string[]) {
  return Array.from(new Set(values.map(normalizeOptionText).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second))
}

function matchesRecentDateFilter(workDate: string, days: number) {
  const today = parseLocalDate(getLocalDateKey())
  const rowDate = parseLocalDate(workDate)

  if (!today || !rowDate) {
    return false
  }

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (days - 1))

  return rowDate >= startDate && rowDate <= today
}

function matchesCustomDateFilter(workDate: string, customDateRange: JobsDateRange) {
  const { start, end } = customDateRange

  if (!start && !end) {
    return true
  }

  if (start && workDate < start) {
    return false
  }

  if (end && workDate > end) {
    return false
  }

  return true
}

function matchesDateFilter(
  row: JobsPageRow,
  dateFilter: JobsDateFilter,
  customDateRange: JobsDateRange,
) {
  if (dateFilter === "all") {
    return true
  }

  const workDate = row.workDate?.split("T")[0]

  if (!workDate) {
    return false
  }

  const todayKey = getLocalDateKey()

  if (dateFilter === "today") {
    return workDate === todayKey
  }

  if (dateFilter === "last-7") {
    return matchesRecentDateFilter(workDate, 7)
  }

  if (dateFilter === "last-30") {
    return matchesRecentDateFilter(workDate, 30)
  }

  return matchesCustomDateFilter(workDate, customDateRange)
}

function getWorkflowFilterLabel(workflowFilter: JobsWorkflowState) {
  if (workflowFilter === "needs-photos") {
    return "Needs photos"
  }

  if (workflowFilter === "ready-for-report") {
    return "Ready for report"
  }

  return "Ready to send"
}

function getDateFilterLabel(dateFilter: JobsDateFilter, customDateRange = emptyJobsDateRange) {
  if (dateFilter === "today") {
    return "Today"
  }

  if (dateFilter === "last-7") {
    return "Last 7 days"
  }

  if (dateFilter === "last-30") {
    return "Last 30 days"
  }

  if (dateFilter === "custom") {
    if (customDateRange.start && customDateRange.end) {
      return `${formatShortDate(customDateRange.start)} - ${formatShortDate(customDateRange.end)}`
    }

    if (customDateRange.start) {
      return `From ${formatShortDate(customDateRange.start)}`
    }

    if (customDateRange.end) {
      return `Through ${formatShortDate(customDateRange.end)}`
    }

    return "Custom date"
  }

  return "Any time"
}

function sortJobRows(rows: JobsPageRow[], sortMode: JobsSortMode) {
  return [...rows].sort((firstRow, secondRow) => {
    if (sortMode === "oldest") {
      return firstRow.lastActiveTime - secondRow.lastActiveTime
    }

    if (sortMode === "job") {
      return firstRow.title.localeCompare(secondRow.title)
    }

    if (sortMode === "customer") {
      return firstRow.customer.localeCompare(secondRow.customer)
    }

    return secondRow.lastActiveTime - firstRow.lastActiveTime
  })
}

function JobsRecordThumbnail({
  authToken,
  row,
}: {
  authToken: string
  row: JobsPageRow
}) {
  const [fetchedThumbnailUrl, setFetchedThumbnailUrl] = useState<string | null>(null)

  useEffect(() => {
    setFetchedThumbnailUrl(null)

    if (row.thumbnailUrl || !row.thumbnailContentUrl) {
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null
    let isCurrent = true

    async function loadThumbnail() {
      try {
        const headers = new Headers()
        headers.set("Authorization", `Bearer ${authToken}`)

        const response = await fetch(row.thumbnailContentUrl as string, {
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
  }, [authToken, row.thumbnailContentUrl, row.thumbnailUrl])

  const thumbnailUrl = row.thumbnailUrl ?? fetchedThumbnailUrl

  return (
    <div className="jobs-record-thumbnail" aria-hidden="true">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" />
      ) : (
        <Camera aria-hidden="true" size={15} />
      )}
    </div>
  )
}

function JobsPage({
  dashboard,
  dashboardLoadError,
  authToken,
  routeSearch,
  onOpenReport,
  onStartDashboardCommand,
}: NavigationPagesProps) {
  const entries = getDashboardEntries(dashboard)
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [workflowFilters, setWorkflowFilters] = useState<JobsWorkflowState[]>([])
  const [jobTypeFilter, setJobTypeFilter] = useState("all")
  const [crewFilter, setCrewFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState<JobsDateFilter>("all")
  const [customDateRange, setCustomDateRange] =
    useState<JobsDateRange>({ ...emptyJobsDateRange })
  const [draftWorkflowFilters, setDraftWorkflowFilters] = useState<JobsWorkflowState[]>([])
  const [draftJobTypeFilter, setDraftJobTypeFilter] = useState("all")
  const [draftCrewFilter, setDraftCrewFilter] = useState("all")
  const [draftDateFilter, setDraftDateFilter] = useState<JobsDateFilter>("all")
  const [draftCustomDateRange, setDraftCustomDateRange] =
    useState<JobsDateRange>({ ...emptyJobsDateRange })
  const [sortMode, setSortMode] = useState<JobsSortMode>("recent")
  const [page, setPage] = useState(1)
  const filter = getJobFilterFromSearch(routeSearch)
  const filteredEntries = filterEntries(entries, filter)
  const operationalEntries = buildOperationalEntries(filteredEntries)
  const jobRows = operationalEntries.map(buildJobsPageRow)
  const searchTerm = searchQuery.trim().toLowerCase()
  const jobTypeOptions = useMemo(
    () => getUniqueOptions(jobRows.map((row) => row.workType)),
    [jobRows],
  )
  const crewOptions = useMemo(
    () => getUniqueOptions(jobRows.flatMap((row) => row.crewNames)),
    [jobRows],
  )
  const activeAdvancedFilterCount = [
    workflowFilters.length > 0,
    jobTypeFilter !== "all",
    crewFilter !== "all",
    dateFilter !== "all",
  ].filter(Boolean).length
  const visibleJobRows = sortJobRows(
    jobRows.filter((row) => {
      const matchesSearch = searchTerm
        ? [
            row.title,
            row.address,
            row.customer,
            row.workType,
            row.crewNames.join(" "),
            row.reportNumber ?? "",
          ].some((value) => value.toLowerCase().includes(searchTerm))
        : true
      const matchesWorkflow =
        workflowFilters.length === 0
        || workflowFilters.some((workflowFilter) =>
          row.workflowStates.includes(workflowFilter),
        )
      const matchesType =
        jobTypeFilter === "all" || row.workType === jobTypeFilter
      const matchesCrew =
        crewFilter === "all" || row.crewNames.includes(crewFilter)

      return matchesSearch
        && matchesWorkflow
        && matchesType
        && matchesCrew
        && matchesDateFilter(row, dateFilter, customDateRange)
    }),
    sortMode,
  )
  const pageSize = 25
  const totalPages = Math.max(1, Math.ceil(visibleJobRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStartIndex = visibleJobRows.length === 0
    ? 0
    : (currentPage - 1) * pageSize + 1
  const pageEndIndex = Math.min(currentPage * pageSize, visibleJobRows.length)
  const pagedJobRows = visibleJobRows.slice(pageStartIndex - 1, pageEndIndex)
  const hasWorkspace = Boolean(dashboard.workspace)
  const hasAnyJobs = entries.length > 0
  const hasActiveRefinements = Boolean(searchTerm) || activeAdvancedFilterCount > 0
  const emptyState = getJobsEmptyState({
    filter,
    hasAnyJobs,
    hasWorkspace,
  })
  const displayedEmptyState = hasActiveRefinements && jobRows.length > 0
    ? {
        title: "No matching jobs",
        copy: "Adjust the search or filters to widen this Jobs view.",
        actionLabel: null,
      }
    : emptyState
  const showStandaloneEmptyState =
    pagedJobRows.length === 0
    && !dashboardLoadError
    && (
      !hasWorkspace
      || !hasAnyJobs
      || (filter === "archived" && filteredEntries.length === 0)
    )
  const activeFilterChips = [
    ...workflowFilters.map((workflowFilter) => ({
      id: `workflow-${workflowFilter}`,
      label: getWorkflowFilterLabel(workflowFilter),
      onRemove: () =>
        setWorkflowFilters((currentFilters) =>
          currentFilters.filter((currentFilter) => currentFilter !== workflowFilter),
        ),
    })),
    ...(jobTypeFilter !== "all"
      ? [{
          id: "job-type",
          label: jobTypeFilter,
          onRemove: () => setJobTypeFilter("all"),
        }]
      : []),
    ...(dateFilter !== "all"
      ? [{
          id: "date",
          label: getDateFilterLabel(dateFilter, customDateRange),
          onRemove: () => {
            setDateFilter("all")
            setCustomDateRange({ ...emptyJobsDateRange })
          },
        }]
      : []),
    ...(crewFilter !== "all"
      ? [{
          id: "crew",
          label: crewFilter,
          onRemove: () => setCrewFilter("all"),
        }]
      : []),
  ]

  useEffect(() => {
    setPage(1)
  }, [
    crewFilter,
    customDateRange.end,
    customDateRange.start,
    dateFilter,
    filter,
    jobTypeFilter,
    searchTerm,
    sortMode,
    workflowFilters,
  ])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  function clearAdvancedFilters() {
    setWorkflowFilters([])
    setJobTypeFilter("all")
    setCrewFilter("all")
    setDateFilter("all")
    setCustomDateRange({ ...emptyJobsDateRange })
    setDraftWorkflowFilters([])
    setDraftJobTypeFilter("all")
    setDraftCrewFilter("all")
    setDraftDateFilter("all")
    setDraftCustomDateRange({ ...emptyJobsDateRange })
  }

  function syncDraftFiltersFromApplied() {
    setDraftWorkflowFilters(workflowFilters)
    setDraftJobTypeFilter(jobTypeFilter)
    setDraftCrewFilter(crewFilter)
    setDraftDateFilter(dateFilter)
    setDraftCustomDateRange({ ...customDateRange })
  }

  function handleToggleFilters() {
    if (!filtersOpen) {
      syncDraftFiltersFromApplied()
    }

    setFiltersOpen((isOpen) => !isOpen)
  }

  function handleToggleDraftWorkflowFilter(workflowFilter: JobsWorkflowState) {
    setDraftWorkflowFilters((currentFilters) =>
      currentFilters.includes(workflowFilter)
        ? currentFilters.filter((currentFilter) => currentFilter !== workflowFilter)
        : [...currentFilters, workflowFilter],
    )
  }

  function handleClearDraftFilters() {
    setDraftWorkflowFilters([])
    setDraftJobTypeFilter("all")
    setDraftCrewFilter("all")
    setDraftDateFilter("all")
    setDraftCustomDateRange({ ...emptyJobsDateRange })
  }

  function handleApplyFilters() {
    const nextCustomDateRange =
      draftCustomDateRange.start
        && draftCustomDateRange.end
        && draftCustomDateRange.start > draftCustomDateRange.end
        ? {
            start: draftCustomDateRange.end,
            end: draftCustomDateRange.start,
          }
        : draftCustomDateRange

    setWorkflowFilters(draftWorkflowFilters)
    setJobTypeFilter(draftJobTypeFilter)
    setCrewFilter(draftCrewFilter)
    setDateFilter(draftDateFilter)
    setCustomDateRange({ ...nextCustomDateRange })
    setFiltersOpen(false)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>, row: JobsPageRow) {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    handleOpenJob(row)
  }

  function handleOpenJob(row: JobsPageRow) {
    onStartDashboardCommand({
      action: "open-entry",
      entryId: row.id,
    })
  }

  function handleJobAction(row: JobsPageRow) {
    if (
      (row.nextActionKind === "view-report" || row.nextActionKind === "review-send")
      && typeof row.reportId === "number"
    ) {
      onOpenReport(row.reportId)
      return
    }

    onStartDashboardCommand({
      action: row.nextActionKind === "generate-report" ? "generate-report" : "add-evidence",
      entryId: row.id,
    })
  }

  return (
    <section className="navigation-page jobs-page">
      <NavigationHeader
        eyebrow="Work"
        title="Jobs"
        copy={
          dashboardLoadError
            ? "Saved job data could not be loaded."
            : getJobsHeaderCopy({
                filter,
                filteredCount: filteredEntries.length,
                hasWorkspace,
                totalCount: getJobsFilterCount(entries, null),
                workspaceName: getWorkspaceName(dashboard),
              })
        }
        action={
          <Button
            className="dashboard-primary-action jobs-new-job-action"
            onClick={() => onStartDashboardCommand({ action: "create-job" })}
          >
            <Plus aria-hidden="true" size={15} />
            New job
          </Button>
        }
      />

      <nav className="jobs-filter-bar" aria-label="Job lifecycle filters">
        {JOB_PAGE_FILTERS.map((item) => {
          const isActive = item.status === null ? !filter : filter === item.status

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={`jobs-filter-chip ${isActive ? "jobs-filter-chip--active" : ""}`}
              href={item.href}
              key={item.label}
            >
              <span>{item.label}</span>
              <strong>{getJobsFilterCount(entries, item.status)}</strong>
            </a>
          )
        })}
      </nav>

      <div className="jobs-toolbar">
        <div className="jobs-search-row">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label="Search jobs"
            className="jobs-search-input"
            type="search"
            placeholder="Search jobs, customers, addresses, report #..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="jobs-toolbar-actions">
          <button
            className={`jobs-toolbar-button ${
              activeAdvancedFilterCount > 0 ? "jobs-toolbar-button--active" : ""
            }`}
            type="button"
            aria-expanded={filtersOpen}
            onClick={handleToggleFilters}
          >
            <ListFilter aria-hidden="true" size={15} />
            Filters
            {activeAdvancedFilterCount > 0 ? <strong>{activeAdvancedFilterCount}</strong> : null}
            <ChevronDown
              aria-hidden="true"
              className={`jobs-filter-chevron ${filtersOpen ? "jobs-filter-chevron--open" : ""}`}
              size={14}
            />
          </button>

          <label className="jobs-sort-select">
            <ArrowDownUp aria-hidden="true" size={15} />
            <select
              aria-label="Sort jobs"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as JobsSortMode)}
            >
              <option value="recent">Recently active</option>
              <option value="oldest">Oldest active</option>
              <option value="job">Job name</option>
              <option value="customer">Customer</option>
            </select>
            <ChevronDown aria-hidden="true" size={14} />
          </label>
        </div>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="jobs-active-filters" aria-label="Active job filters">
          {activeFilterChips.map((chip) => (
            <button type="button" key={chip.id} onClick={chip.onRemove}>
              {chip.label}
              <X aria-hidden="true" size={12} />
            </button>
          ))}
          <button
            className="jobs-active-filters-clear"
            type="button"
            onClick={clearAdvancedFilters}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {filtersOpen ? (
        <section className="jobs-filter-panel" aria-label="Job filters">
          <div className="jobs-filter-panel-heading">
            <strong>Filters</strong>
          </div>

          <fieldset className="jobs-workflow-filter-group">
            <legend>Workflow</legend>
            {(["needs-photos", "ready-for-report", "ready-to-send"] as const).map(
              (workflowFilter) => (
                <label key={workflowFilter}>
                  <input
                    type="checkbox"
                    checked={draftWorkflowFilters.includes(workflowFilter)}
                    onChange={() => handleToggleDraftWorkflowFilter(workflowFilter)}
                  />
                  <span>{getWorkflowFilterLabel(workflowFilter)}</span>
                </label>
              ),
            )}
          </fieldset>

          <label className="jobs-filter-field">
            <span>Job type</span>
            <select
              value={draftJobTypeFilter}
              onChange={(event) => setDraftJobTypeFilter(event.target.value)}
            >
              <option value="all">All types</option>
              {jobTypeOptions.map((jobType) => (
                <option value={jobType} key={jobType}>{jobType}</option>
              ))}
            </select>
          </label>

          <div className="jobs-filter-field jobs-filter-field--date">
            <label>
              <span>Date</span>
              <select
                value={draftDateFilter}
                onChange={(event) => setDraftDateFilter(event.target.value as JobsDateFilter)}
              >
                <option value="all">Any time</option>
                <option value="today">Today</option>
                <option value="last-7">Last 7 days</option>
                <option value="last-30">Last 30 days</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {draftDateFilter === "custom" ? (
              <div className="jobs-custom-date-grid">
                <label>
                  <span>Start</span>
                  <input
                    type="date"
                    value={draftCustomDateRange.start}
                    onChange={(event) =>
                      setDraftCustomDateRange((currentRange) => ({
                        ...currentRange,
                        start: event.target.value,
                      }))}
                  />
                </label>
                <label>
                  <span>End</span>
                  <input
                    type="date"
                    value={draftCustomDateRange.end}
                    onChange={(event) =>
                      setDraftCustomDateRange((currentRange) => ({
                        ...currentRange,
                        end: event.target.value,
                      }))}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <label className="jobs-filter-field">
            <span>Crew</span>
            <select
              value={draftCrewFilter}
              onChange={(event) => setDraftCrewFilter(event.target.value)}
            >
              <option value="all">Anyone</option>
              {crewOptions.map((crewName) => (
                <option value={crewName} key={crewName}>{crewName}</option>
              ))}
            </select>
          </label>

          <div className="jobs-filter-panel-actions">
            <button
              className="jobs-filter-clear"
              type="button"
              onClick={handleClearDraftFilters}
            >
              Clear
            </button>
            <button
              className="jobs-filter-apply"
              type="button"
              onClick={handleApplyFilters}
            >
              Apply
            </button>
          </div>
        </section>
      ) : null}

      {showStandaloneEmptyState ? (
        <section className="jobs-empty-state-panel">
          <ClipboardList aria-hidden="true" size={22} />
          <h2>{displayedEmptyState.title}</h2>
          <p>{displayedEmptyState.copy}</p>
          {displayedEmptyState.actionLabel ? (
            <Button
              className="jobs-empty-primary-action"
              variant="secondary"
              size="sm"
              onClick={() => onStartDashboardCommand({ action: "create-job" })}
            >
              {displayedEmptyState.actionLabel}
              <ArrowRight aria-hidden="true" size={14} />
            </Button>
          ) : null}
        </section>
      ) : (
        <section className="jobs-record-panel">
          <div className="jobs-record-header" aria-hidden="true">
            <span>Job / Property</span>
            <span>Progress</span>
            <span>Last active</span>
            <span>Next step</span>
          </div>

          <div className="jobs-record-list">
            {pagedJobRows.length === 0 ? (
              <div className="jobs-record-empty">
                <ClipboardList aria-hidden="true" size={22} />
                <h2>{displayedEmptyState.title}</h2>
                <p>
                  {dashboardLoadError
                    ? "Saved job data could not be loaded."
                    : displayedEmptyState.copy}
                </p>
                {displayedEmptyState.actionLabel ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onStartDashboardCommand({ action: "create-job" })}
                  >
                    {displayedEmptyState.actionLabel}
                  </Button>
                ) : null}
              </div>
            ) : (
              pagedJobRows.map((row) => (
                <article
                  className="jobs-record-row"
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${row.title}`}
                  onClick={() => handleOpenJob(row)}
                  onKeyDown={(event) => handleRowKeyDown(event, row)}
                >
                  <div className="jobs-record-primary">
                    <JobsRecordThumbnail authToken={authToken} row={row} />
                    <div className="jobs-record-primary-copy">
                      <strong title={row.title}>{row.title}</strong>
                      <span title={row.address}>{row.address}</span>
                      <small>
                        <span>{row.customer}</span>
                        <span>{row.photoLabel}</span>
                      </small>
                    </div>
                  </div>

                  <div className="jobs-record-progress" data-label="Progress">
                    <div className="jobs-record-status-line">
                      <span
                        className={`jobs-record-status jobs-record-status--${row.lifecycleTone}`}
                      >
                        <span aria-hidden="true" />
                        {row.lifecycleLabel}
                      </span>
                    </div>
                    <small>
                      <span>{row.progressDetail}</span>
                      {row.reportNumber ? (
                        <>
                          <span className="jobs-record-progress-separator" aria-hidden="true">
                            &middot;
                          </span>
                          <code>{row.reportNumber}</code>
                        </>
                      ) : null}
                    </small>
                  </div>

                  <div className="jobs-record-last-active" data-label="Updated">
                    <span>{row.lastActiveLabel}</span>
                  </div>

                  <button
                    className={`jobs-record-action jobs-record-action--${row.nextActionKind}`}
                    type="button"
                    aria-label={`${row.nextActionLabel} for ${row.title}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleJobAction(row)
                    }}
                  >
                    {row.nextActionLabel}
                    <ArrowRight aria-hidden="true" size={14} />
                  </button>
                </article>
              ))
            )}
          </div>

          <footer className="jobs-record-footer">
            <span>
              {getJobsFooterLabel(visibleJobRows.length, pageStartIndex, pageEndIndex, filter)}
            </span>
            {totalPages > 1 ? (
              <div>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((currentPageNumber) => currentPageNumber - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((currentPageNumber) => currentPageNumber + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </footer>
        </section>
      )}

    </section>
  )
}

function ReportsDocumentEvidenceImage({
  authToken,
  label,
  photo,
}: {
  authToken: string
  label: string
  photo?: WorkEntryPhoto
}) {
  const [fetchedPhotoUrl, setFetchedPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    setFetchedPhotoUrl(null)

    if (!photo || photo.previewUrl || !photo.contentUrl) {
      return
    }

    const contentUrl = photo.contentUrl
    const controller = new AbortController()
    let objectUrl: string | null = null
    let isCurrent = true

    async function loadPhoto() {
      try {
        const headers = new Headers()
        headers.set("Authorization", `Bearer ${authToken}`)

        const response = await fetch(contentUrl, {
          headers,
          signal: controller.signal,
        })

        if (!response.ok || !isCurrent) {
          return
        }

        objectUrl = URL.createObjectURL(await response.blob())

        if (isCurrent) {
          setFetchedPhotoUrl(objectUrl)
        }
      } catch {
        if (isCurrent) {
          setFetchedPhotoUrl(null)
        }
      }
    }

    void loadPhoto()

    return () => {
      isCurrent = false
      controller.abort()

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [authToken, photo])

  const photoUrl = photo?.previewUrl ?? fetchedPhotoUrl

  return (
    <div className="reports-document-evidence-thumb">
      {photoUrl ? (
        <img src={photoUrl} alt={photo?.caption || label} loading="lazy" />
      ) : (
        <Camera aria-hidden="true" size={15} />
      )}
    </div>
  )
}

function ReportsPreviewPane({
  report,
  authToken,
  sendSuccessMessage,
  onOpenReport,
  onReportSent,
  onMobileBack,
}: {
  report: ReportRow | null
  authToken: string
  sendSuccessMessage: string | null
  onOpenReport: (reportId: number) => void
  onReportSent: (report: ReportRow) => void
  onMobileBack: () => void
}) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [deliveryMessage, setDeliveryMessage] = useState("")
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    setSendDialogOpen(false)
    setDeliveryMessage("")
    setSendError(null)
    setIsSending(false)
  }, [report?.id])

  if (!report) {
    return (
      <section className="reports-workspace-preview" aria-label="Selected report preview">
        <div className="reports-preview-empty">
          <FileText aria-hidden="true" size={24} />
          <h2>Select a report</h2>
          <p>Reports that match the current queue will load here for review.</p>
        </div>
      </section>
    )
  }

  const activeReport = report
  const readinessItems = getReportReadinessItems(activeReport)
  const readinessCompleteCount = getReportReadinessCompleteCount(activeReport)
  const readinessReady = readinessCompleteCount === readinessItems.length
  const isSentReport = activeReport.deliveryState === "sent"
  const canSendReport =
    activeReport.deliveryState === "ready-to-send" && Boolean(activeReport.customerEmail)
  const primaryActionLabel =
    isSending && sendDialogOpen ? "Sending..." : activeReport.nextActionLabel
  const evidencePreviewItems = getReportPreviewEvidenceItems(activeReport.evidenceItems)

  async function handleSendReport() {
    if (!activeReport.customerEmail) {
      setSendError("Add a customer email before sending this report.")
      return
    }

    setIsSending(true)
    setSendError(null)

    try {
      await createReportShareLink(authToken, activeReport.id)
      setSendDialogOpen(false)
      onReportSent(activeReport)
    } catch {
      setSendError("Report couldn't be sent. Try again.")
    } finally {
      setIsSending(false)
    }
  }

  function handlePrimaryAction() {
    if (
      activeReport.deliveryState === "ready-to-send"
      || activeReport.deliveryState === "delivery-failed"
    ) {
      setSendDialogOpen(true)
      return
    }

    onOpenReport(activeReport.id)
  }

  return (
    <section className="reports-workspace-preview" aria-label="Selected report preview">
      <button
        className="reports-mobile-back"
        type="button"
        onClick={onMobileBack}
      >
        <ArrowLeft aria-hidden="true" size={15} />
        Queue
      </button>

      <header className="reports-preview-header">
        <div>
          <p className="eyebrow">
            {report.deliveryState === "sent" ? "Sent archive" : "Report preview"}
          </p>
          <h2>{report.reportNumber}</h2>
          <p>{report.jobName} - {report.jobAddress}</p>
        </div>
        <span className={`reports-preview-status reports-preview-status--${report.deliveryTone}`}>
          <span aria-hidden="true" />
          {report.deliveryLabel}
        </span>
      </header>

      <div className="reports-preview-grid">
        <div className="reports-document-stage" aria-label={`${report.reportNumber} document`}>
          <article className="reports-document-preview">
            <header>
              <span>FP</span>
              <div>
                <strong>Proof of Work Report</strong>
                <small>{report.reportNumber} - {report.versionLabel}</small>
              </div>
            </header>
            <section className="reports-document-title-block">
              <p className="reports-document-label">Customer copy</p>
              <h3>{report.jobName}</h3>
              <p>{report.jobAddress}</p>
            </section>
            <section className="reports-document-summary">
              <span>Work performed</span>
              <p>{report.workPerformed || "No work summary was recorded for this report."}</p>
            </section>
            <section className="reports-document-facts">
              <div>
                <span>Customer</span>
                <strong>{report.customerName}</strong>
              </div>
              <div>
                <span>Completed</span>
                <strong>{formatShortDate(report.generatedAt)}</strong>
              </div>
              <div>
                <span>Photos</span>
                <strong>{pluralizeCount(report.evidenceSummary.total, "photo")}</strong>
              </div>
            </section>
            <section className="reports-document-proof-strip" aria-label="Before during after preview">
              {evidencePreviewItems.map((item) => (
                <article key={item.stage}>
                  <span>{item.shortLabel.toUpperCase()}</span>
                  <ReportsDocumentEvidenceImage
                    authToken={authToken}
                    label={item.shortLabel}
                    photo={item.photo}
                  />
                  <strong>{item.title}</strong>
                  <small>{item.photo ? formatShortTime(item.photo.uploadedAt) : "Not captured"}</small>
                </article>
              ))}
            </section>
            <footer>
              <span>Generated {formatShortDate(report.generatedAt)}</span>
              <span>Page 1 of 2</span>
            </footer>
          </article>

          <article className="reports-document-preview reports-document-preview--evidence">
            <header>
              <span>FP</span>
              <div>
                <strong>Evidence record</strong>
                <small>{report.reportNumber} - preserved snapshot</small>
              </div>
            </header>
            <section className="reports-document-evidence-story">
              {evidencePreviewItems.map((item, index) => (
                <article key={item.stage}>
                  <div>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <p>{getReportPreviewCaption(item.photo, item.emptyCopy)}</p>
                    <small>
                      {item.photo
                        ? `Captured ${formatShortTime(item.photo.uploadedAt)}`
                        : "Not captured"}
                    </small>
                  </div>
                  <ReportsDocumentEvidenceImage
                    authToken={authToken}
                    label={item.shortLabel}
                    photo={item.photo}
                  />
                </article>
              ))}
            </section>
            <section className="reports-document-mini-records">
              <div>
                <strong>Issues & Changes</strong>
                <p>No issues or scope changes were documented.</p>
              </div>
              <div>
                <strong>Completion review</strong>
                <p>Work completed. Final condition documented.</p>
              </div>
            </section>
            <section className="reports-document-record-note">
              <strong>Document record</strong>
              <p>
                This report is a preserved snapshot of the job documentation available
                when this version was generated.
              </p>
            </section>
            <footer>
              <span>{report.versionLabel}</span>
              <span>Page 2 of 2</span>
            </footer>
          </article>
        </div>

        <aside className="reports-preview-details">
          {sendSuccessMessage ? (
            <div className="reports-send-success" role="status">
              <Check aria-hidden="true" size={14} />
              {sendSuccessMessage}
            </div>
          ) : null}

          {isSentReport ? (
            <section className="reports-preview-detail-section">
              <p className="eyebrow">Sent</p>
              <h3>Permanent delivery record</h3>
              <p className="reports-inspector-summary">
                This report has been moved into the sent archive. Delivery and view
                tracking timestamps are not recorded yet.
              </p>
            </section>
          ) : (
            <section className="reports-preview-detail-section">
              <div className="reports-readiness-card-heading">
                <div>
                  <h3>Document Readiness</h3>
                  <p>
                    {readinessReady
                      ? "All evidence collected & verified"
                      : "Generated and waiting for approval"}
                  </p>
                </div>
                <span className={`reports-readiness-badge ${
                  readinessReady ? "reports-readiness-badge--ready" : ""
                }`}>
                  <span aria-hidden="true" />
                  {readinessReady ? "READY" : "REVIEW"}
                </span>
              </div>
              <p className="reports-inspector-kicker">Proof checklist</p>
              <ul className="reports-readiness-list">
                {readinessItems.map((item) => (
                  <li key={item.label} data-complete={item.complete ? "true" : "false"}>
                    <span>{item.complete ? <Check aria-hidden="true" size={12} /> : null}</span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="reports-preview-detail-section">
            <h3>{isSentReport ? "Sent to" : "Customer info"}</h3>
            <dl className="reports-preview-detail-list">
              <div>
                <dt>Name</dt>
                <dd>{report.customerName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  {report.customerEmail ? (
                    <a href={`mailto:${report.customerEmail}`}>{report.customerEmail}</a>
                  ) : (
                    "No email recorded"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="reports-preview-detail-section">
            <h3>Document record</h3>
            <dl className="reports-preview-detail-list">
              <div>
                <dt>Version</dt>
                <dd>{report.versionLabel}</dd>
              </div>
              <div>
                <dt>Generated</dt>
                <dd>{formatShortDate(report.generatedAt)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd className={`reports-document-delivery reports-document-delivery--${report.deliveryTone}`}>
                  {report.deliveryDetail}
                </dd>
              </div>
            </dl>
          </section>

          <footer className="reports-inspector-footer">
            <button
              className={`reports-preview-primary-action reports-preview-primary-action--${report.deliveryTone}`}
              type="button"
              disabled={isSending}
              onClick={handlePrimaryAction}
            >
              {primaryActionLabel}
              <ArrowRight aria-hidden="true" size={15} />
            </button>
            {!isSentReport ? (
              <p>This document will be delivered to the client after confirmation.</p>
            ) : null}
          </footer>
        </aside>
      </div>

      {sendDialogOpen ? (
        <div className="report-dialog-backdrop" role="presentation">
          <section
            aria-labelledby="send-report-dialog-title"
            aria-modal="true"
            className="report-dialog send-report-dialog"
            role="dialog"
          >
            <button
              aria-label="Close"
              className="dialog-close-button"
              type="button"
              onClick={() => setSendDialogOpen(false)}
            >
              <X aria-hidden="true" size={17} />
            </button>
            <p className="eyebrow">Send proof report</p>
            <h2 id="send-report-dialog-title">Send proof report</h2>
            <div className="reports-send-recipient">
              <span>To</span>
              <strong>{report.customerName}</strong>
              <p>{report.customerEmail || "No email recorded"}</p>
            </div>
            <label className="reports-send-option">
              <input checked readOnly type="checkbox" />
              Email
            </label>
            <label className="reports-send-message">
              <span>Message</span>
              <textarea
                placeholder="Optional message"
                value={deliveryMessage}
                onChange={(event) => setDeliveryMessage(event.target.value)}
              />
            </label>
            {sendError ? <p className="form-error" role="alert">{sendError}</p> : null}
            <div className="report-dialog-actions">
              <Button
                variant="secondary"
                disabled={isSending}
                onClick={() => setSendDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={isSending || !canSendReport} onClick={handleSendReport}>
                {isSending ? "Sending..." : "Send report"}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function ReportsPage({
  authToken,
  dashboard,
  dashboardLoadError,
  routeSearch,
  onNavigatePath,
  onOpenReport,
  onReportStatusChange,
}: NavigationPagesProps) {
  const entries = getDashboardEntries(dashboard)
  const reports = getReportRows(entries)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortMode, setSortMode] = useState<ReportsSortMode>("recent")
  const [page, setPage] = useState(1)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [mobileReviewOpen, setMobileReviewOpen] = useState(false)
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null)
  const filter = getReportFilterFromSearch(routeSearch)
  const searchTerm = searchQuery.trim().toLowerCase()
  const needsReviewCount = getReportFilterCount(reports, "needs-review")
  const readyCount = getReportFilterCount(reports, "ready")
  const filteredReports = filterReportRows(reports, filter)
  const visibleReports = sortReportRows(
    filteredReports.filter((report) => matchesReportSearch(report, searchTerm)),
    sortMode,
  )
  const pageSize = 12
  const totalPages = Math.max(1, Math.ceil(visibleReports.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStartIndex = visibleReports.length === 0
    ? 0
    : (currentPage - 1) * pageSize + 1
  const pageEndIndex = Math.min(currentPage * pageSize, visibleReports.length)
  const pagedReports = visibleReports.slice(
    Math.max(pageStartIndex - 1, 0),
    pageEndIndex,
  )
  const selectedReport =
    visibleReports.find((report) => report.id === selectedReportId)
    ?? visibleReports[0]
    ?? null
  const reportFilterTabs: Array<{
    label: "Ready to send" | "Needs review" | "Sent"
    filter: ReportFilter
    href: string
  }> = [
    {
      label: "Needs review",
      filter: "needs-review",
      href: REPORT_FILTER_ROUTES["Needs review"],
    },
    {
      label: "Ready to send",
      filter: "ready",
      href: REPORT_FILTER_ROUTES["Ready to send"],
    },
    {
      label: "Sent",
      filter: "sent",
      href: REPORT_FILTER_ROUTES.Sent,
    },
  ]
  const queueTitle =
    filter === "sent"
      ? "Sent reports"
      : filter === "needs-review"
        ? "Needs review"
        : filter === "all"
          ? "All reports"
          : "Ready to send"
  const queueCopy =
    filter === "sent"
      ? "Customer-facing records preserved after delivery."
      : filter === "needs-review"
        ? "Generated reports waiting for approval."
        : filter === "all"
          ? "Generated, reviewed, and sent proof reports."
          : "Proof-ready reports waiting for customer delivery."
  const emptyReportsTitle = dashboardLoadError
    ? "Reports unavailable"
    : searchTerm
      ? "No matching reports"
      : filter === "sent"
        ? "No sent reports"
        : filter === "needs-review"
          ? "No reports need review"
          : filter === "all"
            ? "No reports yet"
            : "No reports ready to send"
  const emptyReportsCopy = dashboardLoadError
    ? "Saved report data could not be loaded."
    : searchTerm
      ? "Clear search or try a customer, address, job, or report number."
      : filter === "sent"
        ? "No reports have been delivered yet."
        : filter === "needs-review"
          ? "Generated reports waiting for approval will appear here."
          : filter === "all"
            ? "Jobs with Before and After evidence can generate a proof report."
            : "You're caught up. No reports are waiting to be sent."

  useEffect(() => {
    if (
      filter === "needs-review"
      && needsReviewCount === 0
      && readyCount > 0
      && !dashboardLoadError
      && !searchTerm
    ) {
      onNavigatePath(REPORT_FILTER_ROUTES["Ready to send"], true)
    }
  }, [
    dashboardLoadError,
    filter,
    needsReviewCount,
    onNavigatePath,
    readyCount,
    searchTerm,
  ])

  useEffect(() => {
    setPage(1)
    setMobileReviewOpen(false)
  }, [filter, searchTerm, sortMode])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  useEffect(() => {
    if (!sendSuccessMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSendSuccessMessage(null)
    }, 4800)

    return () => window.clearTimeout(timeoutId)
  }, [sendSuccessMessage])

  function handleSelectReport(reportId: number) {
    setSelectedReportId(reportId)
    setMobileReviewOpen(true)
  }

  function handleReportRowKeyDown(event: KeyboardEvent<HTMLElement>, reportId: number) {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    handleSelectReport(reportId)
  }

  function handleReportSent(report: ReportRow) {
    onReportStatusChange(report.id, "SHARED")
    setSendSuccessMessage(`Report sent to ${report.customerName}.`)
    setMobileReviewOpen(false)
  }

  return (
    <section
      className={`navigation-page reports-page reports-workspace-page ${
        mobileReviewOpen ? "reports-workspace-page--review-open" : ""
      }`}
    >
      <NavigationHeader
        title="Proof Reports"
        copy={
          dashboardLoadError
            ? "Saved report data could not be loaded."
            : `Review, send, and access proof reports for ${getWorkspaceName(dashboard)}.`
        }
      />

      <nav className="reports-workspace-tabs" aria-label="Report delivery filters">
        {reportFilterTabs.map((item) => {
          const isActive = item.filter === filter

          return (
            <a
              aria-current={isActive ? "page" : undefined}
              className={`reports-workspace-tab ${
                isActive ? "reports-workspace-tab--active" : ""
              }`}
              href={item.href}
              key={item.label}
            >
              <span>{item.label}</span>
              <strong>{getReportFilterCount(reports, item.filter)}</strong>
            </a>
          )
        })}
      </nav>

      <div
        className={`reports-workspace-toolbar ${
          filter === "sent" ? "reports-workspace-toolbar--sent" : ""
        }`}
      >
        <div className="reports-workspace-search">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label="Search reports"
            type="search"
            placeholder="Search reports, jobs, customers, addresses, report #..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <label className="reports-workspace-sort">
          <ArrowDownUp aria-hidden="true" size={15} />
          <select
            aria-label="Sort reports"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as ReportsSortMode)}
          >
            <option value="recent">Recently generated</option>
            <option value="oldest">Oldest generated</option>
            <option value="report">Report number</option>
            <option value="customer">Customer</option>
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </label>
      </div>

      <section className="reports-workspace-shell">
        <aside className="reports-record-panel reports-workspace-queue">
          <header className="reports-workspace-queue-header">
            <div>
              <h2>{queueTitle}</h2>
              <p>{queueCopy}</p>
            </div>
            <strong>{visibleReports.length}</strong>
          </header>

        <div className="reports-record-header" aria-hidden="true">
          <span>Report / Property</span>
          <span>Proof</span>
          <span>Delivery</span>
          <span>Generated</span>
          <span>Next step</span>
        </div>

        <div className="reports-record-list">
          {pagedReports.length === 0 ? (
            <div className="reports-record-empty">
              <FileText aria-hidden="true" size={22} />
              <h2>{emptyReportsTitle}</h2>
              <p>{emptyReportsCopy}</p>
              {!dashboardLoadError && searchTerm ? (
                <Button
                  className="reports-empty-clear"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              ) : null}
            </div>
          ) : (
            pagedReports.map((report) => {
              const readinessCompleteCount = getReportReadinessCompleteCount(report)
              const proofComplete =
                readinessCompleteCount === getReportReadinessItems(report).length
              const isSelected = selectedReport?.id === report.id

              return (
                <article
                  className={`reports-record-row ${isSelected ? "reports-record-row--active" : ""}`}
                  key={report.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${report.reportNumber}`}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectReport(report.id)}
                  onKeyDown={(event) => handleReportRowKeyDown(event, report.id)}
                >
                  <div className="reports-record-primary">
                    <strong>{report.reportNumber}</strong>
                    <span>
                      {report.workType}
                      <span aria-hidden="true"> &middot; </span>
                      {report.jobAddress}
                    </span>
                    <small>{report.customerName}</small>
                  </div>

                  <div className="reports-queue-proof-row">
                    <span>
                      {pluralizeCount(report.evidenceSummary.total, "photo")}
                      <span aria-hidden="true"> &middot; </span>
                      {proofComplete ? "Proof complete" : "Proof needs review"}
                    </span>
                    <span
                      className={`reports-delivery-status reports-delivery-status--${report.deliveryTone}`}
                    >
                      <span aria-hidden="true" />
                      {report.deliveryLabel}
                    </span>
                  </div>

                  <footer className="reports-queue-row-footer">
                    <span>Generated {formatShortDate(report.generatedAt)}</span>
                    <ArrowRight aria-hidden="true" size={14} />
                  </footer>
                </article>
              )
            })
          )}
        </div>

        <footer className="reports-record-footer">
          <span>
            {getReportsFooterLabel(visibleReports.length, pageStartIndex, pageEndIndex)}
          </span>
          {totalPages > 1 ? (
            <div>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((currentPageNumber) => currentPageNumber - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((currentPageNumber) => currentPageNumber + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
          </footer>
        </aside>

        <ReportsPreviewPane
          authToken={authToken}
          report={selectedReport}
          sendSuccessMessage={sendSuccessMessage}
          onMobileBack={() => setMobileReviewOpen(false)}
          onOpenReport={onOpenReport}
          onReportSent={handleReportSent}
        />
      </section>
    </section>
  )
}

function buildCrewRows(entries: OnboardingFirstWorkEntry[], userName: string) {
  const assignedCrew = new Map<string, number>()

  entries.forEach((entry) => {
    const names = (entry.assignedCrew ?? "")
      .split(/[,;/]+/)
      .map((name) => name.trim())
      .filter(Boolean)

    names.forEach((name) => {
      assignedCrew.set(name, (assignedCrew.get(name) ?? 0) + 1)
    })
  })

  return [
    {
      name: userName,
      role: "Owner",
      detail: "Account owner",
      jobs: entries.length,
    },
    ...Array.from(assignedCrew.entries()).map(([name, jobs]) => ({
      name,
      role: "Crew",
      detail: "Assigned from job records",
      jobs,
    })),
  ]
}

function CrewPage({ dashboard, userName, onNavigate }: NavigationPagesProps) {
  const entries = getDashboardEntries(dashboard)
  const crewRows = buildCrewRows(entries, userName)

  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Team"
        title="Crew"
        copy={`${pluralizeCount(crewRows.length, "team member")} connected to current job records.`}
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Invitations")}>
            <UserPlus aria-hidden="true" size={15} />
            Invitations
          </Button>
        }
      />

      <section className="card section-card navigation-list-panel">
        <div className="section-title-row">
          <div>
            <h3>Team directory</h3>
          </div>
        </div>
        <div className="navigation-entity-list">
          {crewRows.map((member) => (
            <article className="navigation-entity-row" key={`${member.role}-${member.name}`}>
              <span className="navigation-entity-icon">
                <Users aria-hidden="true" size={16} />
              </span>
              <div>
                <strong>{member.name}</strong>
                <small>{member.detail}</small>
              </div>
              <span>{member.role}</span>
              <span>{pluralizeCount(member.jobs, "job")}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

function InvitationsPage({ dashboard, onNavigate }: NavigationPagesProps) {
  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Team"
        title="Invitations"
        copy={`Workspace access for ${getWorkspaceName(dashboard)}.`}
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Crew")}>
            <Users aria-hidden="true" size={15} />
            Crew
          </Button>
        }
      />

      <section className="card section-card navigation-empty-state">
        <Mail aria-hidden="true" size={22} />
        <h2>No pending invitations</h2>
        <p>Invitation records are not connected to the backend yet.</p>
      </section>
    </section>
  )
}

function CompanyProfilePage({ dashboard, onNavigate }: NavigationPagesProps) {
  const entries = getDashboardEntries(dashboard)
  const reports = getReportRows(entries)

  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Company"
        title={getWorkspaceName(dashboard)}
        copy="Company identity for jobs, field records, and generated reports."
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Settings")}>
            <BriefcaseBusiness aria-hidden="true" size={15} />
            Settings
          </Button>
        }
      />

      <div className="navigation-metrics-row">
        <NavigationMetric label="Jobs" value={entries.length} detail="Stored records" />
        <NavigationMetric label="Reports" value={reports.length} detail="Generated snapshots" />
        <NavigationMetric label="Members" value={dashboard.workspace ? 1 : 0} detail="Known users" />
        <NavigationMetric
          label="Status"
          value={dashboard.workspace ? "Active" : "Setup"}
          detail="Workspace state"
        />
      </div>

      <section className="card section-card navigation-list-panel">
        <div className="section-title-row">
          <div>
            <h3>Profile details</h3>
          </div>
        </div>
        <div className="navigation-detail-list">
          <DetailRow label="Workspace" value={getWorkspaceName(dashboard)} />
          <DetailRow label="Role" value="Owner" />
          <DetailRow label="Report brand" value="FieldProof" />
          <DetailRow label="Access" value={dashboard.workspace ? "Active" : "Workspace required"} />
        </div>
      </section>
    </section>
  )
}

function SettingsPage({ dashboard, userName, onNavigate }: NavigationPagesProps) {
  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Company"
        title="Settings"
        copy="Account, workspace, and report settings for the current FieldProof session."
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Company profile")}>
            <BriefcaseBusiness aria-hidden="true" size={15} />
            Company
          </Button>
        }
      />

      <section className="card section-card navigation-list-panel">
        <div className="section-title-row">
          <div>
            <h3>Current settings</h3>
          </div>
        </div>
        <div className="navigation-detail-list">
          <DetailRow label="Account" value={userName} />
          <DetailRow label="Workspace" value={getWorkspaceName(dashboard)} />
          <DetailRow label="Session" value="Signed in" />
          <DetailRow label="Report review" value="Manual review before sharing" />
        </div>
      </section>
    </section>
  )
}

function HelpSupportPage({ dashboard, onNavigate }: NavigationPagesProps) {
  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Support"
        title="Help & Support"
        copy={`Support context for ${getWorkspaceName(dashboard)}.`}
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Dashboard")}>
            <ArrowRight aria-hidden="true" size={15} />
            Dashboard
          </Button>
        }
      />

      <div className="navigation-support-grid">
        <SupportTile
          icon={<ClipboardList aria-hidden="true" size={18} />}
          title="Job records"
          detail="Customer, property, scope, schedule, and evidence status."
        />
        <SupportTile
          icon={<FileText aria-hidden="true" size={18} />}
          title="Reports"
          detail="Generated snapshots, review status, and share links."
        />
        <SupportTile
          icon={<CalendarDays aria-hidden="true" size={18} />}
          title="Workflow"
          detail="Workspace setup, first job, photos, report generation, and review."
        />
      </div>
    </section>
  )
}

function ProfilePage({ dashboard, userName, onNavigate }: NavigationPagesProps) {
  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Account"
        title={userName}
        copy={`Owner account for ${getWorkspaceName(dashboard)}.`}
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Settings")}>
            <ArrowRight aria-hidden="true" size={15} />
            Preferences
          </Button>
        }
      />

      <section className="card section-card navigation-list-panel">
        <div className="section-title-row">
          <div>
            <h3>Profile</h3>
          </div>
        </div>
        <div className="navigation-detail-list">
          <DetailRow label="Name" value={userName} />
          <DetailRow label="Role" value="Owner" />
          <DetailRow label="Workspace" value={getWorkspaceName(dashboard)} />
          <DetailRow label="Status" value="Active" />
        </div>
      </section>
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="navigation-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SupportTile({
  icon,
  title,
  detail,
}: {
  icon: ReactNode
  title: string
  detail: string
}) {
  return (
    <article className="card section-card navigation-support-tile">
      <span className="navigation-entity-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{detail}</p>
    </article>
  )
}

export function NavigationPages(props: NavigationPagesProps) {
  if (props.view === "Jobs") {
    return <JobsPage {...props} />
  }

  if (props.view === "Reports") {
    return <ReportsPage {...props} />
  }

  if (props.view === "Crew") {
    return <CrewPage {...props} />
  }

  if (props.view === "Invitations") {
    return <InvitationsPage {...props} />
  }

  if (props.view === "Company profile") {
    return <CompanyProfilePage {...props} />
  }

  if (props.view === "Settings") {
    return <SettingsPage {...props} />
  }

  if (props.view === "Help & support") {
    return <HelpSupportPage {...props} />
  }

  return <ProfilePage {...props} />
}
