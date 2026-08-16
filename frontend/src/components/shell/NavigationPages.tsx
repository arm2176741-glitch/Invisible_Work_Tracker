import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileText,
  Mail,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react"
import type { ReactNode } from "react"

import { WorkEntryList } from "@/components/dashboard/WorkEntryList"
import { Button } from "@/components/ui/button"
import { hasRequiredEvidence } from "@/lib/onboarding"
import type {
  OnboardingDashboardSnapshot,
  OnboardingFirstWorkEntry,
} from "@/lib/onboarding"
import type { AppView } from "@/lib/navigation"
import type { DashboardSummary, ReportStatus, WorkEntry } from "@/types/domain"

interface NavigationPagesProps {
  view: AppView
  userName: string
  authToken: string
  dashboard: OnboardingDashboardSnapshot
  dashboardLoadError: string | null
  routeSearch: string
  onNavigate: (view: AppView) => void
  onOpenReport: (reportId: number) => void
}

interface ReportRow {
  id: number
  reportNumber: string
  jobName: string
  jobAddress: string
  status: ReportStatus
  generatedAt?: string
  photoCount: number
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

function buildDashboardSummary(entries: OnboardingFirstWorkEntry[]): DashboardSummary {
  return {
    activeJobs: entries.filter((entry) => entry.status !== "COMPLETED").length,
    needsEvidence: entries.filter((entry) => !hasRequiredEvidence(entry)).length,
    readyForReport: entries.filter((entry) => hasRequiredEvidence(entry) && !entry.report).length,
    proofReady: entries.filter((entry) => entry.report && entry.report.status !== "SHARED").length,
    reportsGenerated: entries.filter((entry) => entry.report).length,
  }
}

function getReportRows(entries: OnboardingFirstWorkEntry[]): ReportRow[] {
  return entries
    .flatMap((entry) => {
      if (!entry.report?.id) {
        return []
      }

      return [{
        id: entry.report.id,
        reportNumber: entry.report.reportNumber ?? `Report ${entry.report.id}`,
        jobName: entry.jobTitle ?? "Untitled job",
        jobAddress: entry.propertyAddress ?? "No property address added",
        status: entry.report.status ?? "GENERATED",
        generatedAt: entry.report.generatedAt,
        photoCount: entry.evidence?.length ?? 0,
      }]
    })
    .sort((firstReport, secondReport) =>
      (secondReport.generatedAt ?? "").localeCompare(firstReport.generatedAt ?? ""),
    )
}

function getJobFilter(search: string) {
  return new URLSearchParams(search).get("status")
}

function filterEntries(
  entries: OnboardingFirstWorkEntry[],
  filter: string | null,
) {
  if (filter === "needs-photos" || filter === "needs-attention") {
    return entries.filter((entry) => !hasRequiredEvidence(entry))
  }

  if (filter === "ready-for-report") {
    return entries.filter((entry) => hasRequiredEvidence(entry) && !entry.report)
  }

  if (filter === "ready-to-send") {
    return entries.filter((entry) => entry.report && entry.report.status !== "SHARED")
  }

  if (filter === "active") {
    return entries.filter((entry) => entry.status !== "COMPLETED")
  }

  return entries
}

function getFilterTitle(filter: string | null) {
  if (filter === "needs-photos" || filter === "needs-attention") {
    return "Jobs Needing Photos"
  }

  if (filter === "ready-for-report") {
    return "Jobs Ready For Report"
  }

  if (filter === "ready-to-send") {
    return "Reports Ready To Send"
  }

  if (filter === "active") {
    return "Active Jobs"
  }

  return "Jobs"
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
  eyebrow: string
  title: string
  copy: string
  action?: ReactNode
}) {
  return (
    <header className="page-header navigation-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-copy operational-page-copy">{copy}</p>
      </div>
      {action ? <div className="dashboard-controls">{action}</div> : null}
    </header>
  )
}

