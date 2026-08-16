import { useState, type CSSProperties } from "react"

import {
  getJobFilterFromSearch,
  JOB_FILTER_ROUTES,
  type AppView,
  type JobFilterLabel,
} from "@/lib/navigation"

type NavItem = {
  label: AppView
  icon: string
  badge?: string
  aliases?: Array<AppView | "Report preview">
  children?: Array<{
    label: JobFilterLabel
    status: string
    path: string
  }>
}

const iconBasePath = "/icons/sidebar"

const sidebarIconPaths = {
  dashboard: `${iconBasePath}/layout-dashboard.svg`,
  workEntries: `${iconBasePath}/clipboard-list.svg`,
  reports: `${iconBasePath}/file-text.svg`,
  crew: `${iconBasePath}/users.svg`,
  invitations: `${iconBasePath}/user.svg`,
  company: `${iconBasePath}/house.svg`,
  settings: `${iconBasePath}/settings.svg`,
  help: `${iconBasePath}/help-circle.svg`,
  logout: `${iconBasePath}/log-out.svg`,
  chevrons: `${iconBasePath}/chevrons-up-down.svg`,
  close: `${iconBasePath}/x.svg`,
}

const navGroups: Array<{
  label: string
  items: NavItem[]
}> = [
  {
    label: "Work",
    items: [
      { label: "Dashboard", icon: sidebarIconPaths.dashboard },
      {
        label: "Jobs",
        icon: sidebarIconPaths.workEntries,
        children: [
          {
            label: "Active",
            status: "active",
            path: JOB_FILTER_ROUTES.Active,
          },
          {
            label: "Needs photos",
            status: "needs-photos",
            path: JOB_FILTER_ROUTES["Needs photos"],
          },
          {
            label: "Ready to send",
            status: "ready-to-send",
            path: JOB_FILTER_ROUTES["Ready to send"],
          },
        ],
      },
      { label: "Reports", icon: sidebarIconPaths.reports, aliases: ["Report preview"] },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Crew", icon: sidebarIconPaths.crew },
      { label: "Invitations", icon: sidebarIconPaths.invitations },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "Company profile", icon: sidebarIconPaths.company },
      { label: "Settings", icon: sidebarIconPaths.settings },
    ],
  },
]

