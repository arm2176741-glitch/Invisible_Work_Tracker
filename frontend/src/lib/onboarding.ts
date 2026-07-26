export type OnboardingStep =
  | "CREATE_WORKSPACE"
  | "CREATE_WORK_ENTRY"
  | "ADD_EVIDENCE"
  | "GENERATE_REPORT"
  | "REVIEW_REPORT"
  | "COMPLETE"

export interface OnboardingReportSummary {
  id: number
  reviewedAt?: string | null
}

export interface OnboardingFirstWorkEntry {
  id: number
  evidenceReady: boolean
  jobTitle?: string
  propertyAddress?: string
  workType?: string
  workDate?: string
  report?: OnboardingReportSummary | null
}

export interface OnboardingWorkspaceSummary {
  id: number
  name: string
}

export interface OnboardingDashboardSnapshot {
  workspace: OnboardingWorkspaceSummary | null
  workEntryCount: number
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
      "Set up the company where jobs, crew members, evidence, and reports will live.",
    actionLabel: "Create workspace",
    secondaryLabel: "Explore demo workspace",
    image: "/roofing-hero.png",
  },
  CREATE_WORK_ENTRY: {
    eyebrow: "Current step",
    title: "Create your first work entry",
    description:
      "Record the property, work type, scheduled date, and planned scope.",
    actionLabel: "Create work entry",
    image: "/roofing-hero.png",
  },
  ADD_EVIDENCE: {
    eyebrow: "Current step",
    title: "Add Before and After evidence",
    description:
      "Document the job with at least one Before photo and one After photo.",
    actionLabel: "Add evidence",
    image: "/roofing-hero.png",
  },
  GENERATE_REPORT: {
    eyebrow: "Current step",
    title: "Generate your first proof report",
    description:
      "Create a stable customer-ready record from the job documentation and evidence.",
    actionLabel: "Generate report",
    image: "/roofing-hero.png",
  },
  REVIEW_REPORT: {
    eyebrow: "Final step",
    title: "Review your first report",
    description:
      "Confirm the documentation and evidence before downloading or sharing the report.",
    actionLabel: "View report",
    image: "/roofing-hero.png",
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

  if (!firstEntry.evidenceReady) {
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
