import { Building2, Camera, FileText, Users } from "lucide-react"

import { SetupProgress } from "@/components/dashboard/SetupProgress"
import { StatCard } from "@/components/dashboard/StatCard"
import { WorkEntryList } from "@/components/dashboard/WorkEntryList"
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard"
import { Button } from "@/components/ui/button"
import { currentWorkspace, workEntries } from "@/data/mockFieldProof"

interface DashboardPageProps {
  onOpenReport: (reportId: number) => void
}

export function DashboardPage({ onOpenReport }: DashboardPageProps) {
  const generatedReport = workEntries.find((entry) => entry.reportId)

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-title">Welcome back, Armando.</h1>
          <p className="page-copy">
            FieldProof turns jobsite documentation into organized, customer-ready proof
            reports without making the crew sort through camera rolls later.
          </p>
        </div>
        <div className="top-user">
          <div className="avatar">AA</div>
          <span>Owner</span>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="primary-column">
          <section className="card hero-card">
            <div>
              <p className="eyebrow">Next best action</p>
              <h2>Review the customer proof report.</h2>
              <p>
                The job has before, during, and after evidence. Review the generated
                snapshot before sending or exporting it.
              </p>
            </div>
            <div className="hero-actions">
              <Button onClick={() => generatedReport?.reportId && onOpenReport(generatedReport.reportId)}>
                View report
              </Button>
              <Button variant="secondary">Add photos</Button>
            </div>
          </section>

          <section className="metrics-row">
            <StatCard icon={Building2} label="Companies" value="1" helper="Workspace active" />
            <StatCard icon={Users} label="Crew" value="1" helper="Owner account" />
            <StatCard icon={Camera} label="Photos" value="4" helper="Evidence captured" />
            <StatCard icon={FileText} label="Reports" value="1" helper="Generated" />
          </section>

          <WorkEntryList entries={workEntries} onOpenReport={onOpenReport} />
        </div>

        <aside className="right-rail">
          <WorkspaceCard workspace={currentWorkspace} />
          <SetupProgress />
        </aside>
      </div>
    </>
  )
}
