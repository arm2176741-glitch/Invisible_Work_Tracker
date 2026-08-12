import { ChevronRight, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { hasRequiredEvidence, type OnboardingFirstWorkEntry } from "@/lib/onboarding"
import type { DashboardSummary } from "@/types/domain"

type BacklogTone = "warning" | "ready" | "send"

type BacklogChip = {
  label: string
  value: number
  href: string
  tone: BacklogTone
}

interface FieldWorkStripProps {
  entries: OnboardingFirstWorkEntry[]
  summary: DashboardSummary
  onCreateJob: () => void
  onOpenJob: (entryId: number) => void
  hasWorkspace?: boolean
  onCreateWorkspace?: () => void
  compact?: boolean
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function parseDateKey(value?: string | null) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

function formatDateKey(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const date = parseDateKey(value)

  if (!date) {
    return "Unscheduled"
  }

  return new Intl.DateTimeFormat("en-US", options).format(date)
}

function formatScheduleTime(value?: string | null) {
  if (!value) {
    return null
  }

  const [hours, minutes] = value.split(":")
  const hourNumber = Number(hours)

  if (Number.isNaN(hourNumber)) {
    return value
  }

  const period = hourNumber >= 12 ? "PM" : "AM"
  const twelveHour = hourNumber % 12 || 12

  return `${twelveHour}:${minutes ?? "00"} ${period}`
}

function getScheduleSortValue(entry: OnboardingFirstWorkEntry) {
  return `${entry.workDate ?? "9999-12-31"}T${entry.scheduledStartTime ?? "23:59"}`
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function buildBacklogChips(summary: DashboardSummary): BacklogChip[] {
  const chips: BacklogChip[] = [
    {
      label: "need photos",
      value: summary.needsEvidence,
      href: "/jobs?status=needs-photos",
      tone: "warning",
    },
    {
      label: "ready for report",
      value: summary.readyForReport,
      href: "/jobs?status=ready-for-report",
      tone: "ready",
    },
    {
      label: "ready to send",
      value: summary.proofReady,
      href: "/reports?status=ready-to-send",
      tone: "send",
    },
  ]

  return chips.filter((item) => item.value > 0)
}

function getEntryTimeLabel(entry: OnboardingFirstWorkEntry) {
  return formatScheduleTime(entry.scheduledStartTime)
    ?? entry.arrivalWindow
    ?? "Today"
}

function getEntryStatus(entry: OnboardingFirstWorkEntry, todayKey: string) {
  if (entry.report?.status === "SHARED") {
    return { label: "Shared", tone: "complete" }
  }

  if (entry.report) {
    return { label: "Ready to send", tone: "send" }
  }

  if (hasRequiredEvidence(entry)) {
    return { label: "Ready for report", tone: "ready" }
  }

  if (entry.workDate === todayKey && entry.scheduledStartTime) {
    const [hours, minutes = "0"] = entry.scheduledStartTime.split(":")
    const startMinutes = Number(hours) * 60 + Number(minutes)
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    if (!Number.isNaN(startMinutes) && startMinutes <= currentMinutes) {
      return { label: "In progress", tone: "active" }
    }
  }

  return { label: "Upcoming", tone: "neutral" }
}

function getEntryActionLabel(entry: OnboardingFirstWorkEntry) {
  if (entry.report?.status === "SHARED") {
    return "View report"
  }

  if (entry.report) {
    return "Review & send"
  }

  if (hasRequiredEvidence(entry)) {
    return "Generate report"
  }

  return "Open job"
}

function getNextJobDateLabel(entry: OnboardingFirstWorkEntry, todayKey: string) {
  if (!entry.workDate) {
    return "No date"
  }

  const today = parseDateKey(todayKey)
  const tomorrowKey = today ? getLocalDateKey(addDays(today, 1)) : null
  const dateLabel = entry.workDate === tomorrowKey
    ? "tomorrow"
    : formatDateKey(entry.workDate, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
  const timeLabel = formatScheduleTime(entry.scheduledStartTime)
    ?? entry.arrivalWindow
    ?? null

  return timeLabel ? `${dateLabel} at ${timeLabel}` : dateLabel
}

export function FieldWorkStrip({
  entries,
  summary,
  onCreateJob,
  onOpenJob,
  hasWorkspace = true,
  onCreateWorkspace,
  compact = false,
}: FieldWorkStripProps) {
  const todayKey = getLocalDateKey()
  const todayEntries = entries
    .filter((entry) => entry.workDate === todayKey)
    .sort((firstEntry, secondEntry) =>
      getScheduleSortValue(firstEntry).localeCompare(getScheduleSortValue(secondEntry)),
    )
    .slice(0, compact ? 2 : 4)
  const nextScheduledEntry = entries
    .filter((entry) => entry.workDate && entry.workDate > todayKey)
    .sort((firstEntry, secondEntry) =>
      getScheduleSortValue(firstEntry).localeCompare(getScheduleSortValue(secondEntry)),
    )[0]
  const backlogChips = compact ? [] : buildBacklogChips(summary)
  const hasJobs = entries.length > 0
  const emptyAction = hasWorkspace ? onCreateJob : (onCreateWorkspace ?? onCreateJob)

  if (!hasJobs) {
    return (
      <section className="field-work-strip field-work-strip-empty" aria-label="Field schedule">
        <div className="field-work-empty-copy">
          {hasWorkspace ? (
            <>
              <p className="eyebrow">Get started</p>
              <h2>Create your first proof record</h2>
              <p>
                Add the property and customer, document Before / During / After photos,
                then generate a customer-ready report.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Your field work</p>
              <h2>No workspace yet</h2>
              <p>
                Create a workspace first so FieldProof has a place to store jobs,
                photos, crew activity, and reports.
              </p>
            </>
          )}
        </div>

        <div className="field-work-empty-actions">
          <Button
            className="field-work-empty-primary-action"
            type="button"
            variant="secondary"
            onClick={emptyAction}
          >
            <Plus aria-hidden="true" size={16} />
            {hasWorkspace ? "Create first job" : "Create workspace"}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="field-work-strip" aria-label="Today's field work">
      <header className="field-work-header">
        <div className="field-work-heading">
          <p className="eyebrow">Today's field work</p>
          <span>{formatDateKey(todayKey, { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>

        <div className="field-work-meta">
          <strong>{pluralize(todayEntries.length, "job")} today</strong>
          {!compact ? (
            backlogChips.length > 0 ? (
              <div className="field-work-backlog" aria-label="Proof backlog">
                {backlogChips.map((chip) => (
                  <a
                    className={`field-work-chip field-work-chip-${chip.tone}`}
                    href={chip.href}
                    key={chip.label}
                  >
                    <span>{chip.value}</span>
                    {chip.label}
                  </a>
                ))}
              </div>
            ) : (
              <span className="field-work-backlog-clear">No proof backlog</span>
            )
          ) : null}
          <a className="field-work-schedule-link" href="/jobs?view=schedule">
            View schedule
            <ChevronRight aria-hidden="true" size={15} />
          </a>
        </div>
      </header>

      {todayEntries.length > 0 ? (
        <div className="field-work-timeline">
          {todayEntries.map((entry) => {
            const status = getEntryStatus(entry, todayKey)

            return (
              <button
                className="field-work-job"
                key={entry.id}
                type="button"
                onClick={() => onOpenJob(entry.id)}
              >
                <span className="field-work-time">{getEntryTimeLabel(entry)}</span>
                <strong>{entry.jobTitle ?? "Untitled job"}</strong>
                <span className="field-work-address">
                  {entry.propertyAddress ?? "No property address added"}
                </span>
                <span className={`field-work-state field-work-state-${status.tone}`}>
                  <span aria-hidden="true" />
                  {status.label}
                </span>
                <span className="field-work-job-action">
                  {getEntryActionLabel(entry)}
                  <ChevronRight aria-hidden="true" size={14} />
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="field-work-no-today">
          <div>
            <h2>No jobs scheduled today.</h2>
            {nextScheduledEntry ? (
              <button
                className="field-work-next-job"
                type="button"
                onClick={() => onOpenJob(nextScheduledEntry.id)}
              >
                <span>Your next job is {getNextJobDateLabel(nextScheduledEntry, todayKey)}.</span>
                <strong>
                  {nextScheduledEntry.jobTitle ?? "Untitled job"} -{" "}
                  {nextScheduledEntry.propertyAddress ?? "No property address added"}
                </strong>
              </button>
            ) : (
              <p>
                {backlogChips.length > 0
                  ? "No upcoming job is scheduled yet. Use the proof backlog to clear existing work."
                  : "No upcoming job is scheduled yet. Add the next job when the schedule is ready."}
              </p>
            )}
          </div>

          <div className="field-work-no-today-actions">
            <a className="field-work-schedule-link" href="/jobs?view=schedule">
              View schedule
              <ChevronRight aria-hidden="true" size={15} />
            </a>
            {!compact ? (
              <Button type="button" variant="secondary" onClick={onCreateJob}>
                <Plus aria-hidden="true" size={16} />
                New job
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}
