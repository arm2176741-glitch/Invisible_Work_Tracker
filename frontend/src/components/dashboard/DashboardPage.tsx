import {
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardList,
  ChevronDown,
  FileText,
  Home,
  Image,
  Plus,
  ShieldCheck,
  UserCircle,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { AddEvidenceStep } from "@/components/dashboard/AddEvidenceStep"
import {
  CreateWorkspaceDialog,
  type CreateWorkspaceInput,
} from "@/components/dashboard/CreateWorkspaceDialog"
import {
  CreateWorkEntryStep,
  type CreateWorkEntryCompletion,
  type CreateWorkEntryInput,
} from "@/components/dashboard/CreateWorkEntryStep"
import { DashboardRightRail } from "@/components/dashboard/DashboardRightRail"
import { FieldWorkStrip } from "@/components/dashboard/FieldWorkStrip"
import { GenerateReportStep } from "@/components/dashboard/GenerateReportStep"
import { WorkEntryList } from "@/components/dashboard/WorkEntryList"
import { Button } from "@/components/ui/button"
import {
  createOrganization,
  createWorkEntry,
  generateReport,
  updateWorkEntrySummary,
  updateWorkEntryStatus,
  uploadWorkEntryPhoto,
  type WorkEntryPhotoResponse,
} from "@/lib/api"
import {
  ONBOARDING_STEP_CONTENT,
  ONBOARDING_STEP_ORDER,
  deriveOnboardingState,
  getCompletionPercent,
  getCurrentStepNumber,
  getOnboardingStepVisualState,
  hasRequiredEvidence,
} from "@/lib/onboarding"
import type { AppView } from "@/lib/navigation"
import type {
  ActivityItem,
  AttentionItem,
  DashboardMode,
  DashboardSummary,
  WorkEntry,
  Workspace,
} from "@/types/domain"
import type {
  OnboardingDashboardSnapshot,
  OnboardingEvidenceItem,
  OnboardingFirstWorkEntry,
  VisibleOnboardingStep,
} from "@/lib/onboarding"

interface DashboardPageProps {
  dashboardMode: DashboardMode
  userName: string
  authToken: string
  onboardingDashboard: OnboardingDashboardSnapshot
  onOnboardingDashboardChange: Dispatch<SetStateAction<OnboardingDashboardSnapshot>>
  dashboardLoadError: string | null
  onExploreDemo: () => void
  onOpenReport: (reportId: number) => void
  onOpenGeneratedReport: (reportId: number) => void
  onNavigate?: (view: AppView) => void
}

const onboardingStepIcons: Record<VisibleOnboardingStep, LucideIcon> = {
  CREATE_WORKSPACE: BriefcaseBusiness,
  CREATE_WORK_ENTRY: ClipboardList,
  ADD_EVIDENCE: Image,
  GENERATE_REPORT: FileText,
  REVIEW_REPORT: ShieldCheck,
}

const onboardingStepShortLabels: Record<VisibleOnboardingStep, string> = {
  CREATE_WORKSPACE: "Workspace",
  CREATE_WORK_ENTRY: "Job",
  ADD_EVIDENCE: "Photos",
  GENERATE_REPORT: "Report",
  REVIEW_REPORT: "Share",
}

const reportPreviewSlideLabels = ["Overview", "Evidence", "Completion"]

const ONBOARDING_WELCOME_SEEN_KEY = "fieldproof.onboarding.welcomeSeen"
const WORKSPACE_COACH_DISMISSED_KEY = "fieldproof.onboarding.workspaceCoachDismissed"

type OnboardingGuideItem = {
  label: string
  detail: string
  complete: boolean
}

type OnboardingGuideContent = {
  title: string
  detail: string
  outcome: string
  items: OnboardingGuideItem[]
}

type MobileHeroAction = {
  title: string
  detail: string
  tone: "attention" | "clear" | "ready" | "setup"
  action: "create-job" | "create-workspace" | "none" | "open-entry"
  actionLabel?: string
  actionIcon?: LucideIcon
  entry?: OnboardingFirstWorkEntry
}

function getOnboardingTaskSideTitle(step: VisibleOnboardingStep) {
  if (step === "CREATE_WORKSPACE") {
    return "What this unlocks"
  }

  if (step === "CREATE_WORK_ENTRY") {
    return "What happens next"
  }

  if (step === "ADD_EVIDENCE") {
    return "Photo requirements"
  }

  if (step === "GENERATE_REPORT") {
    return "What happens next"
  }

  return "Ready to share"
}

function readLocalPreference(key: string) {
  try {
    return window.localStorage.getItem(key) === "true"
  } catch {
    return false
  }
}

function writeLocalPreference(key: string) {
  try {
    window.localStorage.setItem(key, "true")
  } catch {
    // Local preferences are only a UI convenience until backend preference fields exist.
  }
}

function getFirstName(userName: string) {
  return userName.trim().split(/\s+/)[0] || "there"
}

function pluralizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatNeedsPhotosSummary(count: number) {
  return `${count} ${count === 1 ? "job needs" : "jobs need"} photos`
}

function formatReadyToSendSummary(count: number) {
  return `${count} ${count === 1 ? "report is" : "reports are"} ready to send`
}

function mapUploadedPhotoResponse(
  photo: WorkEntryPhotoResponse,
  previewUrl?: string,
): OnboardingEvidenceItem {
  return {
    id: photo.id,
    category: photo.category,
    caption: photo.caption,
    fileName: photo.originalFilename,
    fileSizeBytes: photo.fileSizeBytes,
    previewUrl,
    contentUrl: `/api/work-entries/${photo.workEntryId}/photos/${photo.id}/content`,
    createdAt: photo.createdAt,
  }
}

export function DashboardPage({
  dashboardMode,
  userName,
  authToken,
  onboardingDashboard,
  onOnboardingDashboardChange,
  dashboardLoadError,
  onExploreDemo,
  onOpenReport,
  onOpenGeneratedReport,
  onNavigate,
}: DashboardPageProps) {
  if (dashboardMode === "onboarding") {
    return (
      <OnboardingDashboard
        dashboard={onboardingDashboard}
        setDashboard={onOnboardingDashboardChange}
        authToken={authToken}
        userName={userName}
        dashboardLoadError={dashboardLoadError}
        onExploreDemo={onExploreDemo}
        onOpenReport={onOpenReport}
        onOpenGeneratedReport={onOpenGeneratedReport}
      />
    )
  }

  return (
    <OperationalDashboard
      dashboard={onboardingDashboard}
      setDashboard={onOnboardingDashboardChange}
      authToken={authToken}
      dashboardLoadError={dashboardLoadError}
      onOpenReport={onOpenReport}
      onOpenGeneratedReport={onOpenGeneratedReport}
      onNavigate={onNavigate}
      userName={userName}
    />
  )
}

function getDashboardEntries(dashboard: OnboardingDashboardSnapshot) {
  if (dashboard.workEntries?.length) {
    return dashboard.workEntries
  }

  return dashboard.firstWorkEntry ? [dashboard.firstWorkEntry] : []
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return "No date"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function getMissingEvidenceLabel(entry: OnboardingFirstWorkEntry) {
  const evidence = entry.evidence ?? []
  const hasBefore = evidence.some((item) => item.category === "BEFORE")
  const hasAfter = evidence.some((item) => item.category === "AFTER")

  if (!hasBefore && !hasAfter) {
    return "Needs Before and After photos"
  }

  if (!hasBefore) {
    return "Needs Before photos"
  }

  if (!hasAfter) {
    return "Needs After photos"
  }

  return "Photos complete"
}

function getEvidenceCounts(entry: OnboardingFirstWorkEntry) {
  const evidence = entry.evidence ?? []

  return {
    before: evidence.filter((item) => item.category === "BEFORE").length,
    during: evidence.filter((item) => item.category === "DURING").length,
    after: evidence.filter((item) => item.category === "AFTER").length,
  }
}

function getMobileRecentJobStatus(entry: OnboardingFirstWorkEntry) {
  if (entry.report?.status === "SHARED") {
    return { label: "Completed", tone: "complete" }
  }

  if (entry.report) {
    return { label: "Ready to send", tone: "send" }
  }

  if (hasRequiredEvidence(entry)) {
    return { label: "Ready for report", tone: "ready" }
  }

  if ((entry.evidence?.length ?? 0) > 0) {
    return { label: "In progress", tone: "active" }
  }

  return { label: "Scheduled", tone: "scheduled" }
}

function buildOperationalEntries(
  entries: OnboardingFirstWorkEntry[],
): WorkEntry[] {
  return entries.map((entry) => {
    const proofReady = hasRequiredEvidence(entry)
    const report = entry.report
    const photoCount = entry.evidence?.length ?? 0
    const thumbnailEvidence = entry.evidence?.find((item) =>
      Boolean(item.previewUrl || item.contentUrl),
    )

    return {
      id: entry.id,
      jobName: entry.jobTitle ?? "Untitled job",
      jobAddress: entry.propertyAddress ?? "No property address added",
      customerName: entry.customerName ?? "Customer not recorded",
      customerPhone: entry.customerPhone,
      customerEmail: entry.customerEmail,
      customerContactName: entry.customerContactName,
      workType: entry.workType ?? "General work",
      workDate: entry.workDate ?? new Date().toISOString(),
      status: entry.status ?? (report ? "COMPLETED" : "DRAFT"),
      workPerformed: entry.workPerformedSummary ?? entry.description ?? "",
      plannedScope: entry.plannedScope,
      proofReady,
      reportId: report?.id,
      reportNumber: report?.reportNumber,
      thumbnailUrl: thumbnailEvidence?.previewUrl,
      thumbnailContentUrl: thumbnailEvidence?.contentUrl,
      updatedLabel: formatShortDate(entry.workDate),
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

function buildDashboardSummary(
  entries: OnboardingFirstWorkEntry[],
): DashboardSummary {
  return {
    activeJobs: entries.filter((entry) => entry.status !== "COMPLETED").length,
    needsEvidence: entries.filter((entry) => !hasRequiredEvidence(entry)).length,
    readyForReport: entries.filter((entry) => hasRequiredEvidence(entry) && !entry.report).length,
    proofReady: entries.filter((entry) => entry.report && entry.report.status !== "SHARED").length,
    reportsGenerated: entries.filter((entry) => entry.report).length,
  }
}

function buildAttentionItems(
  entries: OnboardingFirstWorkEntry[],
): AttentionItem[] {
  const items: AttentionItem[] = []

  entries.forEach((entry) => {
    if (!hasRequiredEvidence(entry)) {
      items.push({
        id: entry.id,
        title: entry.jobTitle ?? "Untitled job",
        detail: getMissingEvidenceLabel(entry),
        actionLabel: "Add photos",
        tone: "warning",
      })
      return
    }

    if (!entry.report) {
      items.push({
        id: entry.id,
        title: entry.jobTitle ?? "Untitled job",
        detail: "Documentation ready",
        actionLabel: "Generate report",
        tone: "generate",
      })
      return
    }

    if (entry.report.status !== "SHARED") {
      items.push({
        id: entry.id,
        title: entry.jobTitle ?? "Untitled job",
        detail: "Report ready to send",
        actionLabel: "Review & send",
        tone: "send",
      })
    }
  })

  return items
}

function buildRecentActivities(
  entries: OnboardingFirstWorkEntry[],
): ActivityItem[] {
  if (entries.length === 0) {
    return []
  }

  return entries.slice(0, 4).map((entry) => {
    if (entry.report) {
      return {
        id: entry.report.id,
        title: `${entry.jobTitle ?? "Job"} proof report generated`,
        detail: `${entry.propertyAddress ?? "No property address"} - ${formatShortDate(entry.report.generatedAt)}`,
        tone: "report",
      }
    }

    return {
      id: entry.id,
      title: `${entry.jobTitle ?? "Job"} updated`,
      detail: `${entry.propertyAddress ?? "No property address"} - ${formatShortDate(entry.workDate)}`,
      tone: hasRequiredEvidence(entry) ? "success" : "neutral",
    }
  })
}

function getMobileEntryDetail(entry: OnboardingFirstWorkEntry) {
  return `${entry.jobTitle ?? "Untitled job"} - ${
    entry.propertyAddress ?? "No property address added"
  }`
}

function getMobileHeroAction(
  entries: OnboardingFirstWorkEntry[],
  hasWorkspace: boolean,
): MobileHeroAction {
  if (!hasWorkspace) {
    return {
      title: "Create a workspace to start FieldProof.",
      detail: "Set up where jobs, photos, and proof reports live.",
      tone: "setup",
      action: "create-workspace",
      actionLabel: "Create workspace",
      actionIcon: Plus,
    }
  }

  const readyToSendEntries = entries.filter(
    (entry) => entry.report?.status !== "SHARED" && entry.report,
  )

  if (readyToSendEntries.length > 0) {
    const entry = readyToSendEntries[0]

    return {
      title: `${pluralizeCount(readyToSendEntries.length, "report", "reports")} ready to send.`,
      detail: getMobileEntryDetail(entry),
      tone: "ready",
      action: "open-entry",
      actionLabel: "Review and send",
      actionIcon: ArrowRight,
      entry,
    }
  }

  const needsEvidenceEntries = entries.filter((entry) => !hasRequiredEvidence(entry))

  if (needsEvidenceEntries.length > 0) {
    const entry = needsEvidenceEntries[0]

    return {
      title: `${formatNeedsPhotosSummary(needsEvidenceEntries.length)}.`,
      detail: getMobileEntryDetail(entry),
      tone: "attention",
      action: "open-entry",
      actionLabel: "Add photos",
      actionIcon: ArrowRight,
      entry,
    }
  }

  const readyForReportEntries = entries.filter((entry) => hasRequiredEvidence(entry) && !entry.report)

  if (readyForReportEntries.length > 0) {
    const entry = readyForReportEntries[0]

    return {
      title: `${pluralizeCount(readyForReportEntries.length, "job", "jobs")} ready for report.`,
      detail: getMobileEntryDetail(entry),
      tone: "ready",
      action: "open-entry",
      actionLabel: "Generate report",
      actionIcon: ArrowRight,
      entry,
    }
  }

  if (entries.length === 0) {
    return {
      title: "Create your first proof record.",
      detail: "Add the property and start documenting photos.",
      tone: "setup",
      action: "create-job",
      actionLabel: "Create first job",
      actionIcon: Plus,
    }
  }

  return {
    title: "You're caught up.",
    detail: "No jobs need action right now.",
    tone: "clear",
    action: "none",
  }
}

function getMobileJobStatus(entry: OnboardingFirstWorkEntry) {
  if (entry.report?.status === "SHARED") {
    return "Report shared"
  }

  if (entry.report) {
    return "Report ready to send"
  }

  if (hasRequiredEvidence(entry)) {
    return "Ready for report"
  }

  return getMissingEvidenceLabel(entry)
}

function getMobileJobActionLabel(entry: OnboardingFirstWorkEntry) {
  if (entry.report) {
    return entry.report.status === "SHARED" ? "View report" : "Review and send"
  }

  if (hasRequiredEvidence(entry)) {
    return "Generate report"
  }

  return "Add photos"
}

function getPhotoCount(entry: OnboardingFirstWorkEntry) {
  const count = entry.evidence?.length ?? 0

  return `${count} photo${count === 1 ? "" : "s"}`
}

function buildOnboardingGuide(
  dashboard: OnboardingDashboardSnapshot,
  currentStep: VisibleOnboardingStep,
): OnboardingGuideContent {
  const firstEntry = dashboard.firstWorkEntry
  const evidence = firstEntry?.evidence ?? []
  const hasBeforePhoto = evidence.some((item) => item.category === "BEFORE")
  const hasAfterPhoto = evidence.some((item) => item.category === "AFTER")
  const hasCaption = evidence.some((item) => item.caption.trim().length > 0)
  const hasWorkSummary = Boolean(firstEntry?.workPerformedSummary?.trim())
  const jobLabel = firstEntry?.jobTitle ?? "your first job"

  if (currentStep === "CREATE_WORKSPACE") {
    return {
      title: "Create the company workspace",
      detail:
        "This gives FieldProof a real place to store jobs, crew activity, photos, and proof reports.",
      outcome:
        "After the workspace exists, the dashboard will unlock the first job step automatically.",
      items: [
        {
          label: "Company name",
          detail: "Appears in the app and future customer reports.",
          complete: Boolean(dashboard.workspace),
        },
        {
          label: "Workspace container",
          detail: "Holds jobs, photos, reports, and setup history.",
          complete: Boolean(dashboard.workspace),
        },
        {
          label: "Next action",
          detail: "Create job appears as soon as setup is saved.",
          complete: Boolean(dashboard.workspace),
        },
      ],
    }
  }

  if (currentStep === "CREATE_WORK_ENTRY") {
    return {
      title: "Create the first job",
      detail: "Add the property and start documenting.",
      outcome: "Takes about 1 minute. You can edit everything later.",
      items: [
        {
          label: "Property",
          detail: "Where the work happens.",
          complete: Boolean(firstEntry?.customerName && firstEntry.propertyAddress),
        },
        {
          label: "Scope",
          detail: "What needs to be documented.",
          complete: Boolean(firstEntry?.workType),
        },
        {
          label: "Photos",
          detail: "Capture Before and After evidence.",
          complete: Boolean(firstEntry),
        },
      ],
    }
  }

  if (currentStep === "ADD_EVIDENCE") {
    return {
      title: `Add photos for ${jobLabel}`,
      detail: "Capture the condition before and after the work.",
      outcome: "Before + After unlock the report step. Captions can be edited later.",
      items: [
        {
          label: "Before",
          detail: "Original condition.",
          complete: hasBeforePhoto,
        },
        {
          label: "After",
          detail: "Completed condition.",
          complete: hasAfterPhoto,
        },
        {
          label: "Captions",
          detail: "What each photo proves.",
          complete: hasCaption,
        },
      ],
    }
  }

  if (currentStep === "GENERATE_REPORT") {
    return {
      title: "Create the proof report",
      detail:
        "Review the saved job summary and photos before FieldProof creates the customer-ready report snapshot.",
      outcome:
        "After generation, the report opens for review, sharing, and download.",
      items: [
        {
          label: "Summary",
          detail: "Work performed.",
          complete: hasWorkSummary,
        },
        {
          label: "Evidence",
          detail: "Before and After photos.",
          complete: hasBeforePhoto && hasAfterPhoto,
        },
        {
          label: "Snapshot",
          detail: "Create report record.",
          complete: Boolean(firstEntry?.report),
        },
      ],
    }
  }

  return {
    title: "Review and share the first proof report",
    detail:
      "Inspect the generated document, then download, print, or copy a secure link when it is ready for the customer.",
    outcome:
      "After review, onboarding ends and FieldProof switches into the operational dashboard.",
    items: [
      {
        label: "Report generated",
        detail: firstEntry?.report?.reportNumber ?? "First proof report exists.",
        complete: Boolean(firstEntry?.report),
      },
      {
        label: "Customer-ready actions",
        detail: "Download, print, and share are available from the report viewer.",
        complete: Boolean(firstEntry?.report),
      },
      {
        label: "Operational dashboard",
        detail: "The tutorial disappears after the report is reviewed.",
        complete: Boolean(firstEntry?.report?.reviewedAt),
      },
    ],
  }
}

function buildWorkspaceSummary(
  dashboard: OnboardingDashboardSnapshot,
  summary: DashboardSummary,
): Workspace {
  return {
    id: dashboard.workspace?.id ?? 0,
    name: dashboard.workspace?.name ?? "No workspace selected",
    role: "OWNER",
    status: "ACTIVE",
    memberCount: dashboard.workspace ? 1 : 0,
    workEntryCount: summary.activeJobs,
    reportCount: summary.reportsGenerated,
  }
}

function OnboardingDashboard({
  dashboard,
  setDashboard,
  authToken,
  userName,
  dashboardLoadError,
  onExploreDemo,
  onOpenReport,
  onOpenGeneratedReport,
}: {
  dashboard: OnboardingDashboardSnapshot
  setDashboard: Dispatch<SetStateAction<OnboardingDashboardSnapshot>>
  authToken: string
  userName: string
  dashboardLoadError: string | null
  onExploreDemo: () => void
  onOpenReport: (reportId: number) => void
  onOpenGeneratedReport: (reportId: number) => void
}) {
  const [showCreateWorkEntryStep, setShowCreateWorkEntryStep] = useState(false)
  const [showAddEvidenceStep, setShowAddEvidenceStep] = useState(false)
  const [showGenerateReportStep, setShowGenerateReportStep] = useState(false)
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false)
  const [welcomeEvaluated, setWelcomeEvaluated] = useState(false)
  const [workspaceCoachVisible, setWorkspaceCoachVisible] = useState(false)
  const [workspaceSuccess, setWorkspaceSuccess] = useState<{
    title: string
    detail: string
  } | null>(null)
  const workspaceNameId = useId()
  const workspaceErrorId = useId()
  const reportPreviewCarouselRef = useRef<HTMLDivElement>(null)
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceInlineError, setWorkspaceInlineError] = useState<string | null>(null)
  const [workspaceSubmitting, setWorkspaceSubmitting] = useState(false)
  const [activeReportPreviewSlide, setActiveReportPreviewSlide] = useState(0)
  const onboarding = deriveOnboardingState(dashboard)
  const visibleCurrentStep =
    onboarding.currentStep === "COMPLETE" ? "REVIEW_REPORT" : onboarding.currentStep
  const currentStepContent = ONBOARDING_STEP_CONTENT[visibleCurrentStep]
  const CurrentStepIcon = onboardingStepIcons[visibleCurrentStep]
  const ActionIcon = visibleCurrentStep === "CREATE_WORKSPACE" ? Plus : CurrentStepIcon
  const currentStepNumber = getCurrentStepNumber(onboarding)
  const completionPercent = getCompletionPercent(onboarding)
  const onboardingGuide = buildOnboardingGuide(dashboard, visibleCurrentStep)
  const taskSideTitle = getOnboardingTaskSideTitle(visibleCurrentStep)
  const previewCompanyName = workspaceName.trim() || "Your Company"

  useEffect(() => {
    if (dashboard.workspace) {
      setWelcomeDialogOpen(false)
      setWorkspaceCoachVisible(false)
      return
    }

    if (welcomeEvaluated || dashboardLoadError) {
      return
    }

    if (!readLocalPreference(ONBOARDING_WELCOME_SEEN_KEY)) {
      setWelcomeDialogOpen(true)
      setWelcomeEvaluated(true)
      return
    }

    if (!readLocalPreference(WORKSPACE_COACH_DISMISSED_KEY)) {
      setWorkspaceCoachVisible(true)
    }

    setWelcomeEvaluated(true)
  }, [dashboard.workspace, dashboardLoadError, welcomeEvaluated])

  useEffect(() => {
    if (!workspaceSuccess) {
      return
    }

    const dismissTimer = window.setTimeout(() => {
      setWorkspaceSuccess(null)
    }, 4200)

    return () => window.clearTimeout(dismissTimer)
  }, [workspaceSuccess])

  function handleStartFirstReport() {
    writeLocalPreference(ONBOARDING_WELCOME_SEEN_KEY)
    setWelcomeDialogOpen(false)
    setWelcomeEvaluated(true)

    if (!dashboard.workspace && !readLocalPreference(WORKSPACE_COACH_DISMISSED_KEY)) {
      setWorkspaceCoachVisible(true)
    }
  }

  function handleExploreDemoWorkspace() {
    writeLocalPreference(ONBOARDING_WELCOME_SEEN_KEY)
    setWelcomeDialogOpen(false)
    setWelcomeEvaluated(true)
    onExploreDemo()
  }

  function dismissWorkspaceCoach() {
    writeLocalPreference(WORKSPACE_COACH_DISMISSED_KEY)
    setWorkspaceCoachVisible(false)
  }

  function handleReportPreviewScroll() {
    const carousel = reportPreviewCarouselRef.current

    if (!carousel) {
      return
    }

    const slides = Array.from(carousel.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    )
    const nextActiveSlide = slides.reduce(
      (closestSlide, slide, index) => {
        const distance = Math.abs(slide.offsetLeft - carousel.scrollLeft)

        if (distance < closestSlide.distance) {
          return { index, distance }
        }

        return closestSlide
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    ).index

    setActiveReportPreviewSlide((currentSlide) =>
      currentSlide === nextActiveSlide ? currentSlide : nextActiveSlide,
    )
  }

  function scrollReportPreviewToSlide(index: number) {
    const carousel = reportPreviewCarouselRef.current
    const slide = carousel?.children.item(index)

    if (!(slide instanceof HTMLElement)) {
      return
    }

    slide.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    })
    setActiveReportPreviewSlide(index)
  }

  function handleCurrentStepAction() {
    if (visibleCurrentStep === "CREATE_WORKSPACE") {
      return
    }

    if (visibleCurrentStep === "CREATE_WORK_ENTRY") {
      setShowCreateWorkEntryStep(true)
      return
    }

    if (visibleCurrentStep === "ADD_EVIDENCE") {
      setShowAddEvidenceStep(true)
      return
    }

    if (visibleCurrentStep === "GENERATE_REPORT") {
      setShowGenerateReportStep(true)
      return
    }

    if (visibleCurrentStep === "REVIEW_REPORT" && onboarding.targetEntityId) {
      onOpenReport(onboarding.targetEntityId)
    }
  }

  async function handleInlineWorkspaceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedName = workspaceName.trim()

    if (normalizedName.length < 2) {
      setWorkspaceInlineError("Company name is required.")
      return
    }

    setWorkspaceInlineError(null)
    setWorkspaceSubmitting(true)

    try {
      await handleCreateWorkspace({
        name: normalizedName,
      })
      setWorkspaceName("")
    } catch {
      setWorkspaceInlineError("Workspace could not be created. Try again.")
    } finally {
      setWorkspaceSubmitting(false)
    }
  }

  async function handleCreateWorkspace(input: CreateWorkspaceInput) {
    const organization = await createOrganization(authToken, input.name)

    setDashboard((currentDashboard) => ({
      ...currentDashboard,
      workspace: {
        id: organization.id,
        name: organization.name,
      },
    }))
    setWorkspaceCoachVisible(false)
    setWorkspaceSuccess({
      title: "Workspace created",
      detail: `${organization.name} is ready.`,
    })
  }

  async function handleCreateWorkEntry(
    input: CreateWorkEntryInput,
    completion: CreateWorkEntryCompletion,
  ) {
    if (!dashboard.workspace) {
      throw new Error("Create a workspace before creating a job.")
    }

    const savedWorkEntry = await createWorkEntry(authToken, {
      organizationId: dashboard.workspace.id,
      jobName: input.jobTitle,
      jobAddress: input.propertyAddress,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerContactName: input.customerContactName,
      workType: input.workType,
      plannedScope: input.plannedScope?.trim() ?? "",
      workDate: input.workDate,
      scheduledStartTime: input.scheduledStartTime,
      arrivalWindow: input.arrivalWindow,
      estimatedDuration: input.estimatedDuration,
      assignedCrew: input.assignedCrew,
      siteAccessNotes: input.siteAccessNotes,
      internalNotes: input.internalNotes,
    })
    const nextWorkEntry: OnboardingFirstWorkEntry = {
      id: savedWorkEntry.id,
      evidence: [],
      evidenceReady: false,
      jobTitle: savedWorkEntry.jobName,
      propertyAddress: savedWorkEntry.jobAddress,
      customerName: savedWorkEntry.customerName,
      customerPhone: savedWorkEntry.customerPhone,
      customerEmail: savedWorkEntry.customerEmail,
      customerContactName: savedWorkEntry.customerContactName,
      workType: savedWorkEntry.workType,
      workDate: savedWorkEntry.workDate,
      scheduledStartTime: savedWorkEntry.scheduledStartTime,
      arrivalWindow: savedWorkEntry.arrivalWindow,
      estimatedDuration: savedWorkEntry.estimatedDuration,
      assignedCrew: savedWorkEntry.assignedCrew,
      siteAccessNotes: savedWorkEntry.siteAccessNotes,
      internalNotes: savedWorkEntry.internalNotes,
      status: savedWorkEntry.status,
      plannedScope: savedWorkEntry.plannedScope,
      workPerformedSummary: savedWorkEntry.workPerformedSummary,
      description: savedWorkEntry.description,
    }

    setDashboard((currentDashboard) => ({
      ...currentDashboard,
      workEntryCount: Math.max(currentDashboard.workEntryCount, 0) + 1,
      workEntries: [nextWorkEntry, ...(currentDashboard.workEntries ?? [])],
      firstWorkEntry: nextWorkEntry,
    }))
    setShowCreateWorkEntryStep(false)

    if (completion === "addPhotos") {
      setShowAddEvidenceStep(true)
    }
  }

  async function handleUploadEvidence(input: {
    category: OnboardingEvidenceItem["category"]
    files: Array<{
      file: File
      caption: string
      previewUrl: string
    }>
  }) {
    if (!dashboard.firstWorkEntry) {
      throw new Error("Create a job before uploading photos.")
    }

    const uploadedPhotos: OnboardingEvidenceItem[] = []

    for (const selectedFile of input.files) {
      const uploadedPhoto = await uploadWorkEntryPhoto(
        authToken,
        dashboard.firstWorkEntry.id,
        {
          category: input.category,
          caption: selectedFile.caption,
          file: selectedFile.file,
        },
      )

      uploadedPhotos.push(
        mapUploadedPhotoResponse(uploadedPhoto, selectedFile.previewUrl),
      )
    }

    return uploadedPhotos
  }

  function saveEvidenceDraft(evidence: OnboardingEvidenceItem[]) {
    setDashboard((currentDashboard) => {
      if (!currentDashboard.firstWorkEntry) {
        return currentDashboard
      }

      const nextWorkEntry = {
        ...currentDashboard.firstWorkEntry,
        evidence,
      }
      const nextFirstWorkEntry = {
        ...nextWorkEntry,
        evidenceReady: hasRequiredEvidence(nextWorkEntry),
      }

      return {
        ...currentDashboard,
        workEntries: (currentDashboard.workEntries ?? []).map((entry) =>
          entry.id === nextFirstWorkEntry.id ? nextFirstWorkEntry : entry,
        ),
        firstWorkEntry: nextFirstWorkEntry,
      }
    })
  }

  function handleEvidenceBackToDashboard(evidence: OnboardingEvidenceItem[]) {
    saveEvidenceDraft(evidence)
    setShowAddEvidenceStep(false)
  }

  function handleEvidenceReady(evidence: OnboardingEvidenceItem[]) {
    saveEvidenceDraft(evidence)
    setShowAddEvidenceStep(false)
    setShowGenerateReportStep(true)
  }

  async function handleSaveWorkEntry(summary: string) {
    if (!dashboard.firstWorkEntry) {
      throw new Error("Create a job before saving it.")
    }

    const savedWorkEntry = await updateWorkEntrySummary(
      authToken,
      dashboard.firstWorkEntry.id,
      summary,
    )

    setDashboard((currentDashboard) => {
      if (!currentDashboard.firstWorkEntry) {
        return currentDashboard
      }
      const nextFirstWorkEntry = {
        ...currentDashboard.firstWorkEntry,
        workPerformedSummary: savedWorkEntry.workPerformedSummary,
        description: savedWorkEntry.description,
      }

      return {
        ...currentDashboard,
        workEntries: (currentDashboard.workEntries ?? []).map((entry) =>
          entry.id === nextFirstWorkEntry.id ? nextFirstWorkEntry : entry,
        ),
        firstWorkEntry: nextFirstWorkEntry,
      }
    })
  }

  async function handleGenerateReport(summary: string) {
    if (!dashboard.firstWorkEntry) {
      throw new Error("Create a job before generating a proof report.")
    }

    const savedWorkEntry = await updateWorkEntrySummary(
      authToken,
      dashboard.firstWorkEntry.id,
      summary,
    )
    const completedWorkEntry = await updateWorkEntryStatus(
      authToken,
      dashboard.firstWorkEntry.id,
      "COMPLETED",
    )
    const report = await generateReport(authToken, dashboard.firstWorkEntry.id)

    setDashboard((currentDashboard) => {
      if (!currentDashboard.firstWorkEntry) {
        return currentDashboard
      }
      const nextFirstWorkEntry = {
        ...currentDashboard.firstWorkEntry,
        workPerformedSummary: savedWorkEntry.workPerformedSummary,
        description: savedWorkEntry.description,
        status: completedWorkEntry.status,
        report: {
          id: report.id,
          status: report.status,
          reportNumber: report.reportNumber,
          snapshotJson: report.snapshotJson,
          generatedAt: report.generatedAt,
          reviewedAt: report.reviewedAt ?? null,
        },
      }

      return {
        ...currentDashboard,
        workEntries: (currentDashboard.workEntries ?? []).map((entry) =>
          entry.id === nextFirstWorkEntry.id ? nextFirstWorkEntry : entry,
        ),
        firstWorkEntry: nextFirstWorkEntry,
      }
    })

    setShowGenerateReportStep(false)
    onOpenGeneratedReport(report.id)
  }

  if (
    dashboard.workspace &&
    onboarding.currentStep === "CREATE_WORK_ENTRY" &&
    showCreateWorkEntryStep
  ) {
    return (
      <CreateWorkEntryStep
        workspaceName={dashboard.workspace.name}
        ownerName={userName}
        onBackToDashboard={() => setShowCreateWorkEntryStep(false)}
        onCreateWorkEntry={handleCreateWorkEntry}
      />
    )
  }

  if (
    dashboard.workspace &&
    dashboard.firstWorkEntry &&
    (onboarding.currentStep === "ADD_EVIDENCE" ||
      onboarding.currentStep === "GENERATE_REPORT") &&
    showAddEvidenceStep
  ) {
    return (
      <AddEvidenceStep
        workspaceName={dashboard.workspace.name}
        workEntry={dashboard.firstWorkEntry}
        onUploadEvidence={handleUploadEvidence}
        onBackToDashboard={handleEvidenceBackToDashboard}
        onEvidenceReady={handleEvidenceReady}
      />
    )
  }

  if (
    dashboard.workspace &&
    dashboard.firstWorkEntry &&
    onboarding.currentStep === "GENERATE_REPORT" &&
    showGenerateReportStep
  ) {
    return (
      <GenerateReportStep
        workspaceName={dashboard.workspace.name}
        workEntry={dashboard.firstWorkEntry}
        onBackToDashboard={() => setShowGenerateReportStep(false)}
        onSaveWorkEntry={handleSaveWorkEntry}
        onGenerateReport={handleGenerateReport}
        onReviewEvidence={() => {
          setShowGenerateReportStep(false)
          setShowAddEvidenceStep(true)
        }}
      />
    )
  }

  return (
    <>
      {welcomeDialogOpen ? (
        <div className="onboarding-welcome-backdrop" role="presentation">
          <section
            className="onboarding-welcome-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-welcome-title"
          >
            <p className="eyebrow">Welcome to FieldProof</p>
            <h2 id="onboarding-welcome-title">Create your first proof report</h2>
            <p>
              Create your first professional proof-of-work report in five guided
              steps. You will set up your company, document a job, add photos,
              and generate a customer-ready report.
            </p>
            <div className="onboarding-welcome-actions">
              <Button type="button" variant="ghost" onClick={handleExploreDemoWorkspace}>
                Explore demo
              </Button>
              <Button type="button" onClick={handleStartFirstReport}>
                Start my first report
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {workspaceSuccess ? (
        <div className="onboarding-toast" role="status">
          <div>
            <strong>{workspaceSuccess.title}</strong>
            <p>{workspaceSuccess.detail}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss workspace confirmation"
            onClick={() => setWorkspaceSuccess(null)}
          >
            x
          </button>
        </div>
      ) : null}

      <div className="onboarding-content">
        <header className="page-header onboarding-header">
          <div>
            <h1 className="page-title">Create your first proof report</h1>
            <p className="page-copy">
              Set up your company, create a job, add photos, and generate a
              customer-ready report.
            </p>
          </div>
        </header>

        <nav className="mobile-onboarding-step-strip" aria-label="First report workflow">
          {ONBOARDING_STEP_ORDER.map((step) => {
            const stepState = getOnboardingStepVisualState(onboarding, step)

            return (
              <span
                className="mobile-onboarding-step"
                data-state={stepState}
                aria-current={stepState === "current" ? "step" : undefined}
                key={step}
              >
                {onboardingStepShortLabels[step]}
              </span>
            )
          })}
        </nav>

        <section className="card onboarding-progress-card">
          <div className="onboarding-progress-header">
            <p>First report workflow</p>
            <span>
              Step {currentStepNumber} of {onboarding.totalSteps}
            </span>
          </div>
          <div
            className="workflow-track"
            role="progressbar"
            aria-label={`${onboarding.completedCount} of ${onboarding.totalSteps} onboarding steps completed`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(completionPercent)}
          >
            {ONBOARDING_STEP_ORDER.map((step) => (
              <span
                key={step}
                data-state={getOnboardingStepVisualState(onboarding, step)}
              />
            ))}
          </div>
          <div className="onboarding-step-list onboarding-step-list-horizontal">
            {ONBOARDING_STEP_ORDER.map((step) => {
              const stepState = getOnboardingStepVisualState(onboarding, step)
              const StepIcon = onboardingStepIcons[step]

              return (
                <article
                  className="onboarding-step"
                  data-state={stepState}
                  aria-current={stepState === "current" ? "step" : undefined}
                  key={step}
                >
                  <span>
                    <StepIcon aria-hidden="true" size={18} />
                  </span>
                  <div>
                    <h3>{onboardingStepShortLabels[step]}</h3>
                    {stepState === "current" ? <small>Current</small> : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {visibleCurrentStep === "CREATE_WORKSPACE" ? (
          <form
            className="card onboarding-task-card onboarding-workspace-card"
            onSubmit={handleInlineWorkspaceSubmit}
            aria-live="polite"
          >
            <div className="onboarding-task-copy">
              <p className="onboarding-step-label">
                Step {currentStepNumber} of {onboarding.totalSteps}
              </p>
              <h2>Set up your workspace</h2>
              <p>Your company name appears on jobs and customer proof reports.</p>

              <div className="onboarding-workspace-form">
                <div className="create-entry-field">
                  <label htmlFor={workspaceNameId}>Company name *</label>
                  <input
                    id={workspaceNameId}
                    value={workspaceName}
                    maxLength={100}
                    autoComplete="organization"
                    placeholder="Desert Roofing"
                    aria-invalid={Boolean(workspaceInlineError)}
                    aria-describedby={workspaceInlineError ? workspaceErrorId : undefined}
                    disabled={workspaceSubmitting}
                    onChange={(event) => {
                      setWorkspaceName(event.target.value)
                      if (workspaceInlineError) {
                        setWorkspaceInlineError(null)
                      }
                    }}
                  />
                  {workspaceInlineError ? (
                    <p className="field-error" id={workspaceErrorId}>
                      {workspaceInlineError}
                    </p>
                  ) : null}
                </div>

              </div>

              <div className="onboarding-hero-actions">
                <div className="onboarding-primary-action-wrap">
                  <Button type="submit" disabled={workspaceSubmitting}>
                    <ActionIcon aria-hidden="true" size={17} />
                    {workspaceSubmitting ? "Creating workspace..." : "Create workspace"}
                  </Button>
                  {workspaceCoachVisible ? (
                    <div className="workspace-coach-mark" role="status">
                      <strong>Start here</strong>
                      <p>Your workspace contains your jobs, crew, photos, and reports.</p>
                      <button type="button" onClick={dismissWorkspaceCoach}>
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  className="hero-secondary-action"
                  type="button"
                  onClick={handleExploreDemoWorkspace}
                >
                  View sample report
                  <span aria-hidden="true">-&gt;</span>
                </button>
              </div>
            </div>

            <aside className="onboarding-report-preview" aria-label="Report branding preview">
              <div className="onboarding-report-preview-heading">
                <p className="onboarding-card-label">Report preview</p>
                <span>
                  {activeReportPreviewSlide + 1} / {reportPreviewSlideLabels.length}
                </span>
              </div>
              <div
                className="onboarding-report-preview-carousel"
                ref={reportPreviewCarouselRef}
                onScroll={handleReportPreviewScroll}
              >
                <button
                  className="onboarding-report-preview-page onboarding-report-preview-page-summary"
                  type="button"
                  aria-label="Open sample report overview"
                  onClick={handleExploreDemoWorkspace}
                >
                  <div className="onboarding-report-preview-header">
                    <div>
                      <p className="onboarding-preview-kicker">Proof of Work Report</p>
                      <strong>{previewCompanyName}</strong>
                    </div>
                  </div>
                  <div className="onboarding-preview-section">
                    <p className="onboarding-preview-kicker">Job overview</p>
                    <dl className="onboarding-preview-detail-grid">
                      <div>
                        <dt>Job type</dt>
                        <dd>Roof Repair</dd>
                      </div>
                      <div>
                        <dt>Address</dt>
                        <dd>1001 N 26th St</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd>Aug 7, 2026</dd>
                      </div>
                      <div>
                        <dt>Report #</dt>
                        <dd>FP-2026-000018</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="onboarding-preview-section">
                    <p className="onboarding-preview-kicker">Photo evidence</p>
                    <div className="onboarding-preview-photo-row" aria-hidden="true">
                      <span>
                        <em>Before</em>
                      </span>
                      <span>
                        <em>After</em>
                      </span>
                    </div>
                  </div>
                  <footer className="onboarding-preview-generated">
                    Generated by FieldProof
                    <span>2026-08-07 - 14:22 MST</span>
                  </footer>
                </button>
                <button
                  className="onboarding-report-preview-page onboarding-report-preview-page-evidence"
                  type="button"
                  aria-label="Open sample report evidence"
                  onClick={handleExploreDemoWorkspace}
                >
                  <div className="onboarding-preview-report-body">
                    <p className="onboarding-preview-kicker">Photo evidence</p>
                    <h3>Before / During / After</h3>
                    <div className="onboarding-preview-stage-thumbs" aria-hidden="true">
                      <span>
                        <em>Before</em>
                      </span>
                      <span>
                        <em>During</em>
                      </span>
                      <span>
                        <em>After</em>
                      </span>
                    </div>
                    <div className="onboarding-preview-stage-list">
                      <span>
                        <strong>Before</strong>
                        <small>3</small>
                        <em>Pre-work condition</em>
                      </span>
                      <span>
                        <strong>During</strong>
                        <small>8</small>
                        <em>Repair progress</em>
                      </span>
                      <span>
                        <strong>After</strong>
                        <small>3</small>
                        <em>Completed condition</em>
                      </span>
                    </div>
                    <footer className="onboarding-preview-total">14 documented photos</footer>
                    <footer className="onboarding-preview-generated">
                      Generated by FieldProof
                    </footer>
                  </div>
                </button>
                <button
                  className="onboarding-report-preview-page onboarding-report-preview-page-completion"
                  type="button"
                  aria-label="Open sample report completion record"
                  onClick={handleExploreDemoWorkspace}
                >
                  <div className="onboarding-preview-report-body">
                    <p className="onboarding-preview-kicker">Completion</p>
                    <h3>Ready to share</h3>
                    <div className="onboarding-preview-check-list">
                      <span>Work completed</span>
                      <span>Final photos captured</span>
                      <span>No unresolved issues</span>
                    </div>
                    <div className="onboarding-preview-divider" />
                    <div className="onboarding-preview-record">
                      <p className="onboarding-preview-kicker">Report record</p>
                      <strong>FP-2026-000018</strong>
                      <dl>
                        <div>
                          <dt>Version</dt>
                          <dd>Version 1 - Locked</dd>
                        </div>
                        <div>
                          <dt>Created</dt>
                          <dd>Aug 10, 2026 - 3:42 PM</dd>
                        </div>
                      </dl>
                      <span>Verified proof record</span>
                    </div>
                    <footer className="onboarding-preview-generated">
                      Generated by FieldProof
                    </footer>
                  </div>
                </button>
              </div>
              <div className="onboarding-report-preview-dots">
                {reportPreviewSlideLabels.map((label, index) => (
                  <button
                    type="button"
                    aria-label={`Show ${label.toLowerCase()} preview`}
                    aria-current={index === activeReportPreviewSlide ? "true" : undefined}
                    data-active={index === activeReportPreviewSlide}
                    key={label}
                    onClick={() => scrollReportPreviewToSlide(index)}
                  />
                ))}
              </div>
            </aside>
          </form>
        ) : (
          <section
            className="card onboarding-task-card"
            data-step={visibleCurrentStep}
            aria-live="polite"
          >
            <div className="onboarding-task-copy">
              <p className="onboarding-step-label">
                Step {currentStepNumber} of {onboarding.totalSteps}
              </p>
              <h2>{currentStepContent.title}</h2>
              <p>{currentStepContent.description}</p>
              {visibleCurrentStep === "ADD_EVIDENCE" ? (
                <small>Add at least 1 Before photo and 1 After photo to continue.</small>
              ) : null}
              <div className="onboarding-hero-actions">
                <Button type="button" onClick={handleCurrentStepAction}>
                  <ActionIcon aria-hidden="true" size={17} />
                  {currentStepContent.actionLabel}
                </Button>
              </div>
            </div>

            <aside className="onboarding-task-side">
              <p className="onboarding-card-label">{taskSideTitle}</p>
              <div className="onboarding-guide-checklist">
                {onboardingGuide.items.map((item) => (
                  <div
                    className="onboarding-guide-item"
                    data-complete={item.complete}
                    key={item.label}
                  >
                    <span aria-hidden="true" />
                    <div>
                      <strong>{item.label}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {visibleCurrentStep === "CREATE_WORK_ENTRY" ||
              visibleCurrentStep === "ADD_EVIDENCE" ||
              visibleCurrentStep === "GENERATE_REPORT" ? (
                <p className="onboarding-guide-note">{onboardingGuide.outcome}</p>
              ) : null}
            </aside>
          </section>
        )}

        {dashboardLoadError ? (
          <article className="card onboarding-support-card onboarding-error-card">
            <p className="onboarding-card-label">Backend connection</p>
            <h3>Saved data could not be loaded</h3>
            <p>{dashboardLoadError}</p>
          </article>
        ) : null}
      </div>
    </>
  )
}

function MobileOperationalHome({
  entries,
  summary,
  workspaceName,
  userName,
  onCreateJob,
  hasWorkspace,
  onCreateWorkspace,
  onJobAction,
  onOpenLatestReport,
}: {
  entries: OnboardingFirstWorkEntry[]
  summary: DashboardSummary
  workspaceName: string
  userName: string
  onCreateJob: () => void
  hasWorkspace: boolean
  onCreateWorkspace: () => void
  onJobAction: (entry: OnboardingFirstWorkEntry) => void
  onOpenLatestReport?: () => void
}) {
  const primaryAction = getMobileHeroAction(entries, hasWorkspace)
  const attentionEntries = entries
    .filter((entry) => !hasRequiredEvidence(entry) && entry.id !== primaryAction.entry?.id)
    .slice(0, 3)
  const recentEntries = entries.slice(0, 6)
  const HeroActionIcon = primaryAction.actionIcon

  function scrollToRecentJobs() {
    document
      .getElementById("mobile-recent-jobs")
      ?.scrollIntoView({ block: "start", behavior: "smooth" })
  }

  function handlePrimaryAction() {
    if (primaryAction.action === "create-workspace") {
      onCreateWorkspace()
      return
    }

    if (primaryAction.action === "create-job") {
      onCreateJob()
      return
    }

    if (primaryAction.entry) {
      onJobAction(primaryAction.entry)
    }
  }

  return (
    <section className="mobile-operational-home" aria-label="Mobile dashboard">
      <header className="mobile-home-topbar">
        <div className="mobile-home-brand">
          <span className="mobile-home-mark">FP</span>
          <strong>FieldProof</strong>
        </div>
        <button className="mobile-workspace-chip" type="button">
          {workspaceName}
          <ChevronDown aria-hidden="true" size={14} />
        </button>
      </header>

      <section className={`mobile-home-hero mobile-home-hero-${primaryAction.tone}`}>
        <p>Good morning, {getFirstName(userName)}</p>
        <h1>{primaryAction.title}</h1>
        <span className="mobile-hero-detail">{primaryAction.detail}</span>
        {primaryAction.actionLabel && HeroActionIcon ? (
          <Button className="mobile-primary-action-button" type="button" onClick={handlePrimaryAction}>
            <HeroActionIcon aria-hidden="true" size={17} />
            {primaryAction.actionLabel}
          </Button>
        ) : null}
      </section>

      {attentionEntries.length > 0 ? (
        <section className="mobile-home-section">
          <div className="mobile-section-heading">
            <p className="eyebrow">Needs attention</p>
          </div>
          <div className="mobile-job-card-list">
            {attentionEntries.map((entry) => (
              <article className="mobile-job-card mobile-attention-card" key={entry.id}>
                <div>
                  <h2>{entry.jobTitle ?? "Untitled job"}</h2>
                  <p>{getMobileJobStatus(entry)}</p>
                  <span>{entry.propertyAddress ?? "No property address added"}</span>
                </div>
                <Button
                  className="mobile-job-action"
                  type="button"
                  variant="secondary"
                  onClick={() => onJobAction(entry)}
                >
                  {getMobileJobActionLabel(entry)}
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <FieldWorkStrip
        compact
        entries={entries}
        summary={summary}
        onCreateJob={onCreateJob}
        hasWorkspace={hasWorkspace}
        onCreateWorkspace={onCreateWorkspace}
        onOpenJob={(entryId) => {
          const selectedEntry = entries.find((entry) => entry.id === entryId)

          if (selectedEntry) {
            onJobAction(selectedEntry)
          }
        }}
      />

      {recentEntries.length > 0 ? (
        <section className="mobile-home-section" id="mobile-recent-jobs">
          <div className="mobile-section-heading">
            <p className="eyebrow">Recent jobs</p>
            <a className="mobile-section-link" href="/jobs">
              View all
              <ArrowRight aria-hidden="true" size={13} />
            </a>
          </div>

          <div className="mobile-recent-job-carousel" role="list">
            {recentEntries.map((entry) => {
              const status = getMobileRecentJobStatus(entry)
              const evidenceCounts = getEvidenceCounts(entry)

              return (
                <button
                  className="mobile-job-card mobile-recent-job-card"
                  key={entry.id}
                  type="button"
                  onClick={() => onJobAction(entry)}
                  role="listitem"
                >
                  <div className="mobile-job-card-main">
                    <h2>{entry.jobTitle ?? "Untitled job"}</h2>
                    <p>{entry.propertyAddress ?? "No property address added"}</p>
                    <div
                      className={`mobile-status-photo-counts mobile-status-photo-counts-${status.tone}`}
                      aria-label={`Evidence status: ${status.label}`}
                    >
                      <span className="mobile-status-photo-counts-state">
                        <span aria-hidden="true" />
                        {status.label}
                      </span>
                      <div className="mobile-status-photo-counts-grid">
                        <span>
                          <strong>{evidenceCounts.before}</strong>
                          <small>Before</small>
                        </span>
                        <span>
                          <strong>{evidenceCounts.during}</strong>
                          <small>During</small>
                        </span>
                        <span>
                          <strong>{evidenceCounts.after}</strong>
                          <small>After</small>
                        </span>
                      </div>
                    </div>
                    <span className="mobile-recent-job-meta">
                      {getPhotoCount(entry)} - {formatShortDate(entry.workDate)}
                    </span>
                  </div>
                  <span className="mobile-recent-job-cta">
                    Open
                    <ArrowRight aria-hidden="true" size={14} />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className="active" type="button">
          <Home aria-hidden="true" size={18} />
          Home
        </button>
        <button type="button" onClick={scrollToRecentJobs}>
          <ClipboardList aria-hidden="true" size={18} />
          Jobs
        </button>
        <button
          className="mobile-bottom-nav-primary"
          type="button"
          onClick={hasWorkspace ? onCreateJob : onCreateWorkspace}
        >
          <Plus aria-hidden="true" size={22} />
          <span>New</span>
        </button>
        <button type="button" disabled={!onOpenLatestReport} onClick={onOpenLatestReport}>
          <FileText aria-hidden="true" size={18} />
          Reports
        </button>
        <button type="button" aria-disabled="true">
          <UserCircle aria-hidden="true" size={18} />
          Account
        </button>
      </nav>
    </section>
  )
}

function OperationalDashboard({
  dashboard,
  setDashboard,
  authToken,
  dashboardLoadError,
  userName,
  onOpenReport,
  onOpenGeneratedReport,
  onNavigate,
}: {
  dashboard: OnboardingDashboardSnapshot
  setDashboard: Dispatch<SetStateAction<OnboardingDashboardSnapshot>>
  authToken: string
  dashboardLoadError: string | null
  userName: string
  onOpenReport: (reportId: number) => void
  onOpenGeneratedReport: (reportId: number) => void
  onNavigate?: (view: AppView) => void
}) {
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
  const [showCreateJob, setShowCreateJob] = useState(false)
  const [showAddEvidenceStep, setShowAddEvidenceStep] = useState(false)
  const [showGenerateReportStep, setShowGenerateReportStep] = useState(false)
  const [activeLoopWorkEntry, setActiveLoopWorkEntry] =
    useState<OnboardingFirstWorkEntry | null>(null)
  const dashboardEntries = getDashboardEntries(dashboard)
  const operationalEntries = buildOperationalEntries(dashboardEntries)
  const summary = buildDashboardSummary(dashboardEntries)
  const attentionItems = buildAttentionItems(dashboardEntries)
  const recentActivities = buildRecentActivities(dashboardEntries)
  const currentWorkspace = buildWorkspaceSummary(dashboard, summary)
  const hasWorkspace = Boolean(dashboard.workspace)
  const latestReportEntry = operationalEntries.find((entry) => typeof entry.reportId === "number")
  const firstNeedsPhotosEntry = dashboardEntries.find((entry) => !hasRequiredEvidence(entry))
  const firstReadyForReportEntry = dashboardEntries.find((entry) =>
    hasRequiredEvidence(entry) && !entry.report,
  )
  const showDashboardErrorState =
    Boolean(dashboardLoadError && !hasWorkspace && dashboardEntries.length === 0)

  async function handleOperationalCreateWorkspace(input: CreateWorkspaceInput) {
    const organization = await createOrganization(authToken, input.name)

    setDashboard((currentDashboard) => ({
      ...currentDashboard,
      workspace: {
        id: organization.id,
        name: organization.name,
      },
    }))
  }

  function commitLoopWorkEntry(nextWorkEntry: OnboardingFirstWorkEntry) {
    setActiveLoopWorkEntry(nextWorkEntry)
    setDashboard((current) => {
      const currentEntries = current.workEntries ?? []
      const existingEntry = currentEntries.some((entry) => entry.id === nextWorkEntry.id)
      const nextWorkEntries = existingEntry
        ? currentEntries.map((entry) =>
            entry.id === nextWorkEntry.id ? nextWorkEntry : entry,
          )
        : [nextWorkEntry, ...currentEntries]

      return {
        ...current,
        firstWorkEntry:
          !current.firstWorkEntry || current.firstWorkEntry.id === nextWorkEntry.id
            ? nextWorkEntry
            : current.firstWorkEntry,
        workEntries: nextWorkEntries,
      }
    })
  }

  async function handleCreateJob(
    input: CreateWorkEntryInput,
    completion: CreateWorkEntryCompletion,
  ) {
    if (!dashboard.workspace) {
      return
    }

    const savedWorkEntry = await createWorkEntry(authToken, {
      organizationId: dashboard.workspace.id,
      jobName: input.jobTitle,
      jobAddress: input.propertyAddress,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      customerContactName: input.customerContactName,
      workType: input.workType,
      plannedScope: input.plannedScope?.trim() ?? "",
      workDate: input.workDate,
      scheduledStartTime: input.scheduledStartTime,
      arrivalWindow: input.arrivalWindow,
      estimatedDuration: input.estimatedDuration,
      assignedCrew: input.assignedCrew,
      siteAccessNotes: input.siteAccessNotes,
      internalNotes: input.internalNotes,
    })

    const nextWorkEntry: OnboardingFirstWorkEntry = {
      id: savedWorkEntry.id,
      jobTitle: savedWorkEntry.jobName,
      propertyAddress: savedWorkEntry.jobAddress,
      customerName: savedWorkEntry.customerName,
      customerPhone: savedWorkEntry.customerPhone,
      customerEmail: savedWorkEntry.customerEmail,
      customerContactName: savedWorkEntry.customerContactName,
      workType: savedWorkEntry.workType,
      workDate: savedWorkEntry.workDate,
      scheduledStartTime: savedWorkEntry.scheduledStartTime,
      arrivalWindow: savedWorkEntry.arrivalWindow,
      estimatedDuration: savedWorkEntry.estimatedDuration,
      assignedCrew: savedWorkEntry.assignedCrew,
      siteAccessNotes: savedWorkEntry.siteAccessNotes,
      internalNotes: savedWorkEntry.internalNotes,
      status: savedWorkEntry.status,
      plannedScope: savedWorkEntry.plannedScope,
      workPerformedSummary: savedWorkEntry.workPerformedSummary,
      description: savedWorkEntry.description,
      evidence: [],
      report: null,
    }

    setDashboard((current) => {
      const nextWorkEntries = [nextWorkEntry, ...(current.workEntries ?? [])]

      return {
        ...current,
        firstWorkEntry: current.firstWorkEntry ?? nextWorkEntry,
        workEntryCount: current.workEntryCount + 1,
        workEntries: nextWorkEntries,
      }
    })
    setShowCreateJob(false)

    if (completion === "addPhotos") {
      setActiveLoopWorkEntry(nextWorkEntry)
      setShowAddEvidenceStep(true)
    }
  }

  async function handleOperationalUploadEvidence(input: {
    category: OnboardingEvidenceItem["category"]
    files: Array<{
      file: File
      caption: string
      previewUrl: string
    }>
  }) {
    if (!activeLoopWorkEntry) {
      throw new Error("Create a job before uploading photos.")
    }

    const uploadedPhotos: OnboardingEvidenceItem[] = []

    for (const selectedFile of input.files) {
      const uploadedPhoto = await uploadWorkEntryPhoto(
        authToken,
        activeLoopWorkEntry.id,
        {
          category: input.category,
          caption: selectedFile.caption,
          file: selectedFile.file,
        },
      )

      uploadedPhotos.push(
        mapUploadedPhotoResponse(uploadedPhoto, selectedFile.previewUrl),
      )
    }

    return uploadedPhotos
  }

  function saveOperationalEvidenceDraft(evidence: OnboardingEvidenceItem[]) {
    if (!activeLoopWorkEntry) {
      return null
    }

    const nextWorkEntry = {
      ...activeLoopWorkEntry,
      evidence,
    }
    const nextWorkEntryWithReadiness = {
      ...nextWorkEntry,
      evidenceReady: hasRequiredEvidence(nextWorkEntry),
    }

    commitLoopWorkEntry(nextWorkEntryWithReadiness)

    return nextWorkEntryWithReadiness
  }

  function handleOperationalEvidenceBackToDashboard(evidence: OnboardingEvidenceItem[]) {
    saveOperationalEvidenceDraft(evidence)
    setShowAddEvidenceStep(false)
    setActiveLoopWorkEntry(null)
  }

  function handleOperationalEvidenceReady(evidence: OnboardingEvidenceItem[]) {
    const savedWorkEntry = saveOperationalEvidenceDraft(evidence)

    if (!savedWorkEntry) {
      return
    }

    setShowAddEvidenceStep(false)
    setShowGenerateReportStep(true)
  }

  async function handleOperationalSaveWorkEntry(summaryText: string) {
    if (!activeLoopWorkEntry) {
      throw new Error("Create a job before saving it.")
    }

    const savedWorkEntry = await updateWorkEntrySummary(
      authToken,
      activeLoopWorkEntry.id,
      summaryText,
    )
    const nextWorkEntry = {
      ...activeLoopWorkEntry,
      workPerformedSummary: savedWorkEntry.workPerformedSummary,
      description: savedWorkEntry.description,
    }

    commitLoopWorkEntry(nextWorkEntry)
  }

  async function handleOperationalGenerateReport(summaryText: string) {
    if (!activeLoopWorkEntry) {
      throw new Error("Create a job before generating a proof report.")
    }

    const savedWorkEntry = await updateWorkEntrySummary(
      authToken,
      activeLoopWorkEntry.id,
      summaryText,
    )
    const completedWorkEntry = await updateWorkEntryStatus(
      authToken,
      activeLoopWorkEntry.id,
      "COMPLETED",
    )
    const report = await generateReport(authToken, activeLoopWorkEntry.id)
    const nextWorkEntry = {
      ...activeLoopWorkEntry,
      workPerformedSummary: savedWorkEntry.workPerformedSummary,
      description: savedWorkEntry.description,
      status: completedWorkEntry.status,
      report: {
        id: report.id,
        status: report.status,
        reportNumber: report.reportNumber,
        snapshotJson: report.snapshotJson,
        generatedAt: report.generatedAt,
        reviewedAt: report.reviewedAt ?? null,
      },
    }

    commitLoopWorkEntry(nextWorkEntry)
    setShowGenerateReportStep(false)
    setActiveLoopWorkEntry(null)
    onOpenGeneratedReport(report.id)
  }

  function handleMobileJobAction(entry: OnboardingFirstWorkEntry) {
    if (entry.report?.id) {
      onOpenReport(entry.report.id)
      return
    }

    setActiveLoopWorkEntry(entry)

    if (hasRequiredEvidence(entry)) {
      setShowGenerateReportStep(true)
      return
    }

    setShowAddEvidenceStep(true)
  }

  function handleContinueWorkEntry(entryId: number) {
    const selectedEntry = dashboardEntries.find((entry) => entry.id === entryId)

    if (!selectedEntry) {
      return
    }

    handleMobileJobAction(selectedEntry)
  }

  function handlePrimaryCreateAction() {
    if (!hasWorkspace) {
      setShowCreateWorkspace(true)
      return
    }

    setShowCreateJob(true)
  }

  function handleOpenFirstNeedsPhotos() {
    if (firstNeedsPhotosEntry) {
      handleMobileJobAction(firstNeedsPhotosEntry)
    }
  }

  function handleOpenFirstReadyForReport() {
    if (firstReadyForReportEntry) {
      handleMobileJobAction(firstReadyForReportEntry)
    }
  }

  if (showAddEvidenceStep && dashboard.workspace && activeLoopWorkEntry) {
    return (
      <AddEvidenceStep
        workspaceName={dashboard.workspace.name}
        workEntry={activeLoopWorkEntry}
        onUploadEvidence={handleOperationalUploadEvidence}
        onBackToDashboard={handleOperationalEvidenceBackToDashboard}
        onEvidenceReady={handleOperationalEvidenceReady}
      />
    )
  }

  if (showGenerateReportStep && dashboard.workspace && activeLoopWorkEntry) {
    return (
      <GenerateReportStep
        workspaceName={dashboard.workspace.name}
        workEntry={activeLoopWorkEntry}
        onBackToDashboard={() => {
          setShowGenerateReportStep(false)
          setActiveLoopWorkEntry(null)
        }}
        onSaveWorkEntry={handleOperationalSaveWorkEntry}
        onGenerateReport={handleOperationalGenerateReport}
        onReviewEvidence={() => {
          setShowGenerateReportStep(false)
          setShowAddEvidenceStep(true)
        }}
      />
    )
  }

  if (showCreateJob && dashboard.workspace) {
    return (
      <CreateWorkEntryStep
        mode="operational"
        workspaceName={dashboard.workspace.name}
        ownerName={userName}
        onBackToDashboard={() => setShowCreateJob(false)}
        onCreateWorkEntry={handleCreateJob}
      />
    )
  }

  return (
    <>
      <CreateWorkspaceDialog
        open={showCreateWorkspace}
        onOpenChange={setShowCreateWorkspace}
        onCreateWorkspace={handleOperationalCreateWorkspace}
      />

      <MobileOperationalHome
        entries={dashboardEntries}
        summary={summary}
        workspaceName={currentWorkspace.name}
        userName={userName}
        hasWorkspace={hasWorkspace}
        onCreateWorkspace={() => setShowCreateWorkspace(true)}
        onCreateJob={() => setShowCreateJob(true)}
        onJobAction={handleMobileJobAction}
        onOpenLatestReport={
          latestReportEntry?.reportId
            ? () => onOpenReport(latestReportEntry.reportId as number)
            : undefined
        }
      />

      <header className="page-header operational-page-header">
        <div>
          <h1 className="page-title">Good morning, {getFirstName(userName)}</h1>
          <p className="page-copy operational-page-copy">
            {showDashboardErrorState ? (
              "Saved dashboard data could not be loaded."
            ) : !hasWorkspace ? (
              "Create a workspace to start your first proof record."
            ) : dashboardEntries.length === 0 ? (
              "Start by creating your first job."
            ) : summary.proofReady > 0 ? (
              <a className="operational-page-action-link" href="/reports?status=ready-to-send">
                {formatReadyToSendSummary(summary.proofReady)}.
              </a>
            ) : summary.needsEvidence > 0 ? (
              <>
                <a className="operational-page-action-link" href="/jobs?status=active">
                  {pluralizeCount(summary.activeJobs, "active job")}
                </a>
                <span className="operational-page-copy-separator">-</span>
                <a className="operational-page-action-link" href="/jobs?status=needs-photos">
                  {formatNeedsPhotosSummary(summary.needsEvidence)}
                </a>
              </>
            ) : (
              <a className="operational-page-action-link" href="/jobs?status=active">
                {pluralizeCount(summary.activeJobs, "active job")}
              </a>
            )}
          </p>
        </div>

        <div className="dashboard-controls">
          <button className="workspace-picker" type="button">
            {currentWorkspace.name}
            <ChevronDown aria-hidden="true" size={16} />
          </button>
          <Button className="dashboard-primary-action" onClick={handlePrimaryCreateAction}>
            <Plus aria-hidden="true" size={15} />
            {hasWorkspace ? "New job" : "Create workspace"}
          </Button>
        </div>
      </header>

      <div className="dashboard-grid operational-dashboard-grid">
        <div className="primary-column operational-primary-column">
          {showDashboardErrorState ? (
            <section className="field-work-strip field-work-strip-empty dashboard-load-error-panel">
              <div className="field-work-empty-copy">
                <p className="eyebrow">Connection</p>
                <h2>Saved data could not be loaded</h2>
                <p>{dashboardLoadError}</p>
              </div>
            </section>
          ) : (
            <>
              <FieldWorkStrip
                entries={dashboardEntries}
                summary={summary}
                hasWorkspace={hasWorkspace}
                onCreateWorkspace={() => setShowCreateWorkspace(true)}
                onCreateJob={() => setShowCreateJob(true)}
                onOpenJob={handleContinueWorkEntry}
              />

              <WorkEntryList
                entries={operationalEntries}
                authToken={authToken}
                onOpenReport={onOpenReport}
                onContinueEntry={handleContinueWorkEntry}
                onViewAllJobs={() => onNavigate?.("Jobs")}
                emptyMessage={
                  hasWorkspace
                    ? "Create a job to start documenting work."
                    : "Create a workspace before adding jobs."
                }
              />
            </>
          )}
        </div>

        <aside className="right-rail operational-right-rail" aria-label="Dashboard widgets">
          <DashboardRightRail
            workspace={hasWorkspace ? currentWorkspace : null}
            jobCount={dashboardEntries.length}
            summary={summary}
            attentionItems={attentionItems}
            recentActivity={recentActivities}
            latestReportId={latestReportEntry?.reportId}
            errorMessage={showDashboardErrorState ? dashboardLoadError : null}
            onCreateWorkspace={() => setShowCreateWorkspace(true)}
            onCreateJob={() => setShowCreateJob(true)}
            onAttentionAction={handleContinueWorkEntry}
            onUploadPhotos={handleOpenFirstNeedsPhotos}
            onGenerateReport={handleOpenFirstReadyForReport}
            onOpenLatestReport={() => {
              if (latestReportEntry?.reportId) {
                onOpenReport(latestReportEntry.reportId)
              }
            }}
            onRetry={() => window.location.reload()}
          />
        </aside>
      </div>
    </>
  )
}
