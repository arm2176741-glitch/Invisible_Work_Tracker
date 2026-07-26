import type { Workspace } from "@/types/domain"

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  return (
    <section className="card workspace-card">
      <p className="eyebrow">Workspace</p>

      <div className="workspace-compact-header">
        <div className="workspace-icon">A</div>
        <div>
          <h3>{workspace.name}</h3>
          <p className="workspace-summary">
            {workspace.memberCount} members - {workspace.workEntryCount} active jobs - {workspace.reportCount} reports
          </p>
        </div>
      </div>

      <button className="workspace-manage-link" type="button">
        Manage workspace
        <span aria-hidden="true">-&gt;</span>
      </button>
    </section>
  )
}
