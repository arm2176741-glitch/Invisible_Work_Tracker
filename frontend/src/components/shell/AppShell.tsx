import { Menu } from "lucide-react"
import { useState, type ReactNode } from "react"

import { AppSidebar } from "@/components/shell/AppSidebar"

interface AppShellProps {
  activeView: string
  userName: string
  workspaceName: string | null
  onNavigate?: (view: string) => void
  onLogout: () => void
  children: ReactNode
}

export function AppShell({
  activeView,
  userName,
  workspaceName,
  onNavigate,
  onLogout,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <div className="app-backdrop">
      <header className="mobile-shell-header">
        <button
          className="mobile-sidebar-toggle"
          type="button"
          aria-label="Open navigation"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu aria-hidden="true" size={20} />
        </button>
        <div className="mobile-shell-brand" aria-label="FieldProof">
          <span aria-hidden="true">FP</span>
          <strong>FieldProof</strong>
        </div>
      </header>
      <div className="app-shell">
        <AppSidebar
          activeView={activeView}
          userName={userName}
          workspaceName={workspaceName}
          isMobileOpen={sidebarOpen}
          onClose={closeSidebar}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
        <button
          className={`sidebar-scrim ${sidebarOpen ? "sidebar-scrim--visible" : ""}`}
          type="button"
          aria-label="Close navigation"
          onClick={closeSidebar}
        />
        <main className="main">{children}</main>
      </div>
    </div>
  )
}
