import { useState } from "react"
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  ClipboardList,
  ChevronDown,
  FileText,
  FolderOpen,
  Image,
  MapPin,
  Plus,
  PlayCircle,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  CreateWorkspaceDialog,
  type CreateWorkspaceInput,
} from "@/components/dashboard/CreateWorkspaceDialog"
import {
  CreateWorkEntryStep,
  type CreateWorkEntryInput,
} from "@/components/dashboard/CreateWorkEntryStep"
import { AttentionNeeded, RecentActivity } from "@/components/dashboard/OperationalSummary"
import { StatCard } from "@/components/dashboard/StatCard"
import { WorkEntryList } from "@/components/dashboard/WorkEntryList"
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard"
import { Button } from "@/components/ui/button"
import {
  attentionItems,
  currentWorkspace,
  dashboardSummary,
  recentActivities,
  workEntries,
} from "@/data/mockFieldProof"
import {
  ONBOARDING_STEP_CONTENT,
  ONBOARDING_STEP_ORDER,
  deriveOnboardingState,
  getCompletionPercent,
  getCurrentStepNumber,
  getOnboardingStepVisualState,
} from "@/lib/onboarding"
import type { DashboardMode, WorkEntry } from "@/types/domain"
import type {
  OnboardingDashboardSnapshot,
  VisibleOnboardingStep,
} from "@/lib/onboarding"

interface DashboardPageProps {
  dashboardMode: DashboardMode
  userName: string
  onExploreDemo: () => void
  onOpenReport: (reportId: number) => void
}

type OperationalAction =
  | {
      kind: "priority"
      eyebrow: "Priority"
      title: string
      description: string
      primaryLabel: string
      secondaryLabel: string
      imageUrl: string
      entry: WorkEntry
      reportId?: never
    }
  | {
      kind: "review"
      eyebrow: "Ready for review"
      title: string
      description: string
      primaryLabel: string
      secondaryLabel: string
      imageUrl: string
      entry: WorkEntry
      reportId: number
    }

const newAccountDashboard: OnboardingDashboardSnapshot = {
  workspace: null,
  workEntryCount: 0,
  firstWorkEntry: null,
}

const onboardingStepIcons: Record<VisibleOnboardingStep, LucideIcon> = {
  CREATE_WORKSPACE: BriefcaseBusiness,
  CREATE_WORK_ENTRY: ClipboardList,
  ADD_EVIDENCE: Image,
  GENERATE_REPORT: FileText,
  REVIEW_REPORT: ShieldCheck,
}

function getFirstName(userName: string) {
  return userName.trim().split(/\s+/)[0] || "there"
}

function determineOperationalAction(): OperationalAction {
  const blockedEntry = workEntries.find((entry) => !entry.proofReady)

  if (blockedEntry) {
    return {
      kind: "priority",
      eyebrow: "Priority",
      title: `${blockedEntry.jobName} needs evidence`,
      description:
        "Add the missing job evidence so this work entry can become report-ready.",
      primaryLabel: "Open entry",
      secondaryLabel: "Review ready report",
      imageUrl: blockedEntry.thumbnailUrl,
      entry: blockedEntry,
    }
  }

  const reportEntry = workEntries.find((entry) => entry.reportId)

  if (reportEntry?.reportId) {
    return {
      kind: "review",
      eyebrow: "Ready for review",
      title: `Review the ${reportEntry.jobName} report`,
      description:
        "Confirm the saved job documentation and evidence before downloading or sharing the customer-ready report.",
      primaryLabel: "View report",
      secondaryLabel: "Open entry",
      imageUrl: reportEntry.thumbnailUrl,
      entry: reportEntry,
      reportId: reportEntry.reportId,
    }
  }

  return {
    kind: "priority",
    eyebrow: "Priority",
    title: "Create another work entry",
    description: "Start documenting the next job while the current workspace is active.",
    primaryLabel: "Create entry",
    secondaryLabel: "View reports",
    imageUrl: "/roofing-hero.png",
    entry: workEntries[0],
  }
}

export function DashboardPage({
  dashboardMode,
  userName,
  onExploreDemo,
  onOpenReport,
}: DashboardPageProps) {
  if (dashboardMode === "onboarding") {
    return <OnboardingDashboard onExploreDemo={onExploreDemo} />
  }

  return <OperationalDashboard onOpenReport={onOpenReport} userName={userName} />
}

