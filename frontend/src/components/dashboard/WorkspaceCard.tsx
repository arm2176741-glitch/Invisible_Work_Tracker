import type { Workspace } from "@/types/domain"

import { Button } from "@/components/ui/button"

interface WorkspaceCardProps {
  workspace: Workspace
}

export function WorkspaceCard({ workspace }: WorkspaceCardProps) {
  return (
    <section className="card workspace-card">
      <p className="eyebrow">Company workspace</p>
      <div className="workspace-header">
        <div className="workspace-icon">A</div>
        <div>
          <h3>{workspace.name}</h3>
          <div className="workspace-badges">
            <span className="badge warning">{workspace.role}</span>
            <span className="badge success">{workspace.status}</span>
          </div>
        </div>
      </div>

      <div className="workspace-stats">
        <div className="workspace-stat">
          <span>Members</span>
          <strong>{workspace.memberCount}</strong>
        </div>
        <div className="workspace-stat">
          <span>Entries</span>
          <strong>{workspace.workEntryCount}</strong>
        </div>
        <div className="workspace-stat">
          <span>Reports</span>
          <strong>{workspace.reportCount}</strong>
        </div>
      </div>

      <Button variant="secondary">Manage workspace</Button>
    </section>
  )
}
