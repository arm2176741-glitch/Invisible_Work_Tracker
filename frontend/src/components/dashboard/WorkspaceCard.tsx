import type { Workspace } from "@/types/domain"

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const workspaceInitial = workspace.name.trim().charAt(0).toUpperCase() || "F"

  return (
    <section className="card workspace-card">
      <p className="eyebrow">Workspace</p>

      <div className="workspace-compact-header">
        <div className="workspace-icon">{workspaceInitial}</div>
        <div>
          <h3>{workspace.name}</h3>
          <p className="workspace-summary">
            {pluralize(workspace.memberCount, "member")} {" - "}
            {pluralize(workspace.workEntryCount, "active job")} {" - "}
            {pluralize(workspace.reportCount, "report")}
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