function OnboardingDashboard({
  onExploreDemo,
}: {
  onExploreDemo: () => void
}) {
  const [dashboard, setDashboard] = useState<OnboardingDashboardSnapshot>(newAccountDashboard)
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false)
  const [showCreateWorkEntryStep, setShowCreateWorkEntryStep] = useState(false)
  const onboarding = deriveOnboardingState(dashboard)
  const visibleCurrentStep =
    onboarding.currentStep === "COMPLETE" ? "REVIEW_REPORT" : onboarding.currentStep
  const currentStepContent = ONBOARDING_STEP_CONTENT[visibleCurrentStep]
  const CurrentStepIcon = onboardingStepIcons[visibleCurrentStep]
  const ActionIcon = visibleCurrentStep === "CREATE_WORKSPACE" ? Plus : CurrentStepIcon
  const currentStepNumber = getCurrentStepNumber(onboarding)
  const completionPercent = getCompletionPercent(onboarding)

  async function handleCreateWorkspace(input: CreateWorkspaceInput) {
    setDashboard((currentDashboard) => ({
      ...currentDashboard,
      workspace: {
        id: Date.now(),
        name: input.name,
      },
    }))
    setShowCreateWorkEntryStep(true)
  }

  async function handleCreateWorkEntry(input: CreateWorkEntryInput) {
    setDashboard((currentDashboard) => ({
      ...currentDashboard,
      workEntryCount: 1,
      firstWorkEntry: {
        id: Date.now(),
        evidenceReady: false,
        jobTitle: input.jobTitle,
        propertyAddress: input.propertyAddress,
        workType: input.workType,
        workDate: input.workDate,
      },
    }))
    setShowCreateWorkEntryStep(false)
  }

  if (
    dashboard.workspace &&
    onboarding.currentStep === "CREATE_WORK_ENTRY" &&
    showCreateWorkEntryStep
  ) {
    return (
      <CreateWorkEntryStep
        workspaceName={dashboard.workspace.name}
        onBackToDashboard={() => setShowCreateWorkEntryStep(false)}
        onCreateWorkEntry={handleCreateWorkEntry}
      />
    )
  }

  return (
    <>
      <header className="page-header onboarding-header">
        <div>
          <p className="eyebrow">Welcome to FieldProof</p>
          <h1 className="page-title">Create your first proof report.</h1>
          <p className="page-copy">
            Set up your workspace, document a job, and turn Before and After
            evidence into a customer-ready report.
          </p>
        </div>

        <div className="dashboard-controls">
          <button className="notification-button" type="button" aria-label="View notifications">
            <Bell aria-hidden="true" size={18} />
            <span>2</span>
          </button>
          <span className="workspace-status-pill">
            {dashboard.workspace?.name ?? "No workspace selected"}
          </span>
        </div>
      </header>

      <div className="dashboard-grid onboarding-grid">
        <div className="primary-column">
          <section className="card hero-card onboarding-hero-card">
            <div className="hero-copy">
              <p className="eyebrow">
                {currentStepContent.eyebrow} - {currentStepNumber} of {onboarding.totalSteps}
              </p>
              <h2>{currentStepContent.title}</h2>
              <p>{currentStepContent.description}</p>
              <div className="onboarding-hero-actions">
                <Button
                  onClick={() => {
                    if (visibleCurrentStep === "CREATE_WORKSPACE") {
                      setWorkspaceDialogOpen(true)
                      return
                    }

                    if (visibleCurrentStep === "CREATE_WORK_ENTRY") {
                      setShowCreateWorkEntryStep(true)
                    }
                  }}
                >
                  <ActionIcon aria-hidden="true" size={17} />
                  {currentStepContent.actionLabel}
                </Button>
                {currentStepContent.secondaryLabel ? (
                  <button className="hero-secondary-action" type="button" onClick={onExploreDemo}>
                    {currentStepContent.secondaryLabel}
                    <span aria-hidden="true">-&gt;</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="hero-media onboarding-hero-media" aria-hidden="true">
              <img src={currentStepContent.image} alt="" />
            </div>
          </section>

          <section className="card onboarding-progress-card">
            <div className="onboarding-progress-header">
              <p className="eyebrow">First report workflow</p>
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
                const stepContent = ONBOARDING_STEP_CONTENT[step]
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
                    <h3>{stepContent.title}</h3>
                    <p>{stepContent.description}</p>
                    {stepState === "current" ? <small>Current step</small> : null}
                  </div>
                </article>
                )
              })}
            </div>
          </section>

          <section className="onboarding-empty-grid">
            <article className="card empty-dashboard-card">
              <p className="eyebrow">Recent work entries</p>
              <h3>No work entries yet</h3>
              <p>Jobs will appear here after you create your workspace.</p>
            </article>
            <article className="card empty-dashboard-card">
              <p className="eyebrow">Recent reports</p>
              <h3>No reports yet</h3>
              <p>Generated customer reports will appear here.</p>
            </article>
          </section>
        </div>

        <aside className="right-rail">
          <section className="card section-card onboarding-help-card">
            <p className="eyebrow">What happens next</p>
            <p className="card-copy">
              After creating your workspace, you&apos;ll add your first job and
              begin documenting evidence.
            </p>
            <p className="context-support-copy">
              FieldProof will guide each step automatically as your first report
              comes together.
            </p>
            <div className="onboarding-help-link">
              <p className="eyebrow">Need help?</p>
              <button className="hero-secondary-action" type="button">
                <PlayCircle aria-hidden="true" size={17} />
                Watch 60-second walkthrough
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </section>
        </aside>
      </div>

      <CreateWorkspaceDialog
        open={workspaceDialogOpen}
        onOpenChange={setWorkspaceDialogOpen}
        onCreateWorkspace={handleCreateWorkspace}
      />
    </>
  )
}