interface AppSidebarProps {
  activeView: AppView | "Report preview"
  routeSearch?: string
  userName: string
  workspaceName: string | null
  isMobileOpen: boolean
  onClose: () => void
  onNavigate?: (view: AppView) => void
  onNavigatePath?: (path: string) => void
  onLogout: () => void
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return "FP"
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

function getWorkspaceInitials(workspaceName: string | null) {
  if (!workspaceName) {
    return "FP"
  }

  return getInitials(workspaceName)
}

function SidebarIcon({
  src,
  className,
  size = 16,
}: {
  src: string
  className?: string
  size?: number
}) {
  return (
    <span
      aria-hidden="true"
      className={`sidebar-svg-icon ${className ?? ""}`}
      style={{
        "--sidebar-icon-url": `url("${src}")`,
        width: size,
        height: size,
      } as CSSProperties}
    />
  )
}

export function AppSidebar({
  activeView,
  routeSearch = "",
  userName,
  workspaceName,
  isMobileOpen,
  onClose,
  onNavigate,
  onNavigatePath,
  onLogout,
}: AppSidebarProps) {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const resolvedWorkspaceName = workspaceName ?? "No workspace selected"
  const workspaceInitials = getWorkspaceInitials(workspaceName)
  const activeJobFilter = getJobFilterFromSearch(routeSearch)

  function toggleWorkspaceMenu() {
    setWorkspaceMenuOpen((current) => !current)
    setAccountMenuOpen(false)
  }

  function toggleAccountMenu() {
    setAccountMenuOpen((current) => !current)
    setWorkspaceMenuOpen(false)
  }

  function handleNavigate(view: AppView) {
    setWorkspaceMenuOpen(false)
    setAccountMenuOpen(false)
    onNavigate?.(view)
    onClose()
  }

  function handleNavigatePath(path: string) {
    setWorkspaceMenuOpen(false)
    setAccountMenuOpen(false)
    onNavigatePath?.(path)
    onClose()
  }

  return (
    <aside className={`sidebar ${isMobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar-brand-bar">
        <div className="brand-row">
          <span className="sidebar-brand-icon">
            <SidebarIcon src={sidebarIconPaths.company} size={17} />
          </span>
          <div className="sidebar-copy">
            <p className="brand-title">FieldProof</p>
            <p className="brand-subtitle">Proof-of-work operations</p>
          </div>
        </div>
        <button
          className="sidebar-close-button"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <SidebarIcon src={sidebarIconPaths.close} size={14} />
        </button>
      </div>

      <div className="workspace-switcher">
        <button
          className="workspace-switcher-button"
          type="button"
          aria-label={`Current workspace: ${resolvedWorkspaceName}`}
          aria-expanded={workspaceMenuOpen}
          onClick={toggleWorkspaceMenu}
        >
          <span className="workspace-avatar">{workspaceInitials}</span>
          <span className="workspace-copy">
            <strong>{resolvedWorkspaceName}</strong>
            <small>Owner workspace</small>
          </span>
          <SidebarIcon
            className="workspace-caret"
            src={sidebarIconPaths.chevrons}
            size={12}
          />
        </button>

        {workspaceMenuOpen ? (
          <div className="sidebar-menu workspace-menu">
            <button className="sidebar-menu-item active" type="button">
              <span>{workspaceInitials}</span>
              <div>
                <strong>{resolvedWorkspaceName}</strong>
                <small>Current workspace</small>
              </div>
            </button>
          </div>
        ) : null}
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navGroups.map((group) => (
          <section className="sidebar-section" key={group.label}>
            <p className="sidebar-section-title">{group.label}</p>
            <div className="nav-list">
              {group.items.map((item) => {
                const isActive =
                  activeView === item.label || item.aliases?.includes(activeView)
                const hasActiveChild = Boolean(
                  item.children?.some((child) =>
                    activeView === "Jobs" && activeJobFilter === child.status,
                  ),
                )

                return (
                  <div className="nav-stack" key={item.label}>
                    <button
                      className={`nav-item ${isActive ? "active" : ""}`}
                      type="button"
                      aria-current={isActive && !hasActiveChild ? "page" : undefined}
                      onClick={() => handleNavigate(item.label)}
                      title={item.label}
                    >
                      <SidebarIcon src={item.icon} />
                      <span className="nav-item-label">{item.label}</span>
                      {item.badge ? (
                        <span className="nav-item-badge">{item.badge}</span>
                      ) : null}
                    </button>
                    {isActive && item.children ? (
                      <div className="sidebar-subnav sidebar-subnav--visible">
                        {item.children.map((child) => {
                          const isChildActive =
                            activeView === "Jobs" && activeJobFilter === child.status

                          return (
                            <button
                              className={isChildActive ? "active" : ""}
                              type="button"
                              aria-current={isChildActive ? "page" : undefined}
                              key={child.label}
                              onClick={() => handleNavigatePath(child.path)}
                            >
                              {child.label}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`sidebar-help-button ${
            activeView === "Help & support" ? "active" : ""
          }`}
          type="button"
          aria-current={activeView === "Help & support" ? "page" : undefined}
          title="Help and support"
          onClick={() => handleNavigate("Help & support")}
        >
          <SidebarIcon src={sidebarIconPaths.help} size={15} />
          <span className="help-label">Help & support</span>
        </button>

        <div className="account-switcher">
          <button
            className="account-button"
            type="button"
            aria-label={`Account menu for ${userName}`}
            aria-expanded={accountMenuOpen}
            onClick={toggleAccountMenu}
          >
            <span className="avatar">{getInitials(userName)}</span>
            <span className="account-copy">
              <strong>{userName}</strong>
              <small>Owner</small>
            </span>
            <SidebarIcon
              className="account-action"
              src={sidebarIconPaths.chevrons}
              size={12}
            />
          </button>

          {accountMenuOpen ? (
            <div className="sidebar-menu account-menu">
              <div className="account-menu-header">
                <strong>{userName}</strong>
                <small>{resolvedWorkspaceName}</small>
              </div>
              <button
                className="sidebar-menu-text-item"
                type="button"
                onClick={() => handleNavigate("Profile")}
              >
                Your profile
              </button>
              <button
                className="sidebar-menu-text-item"
                type="button"
                onClick={() => handleNavigate("Settings")}
              >
                Preferences
              </button>
              <button
                className="sidebar-menu-text-item"
                type="button"
                onClick={() => handleNavigate("Company profile")}
              >
                Switch workspace
              </button>
              <button
                className="sidebar-menu-text-item danger"
                type="button"
                onClick={onLogout}
              >
                <SidebarIcon src={sidebarIconPaths.logout} size={14} />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
