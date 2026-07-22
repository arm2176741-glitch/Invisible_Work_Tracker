import { BarChart3, Building2, FileText, Settings, Users, Wrench } from "lucide-react"

const navItems = [
  { label: "Dashboard", icon: BarChart3 },
  { label: "Companies", icon: Building2 },
  { label: "Crews", icon: Users },
  { label: "Work entries", icon: Wrench },
  { label: "Reports", icon: FileText },
  { label: "Settings", icon: Settings },
]

interface AppSidebarProps {
  activeView: string
}

export function AppSidebar({ activeView }: AppSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <div className="brand-mark">FP</div>
        <div className="sidebar-copy">
          <p className="brand-title">FieldProof</p>
          <p className="brand-subtitle">Proof-of-work operations</p>
        </div>
      </div>

      <nav>
        <p className="sidebar-label">Product</p>
        <div className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              activeView === item.label ||
              (activeView === "Report preview" && item.label === "Reports")

            return (
              <div className={`nav-item ${isActive ? "active" : ""}`} key={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="brand-row">
          <div className="avatar">AA</div>
          <div>
            <p className="brand-title">Armando Arvizu</p>
            <p className="brand-subtitle">Owner</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
