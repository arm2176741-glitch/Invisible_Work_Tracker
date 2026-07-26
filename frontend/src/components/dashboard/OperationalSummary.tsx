import { AlertTriangle, Camera, CheckCircle2, ChevronRight, FileText, Info } from "lucide-react"

import type { ActivityItem, AttentionItem } from "@/types/domain"

interface AttentionNeededProps {
  items: AttentionItem[]
}

interface RecentActivityProps {
  items: ActivityItem[]
}

function getAttentionIcon(tone: AttentionItem["tone"]) {
  return tone === "info" ? Info : AlertTriangle
}

function getActivityIcon(tone: ActivityItem["tone"]) {
  if (tone === "success") return CheckCircle2
  if (tone === "report") return FileText

  return Camera
}

export function AttentionNeeded({ items }: AttentionNeededProps) {
  return (
    <section className="card section-card attention-card">
      <div className="rail-title-row">
        <p className="eyebrow">Attention needed</p>
        <button className="rail-link-button" type="button">View all</button>
      </div>

      <div className="rail-list">
        {items.map((item) => {
          const Icon = getAttentionIcon(item.tone)

          return (
            <button className="rail-list-item" type="button" key={item.id}>
              <span className={`rail-icon rail-icon-${item.tone}`}>
                <Icon aria-hidden="true" size={15} />
              </span>
              <span className="rail-item-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <section className="card section-card activity-card">
      <p className="eyebrow">Recent activity</p>

      <div className="rail-list">
        {items.map((item) => {
          const Icon = getActivityIcon(item.tone)

          return (
            <div className="rail-list-item activity-item" key={item.id}>
              <span className={`rail-icon rail-icon-${item.tone}`}>
                <Icon aria-hidden="true" size={15} />
              </span>
              <span className="rail-item-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
