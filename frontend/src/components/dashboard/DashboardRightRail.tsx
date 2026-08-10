import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileText,
  Image,
  Plus,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  ActivityItem,
  AttentionItem,
  DashboardSummary,
  Workspace,
} from "@/types/domain"

type RightRailState = "ERROR" | "NO_WORKSPACE" | "NO_JOBS" | "OPERATIONAL"

interface DashboardRightRailProps {
  workspace: Workspace | null
  jobCount: number
  summary: DashboardSummary
  attentionItems: AttentionItem[]
  recentActivity: ActivityItem[]
  latestReportId?: number
  errorMessage?: string | null
  onCreateWorkspace: () => void
  onCreateJob: () => void
  onAttentionAction: (entryId: number) => void
  onUploadPhotos: () => void
  onGenerateReport: () => void
  onOpenLatestReport: () => void
  onRetry: () => void
}

function getRightRailState(
  workspace: Workspace | null,
  jobCount: number,
  errorMessage?: string | null,
): RightRailState {
  if (errorMessage) {
    return "ERROR"
  }

  if (!workspace) {
    return "NO_WORKSPACE"
  }

  if (jobCount === 0) {
    return "NO_JOBS"
  }

  return "OPERATIONAL"
}

function RailErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage: string
  onRetry: () => void
}) {
  return (
    <section className="rail-panel-section right-rail-error-section">
      <p className="eyebrow">Connection</p>
      <div className="right-rail-section-copy">
        <h3>Saved data could not be loaded</h3>
        <p>{errorMessage}</p>
      </div>
      <Button className="right-rail-primary-action" type="button" onClick={onRetry}>
        Retry
      </Button>
    </section>
  )
}

function getActivityIcon(tone: ActivityItem["tone"]) {
  if (tone === "success") return CheckCircle2
  if (tone === "report") return FileText

  return Camera
}

function SetupStep({
  complete,
  label,
}: {
  complete: boolean
  label: string
}) {
  return (
    <li className="right-rail-setup-step" data-complete={complete}>
      <span aria-hidden="true">
        {complete ? <CheckCircle2 size={13} /> : null}
      </span>
      <strong>{label}</strong>
    </li>
  )
}

function SetupProgress({
  onCreateWorkspace,
}: {
  onCreateWorkspace: () => void
}) {
  return (
    <>
      <section className="rail-panel-section right-rail-setup-section">
        <p className="eyebrow">Get started</p>
        <div className="right-rail-section-copy">
          <h3>Set up FieldProof</h3>
        </div>

        <ol className="right-rail-setup-list">
          <SetupStep complete label="Account created" />
          <SetupStep complete={false} label="Create workspace" />
          <SetupStep complete={false} label="Create first job" />
          <SetupStep complete={false} label="Add job photos" />
          <SetupStep complete={false} label="Generate first report" />
        </ol>

        <Button className="right-rail-primary-action" type="button" onClick={onCreateWorkspace}>
          <BriefcaseBusiness aria-hidden="true" size={15} />
          Create workspace
        </Button>
      </section>

      <section className="rail-panel-section right-rail-link-section">
        <button className="right-rail-text-link" type="button" onClick={onCreateWorkspace}>
          Setup guide
          <ChevronRight aria-hidden="true" size={15} />
        </button>
      </section>
    </>
  )
}

function FirstJobProgress({
  workspace,
  onCreateJob,
}: {
  workspace: Workspace
  onCreateJob: () => void
}) {
  return (
    <>
      <section className="rail-panel-section right-rail-setup-section">
        <p className="eyebrow">Next step</p>
        <div className="right-rail-section-copy">
          <h3>Create your first job</h3>
        </div>

        <ol className="right-rail-setup-list">
          <SetupStep complete label="Workspace ready" />
          <SetupStep complete={false} label="Create first job" />
          <SetupStep complete={false} label="Add photos" />
          <SetupStep complete={false} label="Generate report" />
        </ol>

        <Button className="right-rail-primary-action" type="button" onClick={onCreateJob}>
          <Plus aria-hidden="true" size={15} />
          Create first job
        </Button>
      </section>

      <section className="rail-panel-section right-rail-workspace-confirmation">
        <p className="eyebrow">Workspace</p>
        <div>
          <strong>{workspace.name}</strong>
          <span>{workspace.memberCount} member</span>
        </div>
      </section>
    </>
  )
}

