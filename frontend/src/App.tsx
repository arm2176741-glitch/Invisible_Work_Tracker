import { useState } from "react"

import { LoginPage } from "@/components/auth/LoginPage"
import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { ReportPreviewPage } from "@/components/reports/ReportPreviewPage"
import { AppShell } from "@/components/shell/AppShell"
import { mockReport } from "@/data/mockFieldProof"

function App() {
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [activeReportId, setActiveReportId] = useState<number | null>(null)

  if (!currentUserName) {
    return <LoginPage onLogin={setCurrentUserName} />
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
        <DashboardPage onOpenReport={setActiveReportId} />
      )}
    </AppShell>
  )
}

export default App
