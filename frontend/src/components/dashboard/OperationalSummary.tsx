import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileText,
} from "lucide-react"

import type {
  ActivityItem,
  AttentionItem,
  UpcomingItem,
} from "@/types/domain"

interface AttentionNeededProps {
  items: AttentionItem[]
}

interface RecentActivityProps {
  items: ActivityItem[]
}

interface UpcomingScheduleProps {
  items: UpcomingItem[]
}

function getActivityIcon(tone: ActivityItem["tone"]) {
  if (tone === "success") return CheckCircle2
  if (tone === "report") return FileText

  return Camera
}

export function AttentionNeeded({ items }: AttentionNeededProps) {
  return (
    <section className="rail-panel-section attention-card">
      <p className="eyebrow">Needs attention</p>

      <div className="rail-list">
        {items.map((item) => {
          const isEmpty = item.id === 0
          const className = `rail-list-item attention-list-item${
            isEmpty ? " attention-list-item-empty" : ""
          }`

          if (isEmpty) {
            return (
              <div className={className} key={item.id}>
                <span className="rail-item-copy">
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </span>
              </div>
            )
          }

          return (
            <button className={className} type="button" key={item.id}>
              <span className={`attention-status-dot attention-status-dot-${item.tone}`} />
              <span className="rail-item-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function UpcomingSchedule({ items }: UpcomingScheduleProps) {
  return (
    <section className="rail-panel-section upcoming-card">
      <p className="eyebrow">Upcoming</p>

      <div className="upcoming-list">
        {items.length > 0 ? (
          items.map((item) => (
            <button className="upcoming-item" key={item.id} type="button">
              <span className="upcoming-time">{item.timeLabel}</span>
              <span className="rail-item-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </span>
            </button>
          ))
        ) : (
          <div className="upcoming-empty">
            <CalendarDays aria-hidden="true" size={17} />
            <span>No scheduled jobs yet</span>
          </div>
        )}
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
