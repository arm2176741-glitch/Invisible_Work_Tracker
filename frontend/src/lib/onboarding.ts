export type EvidenceCategory = "BEFORE" | "DURING" | "AFTER"

export interface OnboardingEvidenceItem {
  id: number
  category: EvidenceCategory
  caption: string
  fileName?: string
  fileSizeBytes?: number
  previewUrl?: string
  contentUrl?: string
  createdAt: string
}

export type OnboardingStep =
  | "CREATE_WORKSPACE"
  | "CREATE_WORK_ENTRY"
  | "ADD_EVIDENCE"
  | "GENERATE_REPORT"
  | "REVIEW_REPORT"
  | "COMPLETE"

export interface OnboardingReportSummary {
  id: number
  status?: "GENERATED" | "SHARED"
  reportNumber?: string
  snapshotJson?: string
  generatedAt?: string
  reviewedAt?: string | null
}

export interface OnboardingFirstWorkEntry {
  id: number
  evidenceReady?: boolean
  evidence?: OnboardingEvidenceItem[]
  jobTitle?: string
  propertyAddress?: string
  customerName?: string
  customerPhone?: string | null
  customerEmail?: string | null
  customerContactName?: string | null
  workType?: string
  workDate?: string | null
  scheduledStartTime?: string | null
  arrivalWindow?: string | null
  estimatedDuration?: string | null
  assignedCrew?: string | null
  siteAccessNotes?: string | null
  internalNotes?: string | null
  status?: "DRAFT" | "SUBMITTED" | "COMPLETED"
  plannedScope?: string
  workPerformedSummary?: string
  description?: string
  report?: OnboardingReportSummary | null
}

export interface OnboardingWorkspaceSummary {
  id: number
  name: string
}

export interface OnboardingDashboardSnapshot {
  workspace: OnboardingWorkspaceSummary | null
  workEntryCount: number
  workEntries?: OnboardingFirstWorkEntry[]
  firstWorkEntry?: OnboardingFirstWorkEntry | null
}

export interface OnboardingState {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  completedCount: number
  totalSteps: number
  onboardingComplete: boolean
  targetEntityId?: number
}

export interface OnboardingStepContent {
  eyebrow: string
  title: string
  description: string
  actionLabel: string
  secondaryLabel?: string
  image: string
}

export type VisibleOnboardingStep = Exclude<OnboardingStep, "COMPLETE">

export type OnboardingStepVisualState = "completed" | "current" | "upcoming"

export const ONBOARDING_STEP_ORDER: VisibleOnboardingStep[] = [
  "CREATE_WORKSPACE",
  "CREATE_WORK_ENTRY",
  "ADD_EVIDENCE",
  "GENERATE_REPORT",
  "REVIEW_REPORT",
]

export const ONBOARDING_STEP_CONTENT: Record<VisibleOnboardingStep, OnboardingStepContent> = {
  CREATE_WORKSPACE: {
    eyebrow: "Current step",
    title: "Create your workspace",
    description:
      "Set up the company container for your jobs, crew, photos, and reports.",
    actionLabel: "Create workspace",
    image: "/images/onboarding/step-1-create-workspace.png",
  },
  CREATE_WORK_ENTRY: {
    eyebrow: "Current step",
    title: "Create your first job",
    description: "Add the property and scope. You can fill in the rest later.",
    actionLabel: "Start first job",
    image: "/images/onboarding/step-2-create-entry.png",
  },
  ADD_EVIDENCE: {
    eyebrow: "Current step",
    title: "Add before and after photos",
    description:
      "Upload clear jobsite photos so the report shows the property condition before work and the completed result after work.",
    actionLabel: "Add photos",
    image: "/images/onboarding/step-3-add-evidence.png",
  },
  GENERATE_REPORT: {
    eyebrow: "Current step",
    title: "Generate your first proof report",
    description:
      "Review what will be locked into the saved report snapshot before generating it.",
    actionLabel: "Generate final report",
    image: "/images/onboarding/step-4-generate-report.png",
  },
  REVIEW_REPORT: {
    eyebrow: "Final step",
    title: "Review your first report",
    description:
      "Inspect the customer-ready document, then download, print, or share it.",
    actionLabel: "View report",
    image: "/images/onboarding/step-5-review-report.png",
  },
}

function buildOnboardingState(
  currentStep: OnboardingStep,
  completedSteps: OnboardingStep[],
  targetEntityId?: number,
): OnboardingState {
  return {
    currentStep,
    completedSteps,
    completedCount: completedSteps.length,
    totalSteps: ONBOARDING_STEP_ORDER.length,
    onboardingComplete: currentStep === "COMPLETE",
    targetEntityId,
  }
}

export function deriveOnboardingState(
  dashboard: OnboardingDashboardSnapshot,
): OnboardingState {
  if (!dashboard.workspace) {
    return buildOnboardingState("CREATE_WORKSPACE", [])
  }

  if (dashboard.workEntryCount === 0 || !dashboard.firstWorkEntry) {
    return buildOnboardingState("CREATE_WORK_ENTRY", ["CREATE_WORKSPACE"])
  }

  const firstEntry = dashboard.firstWorkEntry

  if (!hasRequiredEvidence(firstEntry)) {
    return buildOnboardingState(
      "ADD_EVIDENCE",
      ["CREATE_WORKSPACE", "CREATE_WORK_ENTRY"],
      firstEntry.id,
    )
  }

  if (!firstEntry.report) {
    return buildOnboardingState(
      "GENERATE_REPORT",
      ["CREATE_WORKSPACE", "CREATE_WORK_ENTRY", "ADD_EVIDENCE"],
      firstEntry.id,
    )
  }

  if (!firstEntry.report.reviewedAt) {
    return buildOnboardingState(
      "REVIEW_REPORT",
      ["CREATE_WORKSPACE", "CREATE_WORK_ENTRY", "ADD_EVIDENCE", "GENERATE_REPORT"],
      firstEntry.report.id,
    )
  }

  return buildOnboardingState("COMPLETE", [...ONBOARDING_STEP_ORDER])
}

export function hasRequiredEvidence(entry: OnboardingFirstWorkEntry) {
  const evidence = entry.evidence ?? []
  const hasBefore = evidence.some((item) => item.category === "BEFORE")
  const hasAfter = evidence.some((item) => item.category === "AFTER")

  return hasBefore && hasAfter
}

export function getCurrentStepNumber(onboarding: OnboardingState) {
  if (onboarding.onboardingComplete) {
    return onboarding.totalSteps
  }

  return Math.min(onboarding.completedCount + 1, onboarding.totalSteps)
}

export function getCompletionPercent(onboarding: OnboardingState) {
  return (onboarding.completedCount / onboarding.totalSteps) * 100
}

export function getOnboardingStepVisualState(
  onboarding: OnboardingState,
  step: VisibleOnboardingStep,
): OnboardingStepVisualState {
  if (onboarding.completedSteps.includes(step)) {
    return "completed"
  }

  if (onboarding.currentStep === step) {
    return "current"
  }

  return "upcoming"
}
