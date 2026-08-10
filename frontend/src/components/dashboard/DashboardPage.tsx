import {
  useEffect,
  useId,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import {
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
import type { CreateWorkspaceInput } from "@/components/dashboard/CreateWorkspaceDialog"
import {
  CreateWorkEntryStep,
  type CreateWorkEntryCompletion,
  type CreateWorkEntryInput,
} from "@/components/dashboard/CreateWorkEntryStep"
import { FieldWorkStrip } from "@/components/dashboard/FieldWorkStrip"
import { GenerateReportStep } from "@/components/dashboard/GenerateReportStep"
import {
  AttentionNeeded,
  RecentActivity,
} from "@/components/dashboard/OperationalSummary"
import { WorkEntryList } from "@/components/dashboard/WorkEntryList"
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard"
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

function getOnboardingTaskSideTitle(step: VisibleOnboardingStep) {
  if (step === "CREATE_WORKSPACE") {
    return "What this unlocks"
  }

  if (step === "CREATE_WORK_ENTRY") {
    return "Job record includes"
  }

  if (step === "ADD_EVIDENCE") {
    return "Photo requirements"
  }

  if (step === "GENERATE_REPORT") {
    return "Report snapshot"
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
      onOpenReport={onOpenReport}
      onOpenGeneratedReport={onOpenGeneratedReport}
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

function buildOperationalEntries(
  entries: OnboardingFirstWorkEntry[],
): WorkEntry[] {
  return entries.map((entry) => {
    const proofReady = hasRequiredEvidence(entry)
    const report = entry.report
    const photoCount = entry.evidence?.length ?? 0

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
      thumbnailUrl: entry.evidence?.find((item) => item.previewUrl)?.previewUrl
        ?? "/images/onboarding/step-5-review-report.png",
      updatedLabel: formatShortDate(entry.workDate),
      photoCount,
      photos: (entry.evidence ?? []).map((item) => ({
        id: item.id,
        category: item.category,
        caption: item.caption,
        uploadedAt: item.createdAt,
        previewUrl: item.previewUrl,
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
        tone: "warning",
      })
      return
    }

    if (!entry.report) {
      items.push({
        id: entry.id,
        title: entry.jobTitle ?? "Untitled job",
        detail: "Job documentation is ready for a proof report",
        tone: "info",
      })
      return
    }

    if (entry.report.status !== "SHARED") {
      items.push({
        id: entry.id,
        title: entry.jobTitle ?? "Untitled job",
        detail: "Proof report is ready to send",
        tone: "info",
      })
    }
  })

  if (items.length === 0) {
    return [{
      id: 0,
      title: "No jobs currently require attention.",
      detail: "New issues will appear here as jobs change.",
      tone: "info",
    }]
  }

  return items.slice(0, 3)
}

function buildRecentActivities(
  entries: OnboardingFirstWorkEntry[],
): ActivityItem[] {
  if (entries.length === 0) {
    return [{
      id: 0,
      title: "No activity yet",
      detail: "Create a job to start building the workspace history.",
      tone: "neutral",
    }]
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

function getMobileHomeSummary(summary: DashboardSummary, entryCount: number) {
  if (summary.proofReady > 0) {
    return pluralizeCount(summary.proofReady, "report", "reports") + " ready to send."
  }

  if (summary.needsEvidence > 0) {
    return pluralizeCount(summary.needsEvidence, "job", "jobs") + " need photos."
  }

  if (entryCount === 0) {
    return "Create your first proof record."
  }

  return "No jobs need attention right now."
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
      title: "Create the first job record",
      detail:
        "The job becomes the source of truth for the property, planned scope, photos, and report snapshot.",
      outcome:
        "After the job is created, FieldProof opens the photo step instead of dropping you back into an empty dashboard.",
      items: [
        {
          label: "Customer and property",
          detail: "Tell the report who the job belongs to and where the work happens.",
          complete: Boolean(firstEntry?.customerName && firstEntry.propertyAddress),
        },
        {
          label: "Job type and schedule",
          detail: "Capture the trade category and schedule details when known.",
          complete: Boolean(firstEntry?.workType),
        },
        {
          label: "Job page",
          detail: "Photos and report readiness unlock after creation.",
          complete: Boolean(firstEntry),
        },
      ],
    }
  }

  if (currentStep === "ADD_EVIDENCE") {
    return {
      title: `Add proof photos for ${jobLabel}`,
      detail:
        "Upload clear Before and After photos so the report can show the original condition and completed outcome.",
      outcome:
        "Once both required photo stages exist, FieldProof will move this job into report generation.",
      items: [
        {
          label: "Before photo",
          detail: "Shows the condition before work begins.",
          complete: hasBeforePhoto,
        },
        {
          label: "After photo",
          detail: "Shows the completed condition after work is finished.",
          complete: hasAfterPhoto,
        },
        {
          label: "Useful captions",
          detail: "Explain what each photo proves for the customer.",
          complete: hasCaption,
        },
      ],
    }
  }

  if (currentStep === "GENERATE_REPORT") {
    return {
      title: "Lock the job into a proof report",
      detail:
        "Review the saved job summary and photos before FieldProof creates the immutable customer-ready snapshot.",
      outcome:
        "After generation, the report opens for review with download, print, and share actions.",
      items: [
        {
          label: "Job documentation",
          detail: "Work summary is ready to save into the report.",
          complete: hasWorkSummary,
        },
        {
          label: "Before and After photos",
          detail: "Required photo stages are attached.",
          complete: hasBeforePhoto && hasAfterPhoto,
        },
        {
          label: "Saved snapshot",
          detail: "Generate the first proof report.",
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
  const [workspaceName, setWorkspaceName] = useState("")
  const [workspaceInlineError, setWorkspaceInlineError] = useState<string | null>(null)
  const [workspaceSubmitting, setWorkspaceSubmitting] = useState(false)
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
      detail: `${organization.name} is ready. Next, create your first job.`,
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
              <p>
                Create the company workspace where your jobs, photos, crew activity,
                and proof reports will live.
              </p>

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
              <p className="onboarding-card-label">Report preview</p>
              <div className="onboarding-report-preview-page">
                <div className="onboarding-report-preview-header">
                  <span>{(workspaceName.trim()[0] ?? "F").toUpperCase()}</span>
                  <div>
                    <strong>{workspaceName.trim() || "Your company name"}</strong>
                    <small>Workspace setup</small>
                  </div>
                </div>
                <div className="onboarding-report-preview-lines" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p>
                  Your company name appears on FieldProof jobs and customer-facing
                  proof reports. Full profile and branding fields come later.
                </p>
              </div>
            </aside>
          </form>
        ) : (
          <section className="card onboarding-task-card" aria-live="polite">
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
  onJobAction,
  onOpenLatestReport,
}: {
  entries: OnboardingFirstWorkEntry[]
  summary: DashboardSummary
  workspaceName: string
  userName: string
  onCreateJob: () => void
  onJobAction: (entry: OnboardingFirstWorkEntry) => void
  onOpenLatestReport?: () => void
}) {
  const attentionEntries = entries
    .filter((entry) => {
      if (!hasRequiredEvidence(entry)) return true
      if (!entry.report) return true

      return entry.report.status !== "SHARED"
    })
    .slice(0, 3)
  const recentEntries = entries.slice(0, 4)

  function scrollToRecentJobs() {
    document
      .getElementById("mobile-recent-jobs")
      ?.scrollIntoView({ block: "start", behavior: "smooth" })
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

      <section className="mobile-home-hero">
        <p>Good morning, {getFirstName(userName)}</p>
        <h1>{getMobileHomeSummary(summary, entries.length)}</h1>
        <Button className="mobile-create-job-button" type="button" onClick={onCreateJob}>
          <Plus aria-hidden="true" size={17} />
          Create new job
        </Button>
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
          </div>

          <div className="mobile-job-card-list">
            {recentEntries.map((entry) => (
              <article className="mobile-job-card" key={entry.id}>
                <div className="mobile-job-card-main">
                  <h2>{entry.jobTitle ?? "Untitled job"}</h2>
                  <p>{entry.propertyAddress ?? "No property address added"}</p>
                  <span>
                    {getMobileJobStatus(entry)} - {getPhotoCount(entry)} -{" "}
                    {formatShortDate(entry.workDate)}
                  </span>
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

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <button className="active" type="button">
          <Home aria-hidden="true" size={18} />
          Home
        </button>
        <button type="button" onClick={scrollToRecentJobs}>
          <ClipboardList aria-hidden="true" size={18} />
          Jobs
        </button>
        <button className="mobile-bottom-nav-primary" type="button" onClick={onCreateJob}>
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
  userName,
  onOpenReport,
  onOpenGeneratedReport,
}: {
  dashboard: OnboardingDashboardSnapshot
  setDashboard: Dispatch<SetStateAction<OnboardingDashboardSnapshot>>
  authToken: string
  userName: string
  onOpenReport: (reportId: number) => void
  onOpenGeneratedReport: (reportId: number) => void
}) {
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
  const latestReportEntry = operationalEntries.find((entry) => typeof entry.reportId === "number")

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
      <MobileOperationalHome
        entries={dashboardEntries}
        summary={summary}
        workspaceName={currentWorkspace.name}
        userName={userName}
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
            {dashboardEntries.length === 0 ? (
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
          <Button className="dashboard-primary-action" onClick={() => setShowCreateJob(true)}>
            <Plus aria-hidden="true" size={15} />
            New job
          </Button>
        </div>
      </header>

      <div className="dashboard-grid operational-dashboard-grid">
        <div className="primary-column operational-primary-column">
          <FieldWorkStrip
            entries={dashboardEntries}
            summary={summary}
            onCreateJob={() => setShowCreateJob(true)}
            onOpenJob={handleContinueWorkEntry}
          />

          <WorkEntryList
            entries={operationalEntries}
            onOpenReport={onOpenReport}
            onContinueEntry={handleContinueWorkEntry}
          />
        </div>

        <aside className="right-rail operational-right-rail" aria-label="Dashboard widgets">
          <section className="card section-card operational-rail-panel">
            <AttentionNeeded items={attentionItems} />
            <section className="rail-panel-section quick-actions-card">
              <p className="eyebrow">Quick actions</p>
              <div className="quick-action-list">
                <button type="button" onClick={() => setShowCreateJob(true)}>
                  <Plus aria-hidden="true" size={15} />
                  <span>Create job</span>
                </button>
                <button type="button" disabled>
                  <Image aria-hidden="true" size={15} />
                  <span>Upload photos</span>
                </button>
                <button type="button" disabled={summary.readyForReport === 0}>
                  <ShieldCheck aria-hidden="true" size={15} />
                  <span>Generate report</span>
                </button>
                <button
                  type="button"
                  disabled={!latestReportEntry?.reportId}
                  onClick={() => {
                    if (latestReportEntry?.reportId) {
                      onOpenReport(latestReportEntry.reportId)
                    }
                  }}
                >
                  <FileText aria-hidden="true" size={15} />
                  <span>View reports</span>
                </button>
              </div>
            </section>
          </section>
          <WorkspaceCard workspace={currentWorkspace} />
          <RecentActivity items={recentActivities} />
        </aside>
      </div>
    </>
  )
}