function JobsPage({
  dashboard,
  dashboardLoadError,
  routeSearch,
  authToken,
  onNavigate,
  onOpenReport,
}: NavigationPagesProps) {
  const entries = getDashboardEntries(dashboard)
  const summary = buildDashboardSummary(entries)
  const filter = getJobFilter(routeSearch)
  const filteredEntries = filterEntries(entries, filter)
  const operationalEntries = buildOperationalEntries(filteredEntries)
  const hasWorkspace = Boolean(dashboard.workspace)

  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Work"
        title={getFilterTitle(filter)}
        copy={
          dashboardLoadError
            ? "Saved job data could not be loaded."
            : hasWorkspace
              ? `${pluralizeCount(entries.length, "job record")} in ${getWorkspaceName(dashboard)}.`
              : "Create a workspace before adding jobs."
        }
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Dashboard")}>
            <BriefcaseBusiness aria-hidden="true" size={15} />
            Dashboard
          </Button>
        }
      />

      <div className="navigation-metrics-row">
        <NavigationMetric
          label="Active"
          value={summary.activeJobs}
          detail="Jobs not marked complete"
        />
        <NavigationMetric
          label="Need photos"
          value={summary.needsEvidence}
          detail="Missing required evidence"
        />
        <NavigationMetric
          label="Ready"
          value={summary.readyForReport}
          detail="Can generate reports"
        />
        <NavigationMetric
          label="Reports"
          value={summary.reportsGenerated}
          detail="Generated proof reports"
        />
      </div>

      <WorkEntryList
        title={getFilterTitle(filter)}
        entries={operationalEntries}
        authToken={authToken}
        onOpenReport={onOpenReport}
        onContinueEntry={() => onNavigate("Dashboard")}
        emptyMessage={
          entries.length === 0
            ? "No jobs have been created yet."
            : "No jobs match this view."
        }
      />
    </section>
  )
}

function ReportsPage({
  dashboard,
  dashboardLoadError,
  onNavigate,
  onOpenReport,
}: NavigationPagesProps) {
  const entries = getDashboardEntries(dashboard)
  const reports = getReportRows(entries)
  const sharedReports = reports.filter((report) => report.status === "SHARED").length
  const totalPhotos = reports.reduce((total, report) => total + report.photoCount, 0)

  return (
    <section className="navigation-page">
      <NavigationHeader
        eyebrow="Reports"
        title="Proof Reports"
        copy={
          dashboardLoadError
            ? "Saved report data could not be loaded."
            : reports.length > 0
              ? `${pluralizeCount(reports.length, "report")} generated from documented jobs.`
              : "No reports have been generated yet."
        }
        action={
          <Button className="dashboard-primary-action" onClick={() => onNavigate("Dashboard")}>
            <ShieldCheck aria-hidden="true" size={15} />
            Review workflow
          </Button>
        }
      />

      <div className="navigation-metrics-row">
        <NavigationMetric label="Generated" value={reports.length} detail="Saved snapshots" />
        <NavigationMetric label="Shared" value={sharedReports} detail="Sent to customers" />
        <NavigationMetric
          label="Ready"
          value={reports.length - sharedReports}
          detail="Awaiting share"
        />
        <NavigationMetric label="Photos" value={totalPhotos} detail="Evidence attached" />
      </div>

      <section className="card section-card recent-reports-panel navigation-report-panel">
        <div className="section-title-row">
          <div>
            <h3>Recent reports</h3>
          </div>
        </div>

        <div className="recent-report-list">
          {reports.length === 0 ? (
            <p className="empty-list-message">
              Jobs with Before and After evidence can generate a proof report.
            </p>
          ) : null}
          {reports.map((report) => (
            <button
              className="recent-report-row navigation-report-row"
              key={report.id}
              type="button"
              onClick={() => onOpenReport(report.id)}
            >
              <span>
                <strong>{report.reportNumber}</strong>
                <small>{report.jobName}</small>
              </span>
              <span>{report.status === "SHARED" ? "Shared" : "Ready to send"}</span>
              <span>{formatShortDate(report.generatedAt)}</span>
            </button>
          ))}
        </div>
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
