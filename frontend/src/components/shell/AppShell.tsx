import type { ReactNode } from "react"

import { AppSidebar } from "@/components/shell/AppSidebar"

interface AppShellProps {
  activeView: string
  children: ReactNode
}

export function AppShell({ activeView, children }: AppShellProps) {
  return (
    <div className="app-backdrop">
      <div className="app-shell">
        <AppSidebar activeView={activeView} />
        <main className="main">{children}</main>
      </div>
    </div>
  )
}