function NeedsAttentionSection({
  items,
  onAttentionAction,
}: {
  items: AttentionItem[]
  onAttentionAction: (entryId: number) => void
}) {
  if (items.length === 0) {
    return null
  }

  const visibleItems = items.slice(0, 3)

  return (
    <section className="rail-panel-section right-rail-attention-section">
      <div className="right-rail-section-heading">
        <p className="eyebrow">Needs attention</p>
        <span>{items.length}</span>
      </div>

      <div className="right-rail-attention-list">
        {visibleItems.map((item) => (
          <button
            className="right-rail-attention-item"
            type="button"
            key={item.id}
            onClick={() => onAttentionAction(item.id)}
          >
            <span className={`attention-status-dot attention-status-dot-${item.tone}`} />
            <span className="rail-item-copy">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </span>
            <span className="right-rail-action-label">
              {item.actionLabel}
              <ChevronRight aria-hidden="true" size={13} />
            </span>
          </button>
        ))}
      </div>

      {items.length > visibleItems.length ? (
        <a className="right-rail-text-link" href="/jobs?status=needs-attention">
          View all
          <ChevronRight aria-hidden="true" size={15} />
        </a>
      ) : null}
    </section>
  )
}

function QuickActions({
  summary,
  latestReportId,
  onCreateJob,
  onUploadPhotos,
  onGenerateReport,
  onOpenLatestReport,
}: {
  summary: DashboardSummary
  latestReportId?: number
  onCreateJob: () => void
  onUploadPhotos: () => void
  onGenerateReport: () => void
  onOpenLatestReport: () => void
}) {
  return (
    <section className="rail-panel-section quick-actions-card">
      <p className="eyebrow">Quick actions</p>
      <div className="quick-action-list">
        <button type="button" onClick={onCreateJob}>
          <Plus aria-hidden="true" size={15} />
          <span>New job</span>
        </button>
        {summary.needsEvidence > 0 ? (
          <button type="button" onClick={onUploadPhotos}>
            <Image aria-hidden="true" size={15} />
            <span>Upload photos</span>
          </button>
        ) : null}
        {summary.readyForReport > 0 ? (
          <button type="button" onClick={onGenerateReport}>
            <ShieldCheck aria-hidden="true" size={15} />
            <span>Generate report</span>
          </button>
        ) : null}
        {latestReportId ? (
          <button type="button" onClick={onOpenLatestReport}>
            <FileText aria-hidden="true" size={15} />
            <span>View reports</span>
          </button>
        ) : null}
      </div>
    </section>
  )
}

function RecentActivitySection({ items }: { items: ActivityItem[] }) {
  const visibleItems = items.slice(0, 3)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <section className="rail-panel-section right-rail-activity-section">
      <p className="eyebrow">Recent activity</p>

      <div className="rail-list">
        {visibleItems.map((item) => {
          const Icon = getActivityIcon(item.tone)

          return (
            <div className="rail-list-item activity-item" key={item.id}>
              <span className={`rail-icon rail-icon-${item.tone}`}>
                <Icon aria-hidden="true" size={15} />
              </span>
              <span className="rail-item-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function DashboardRightRail({
  workspace,
  jobCount,
  summary,
  attentionItems,
  recentActivity,
  latestReportId,
  errorMessage,
  onCreateWorkspace,
  onCreateJob,
  onAttentionAction,
  onUploadPhotos,
  onGenerateReport,
  onOpenLatestReport,
  onRetry,
}: DashboardRightRailProps) {
  const state = getRightRailState(workspace, jobCount, errorMessage)

  return (
    <section className="card section-card operational-rail-panel dashboard-right-rail">
      {state === "ERROR" && errorMessage ? (
        <RailErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : null}

      {state === "NO_WORKSPACE" ? (
        <SetupProgress onCreateWorkspace={onCreateWorkspace} />
      ) : null}

      {state === "NO_JOBS" && workspace ? (
        <FirstJobProgress workspace={workspace} onCreateJob={onCreateJob} />
      ) : null}

      {state === "OPERATIONAL" ? (
        <>
          <NeedsAttentionSection
            items={attentionItems}
            onAttentionAction={onAttentionAction}
          />
          <QuickActions
            summary={summary}
            latestReportId={latestReportId}
            onCreateJob={onCreateJob}
            onUploadPhotos={onUploadPhotos}
            onGenerateReport={onGenerateReport}
            onOpenLatestReport={onOpenLatestReport}
          />
          <RecentActivitySection items={recentActivity} />
        </>
      ) : null}
    </section>
  )
}
