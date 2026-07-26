import { useState } from "react"

import { LoginPage } from "@/components/auth/LoginPage"
import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { ReportPreviewPage } from "@/components/reports/ReportPreviewPage"
import { AppShell } from "@/components/shell/AppShell"
import { mockReport } from "@/data/mockFieldProof"
import type { LoginResult } from "@/types/domain"

function App() {
  const [session, setSession] = useState<LoginResult | null>(null)
  const [activeReportId, setActiveReportId] = useState<number | null>(null)

  if (!session) {
    return <LoginPage onLogin={setSession} />
  }

  const activeReport = activeReportId === mockReport.id ? mockReport : null

  return (
    <AppShell activeView={activeReport ? "Report preview" : "Dashboard"}>
      {activeReport ? (
        <ReportPreviewPage
          report={activeReport}
          onBack={() => setActiveReportId(null)}
        />
      ) : (
        <DashboardPage
          dashboardMode={session.dashboardMode}
          userName={session.userName}
          onExploreDemo={() => setSession({ ...session, dashboardMode: "operational" })}
          onOpenReport={setActiveReportId}
        />
      )}
    </AppShell>
  )
}

export default App
