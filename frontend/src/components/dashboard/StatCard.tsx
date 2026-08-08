import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string
  helper?: string
  icon?: LucideIcon
}

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <article className="stat-card">
      {Icon ? (
        <div className="stat-icon">
          <Icon size={21} />
        </div>
      ) : null}
      <div className="stat-card-copy">
        <strong>{value}</strong>
        <span>{label}</span>
        {helper ? <p className="muted">{helper}</p> : null}
      </div>
    </article>
  )
}
