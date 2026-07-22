import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string
  helper: string
  icon: LucideIcon
}

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <article className="card stat-card">
      <div className="stat-icon">
        <Icon size={21} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p className="muted">{helper}</p>
      </div>
    </article>
  )
}