function OperationalDashboard({
  userName,
  onOpenReport,
}: {
  userName: string
  onOpenReport: (reportId: number) => void
}) {
  const action = determineOperationalAction()
  const readyReport = workEntries.find((entry) => entry.reportId)
  const readyReportId = readyReport?.reportId

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-title">Welcome back, {getFirstName(userName)}.</h1>
          <p className="page-copy">
            Here is what needs attention and where your active jobs stand today.
          </p>
        </div>

        <div className="dashboard-controls">
          <button className="notification-button" type="button" aria-label="View notifications">
            <Bell aria-hidden="true" size={18} />
            <span>2</span>
          </button>
          <button className="workspace-picker" type="button">
            {currentWorkspace.name}
            <ChevronDown aria-hidden="true" size={16} />
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="primary-column">
          <section className="card hero-card">
            <div className="hero-copy">
              <p className="eyebrow">{action.eyebrow}</p>
              <h2>{action.title}</h2>
              <p className="hero-context">
                <MapPin aria-hidden="true" size={15} />
                <span>{action.entry.jobAddress}</span>
                <span>{action.entry.reportNumber ?? "No report yet"}</span>
              </p>
              <p>{action.description}</p>
            </div>

            <div className="hero-media" aria-hidden="true">
              <img src={action.imageUrl} alt="" />
            </div>

            <div className="hero-actions">
              {action.kind === "review" ? (
                <Button onClick={() => onOpenReport(action.reportId)}>
                  <FileText aria-hidden="true" size={17} />
                  {action.primaryLabel}
                </Button>
              ) : (
                <Button>
                  <FolderOpen aria-hidden="true" size={17} />
                  {action.primaryLabel}
                </Button>
              )}

              {typeof readyReportId === "number" && action.kind === "priority" ? (
                <button
                  className="hero-secondary-action"
                  type="button"
                  onClick={() => onOpenReport(readyReportId)}
                >
                  {action.secondaryLabel}
                  <span aria-hidden="true">-&gt;</span>
                </button>
              ) : (
                <button className="hero-secondary-action" type="button">
                  {action.secondaryLabel}
                  <span aria-hidden="true">-&gt;</span>
                </button>
              )}
            </div>
          </section>

          <section className="card metrics-row metric-strip">
            <StatCard
              icon={Wrench}
              label="Active jobs"
              value={String(dashboardSummary.activeJobs)}
              helper="In progress"
            />
            <StatCard
              icon={AlertTriangle}
              label="Needs evidence"
              value={String(dashboardSummary.needsEvidence)}
              helper="Attention needed"
            />
            <StatCard
              icon={ShieldCheck}
              label="Ready for review"
              value={String(dashboardSummary.proofReady)}
              helper="Proof complete"
            />
            <StatCard
              icon={FileText}
              label="Reports generated"
              value={String(dashboardSummary.reportsGenerated)}
              helper="This month"
            />
          </section>

          <WorkEntryList entries={workEntries} onOpenReport={onOpenReport} />
        </div>

        <aside className="right-rail">
          <AttentionNeeded items={attentionItems} />
          <WorkspaceCard workspace={currentWorkspace} />
          <RecentActivity items={recentActivities} />
        </aside>
      </div>
    </>
  )
}
