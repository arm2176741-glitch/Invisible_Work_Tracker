import { useId, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MailPlus,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface CreateWorkEntryInput {
  jobTitle: string
  propertyAddress: string
  workType: string
  workDate: string
  plannedScope?: string
}

interface CreateWorkEntryStepProps {
  workspaceName: string
  onBackToDashboard: () => void
  onCreateWorkEntry: (input: CreateWorkEntryInput) => Promise<void> | void
}

type FieldErrors = Partial<Record<keyof CreateWorkEntryInput, string>>

const workTypes = ["Roofing", "Fascia", "Inspection", "Repair", "Restoration", "Other"]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function validate(input: CreateWorkEntryInput): FieldErrors {
  const errors: FieldErrors = {}

  if (input.jobTitle.trim().length < 2) {
    errors.jobTitle = "Job title must contain at least 2 characters."
  }

  if (input.propertyAddress.trim().length < 5) {
    errors.propertyAddress = "Property address is required."
  }

  if (!input.workType.trim()) {
    errors.workType = "Work type is required."
  }

  if (!input.workDate) {
    errors.workDate = "Work date is required."
  }

  return errors
}

export function CreateWorkEntryStep({
  workspaceName,
  onBackToDashboard,
  onCreateWorkEntry,
}: CreateWorkEntryStepProps) {
  const titleId = useId()
  const addressId = useId()
  const typeId = useId()
  const dateId = useId()
  const scopeId = useId()

  const [jobTitle, setJobTitle] = useState("Roof Tear Off")
  const [propertyAddress, setPropertyAddress] = useState("1003 N 26th St, Phoenix, AZ 85008")
  const [workType, setWorkType] = useState("Roofing")
  const [workDate, setWorkDate] = useState(today)
  const [plannedScope, setPlannedScope] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function clearError(field: keyof CreateWorkEntryInput) {
    if (!errors[field]) {
      return
    }

    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const input: CreateWorkEntryInput = {
      jobTitle: jobTitle.trim(),
      propertyAddress: propertyAddress.trim(),
      workType,
      workDate,
      plannedScope: plannedScope.trim() || undefined,
    }
    const nextErrors = validate(input)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await onCreateWorkEntry(input)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="create-entry-page" onSubmit={handleSubmit}>
      <header className="create-entry-topbar">
        <button className="back-link-button" type="button" onClick={onBackToDashboard}>
          <ArrowLeft aria-hidden="true" size={18} />
          Back to dashboard
        </button>
        <span className="workspace-status-pill">{workspaceName}</span>
      </header>

      <div className="create-entry-layout">
        <section className="card create-entry-card">
          <div className="create-entry-header">
            <p className="eyebrow">Step 2 of 5</p>
            <h1>Create your first work entry</h1>
            <p>
              Set up the basic details for this job. You can document the work,
              add photos, and generate a report once it is complete.
            </p>
          </div>

          <div className="create-entry-section">
            <div className="create-entry-section-title">
              <BriefcaseBusiness aria-hidden="true" size={18} />
              <h2>Job details</h2>
            </div>

            <div className="create-entry-form-grid">
              <div className="create-entry-field">
                <Label htmlFor={titleId}>Job title *</Label>
                <Input
                  id={titleId}
                  value={jobTitle}
                  maxLength={120}
                  onChange={(event) => {
                    setJobTitle(event.target.value)
                    clearError("jobTitle")
                  }}
                  aria-invalid={Boolean(errors.jobTitle)}
                  disabled={isSubmitting}
                />
                {errors.jobTitle ? <p className="field-error">{errors.jobTitle}</p> : null}
              </div>

              <div className="create-entry-field">
                <Label htmlFor={addressId}>Property address *</Label>
                <Input
                  id={addressId}
                  value={propertyAddress}
                  onChange={(event) => {
                    setPropertyAddress(event.target.value)
                    clearError("propertyAddress")
                  }}
                  aria-invalid={Boolean(errors.propertyAddress)}
                  disabled={isSubmitting}
                />
                {errors.propertyAddress ? <p className="field-error">{errors.propertyAddress}</p> : null}
              </div>

              <div className="create-entry-field">
                <Label htmlFor={typeId}>Work type *</Label>
                <select
                  id={typeId}
                  value={workType}
                  onChange={(event) => {
                    setWorkType(event.target.value)
                    clearError("workType")
                  }}
                  disabled={isSubmitting}
                >
                  {workTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                {errors.workType ? <p className="field-error">{errors.workType}</p> : null}
              </div>

              <div className="create-entry-field">
                <Label htmlFor={dateId}>Work date *</Label>
                <Input
                  id={dateId}
                  type="date"
                  value={workDate}
                  onChange={(event) => {
                    setWorkDate(event.target.value)
                    clearError("workDate")
                  }}
                  aria-invalid={Boolean(errors.workDate)}
                  disabled={isSubmitting}
                />
                {errors.workDate ? <p className="field-error">{errors.workDate}</p> : null}
              </div>
            </div>
          </div>

          <div className="create-entry-section">
            <div className="create-entry-section-title">
              <UserRound aria-hidden="true" size={18} />
              <h2>Assignment</h2>
            </div>
            <div className="invite-callout">
              <div>
                <h3>Owner assigned automatically</h3>
                <p>
                  Crew invitations are planned for the full workspace flow. For
                  now, this first job is assigned to the workspace owner.
                </p>
              </div>
              <Button type="button" variant="ghost" disabled>
                <MailPlus aria-hidden="true" size={16} />
                Invite crew member
              </Button>
            </div>
          </div>

          <div className="create-entry-section">
            <div className="create-entry-section-title">
              <ShieldCheck aria-hidden="true" size={18} />
              <h2>Planned scope optional</h2>
            </div>
            <div className="create-entry-field">
              <Label className="sr-only" htmlFor={scopeId}>
                Planned scope
              </Label>
              <Textarea
                id={scopeId}
                value={plannedScope}
                maxLength={500}
                placeholder="Briefly describe the expected work or scope of this job..."
                onChange={(event) => setPlannedScope(event.target.value)}
                disabled={isSubmitting}
              />
              <div className="field-footer-row">
                <p>This helps set expectations. Actual work performed is recorded later.</p>
                <span>{plannedScope.length}/500</span>
              </div>
            </div>
          </div>

          <div className="create-entry-actions">
            <Button type="button" variant="ghost" onClick={onBackToDashboard} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating entry..." : "Create and open entry"}
              <ArrowRight aria-hidden="true" size={17} />
            </Button>
          </div>
        </section>

        <aside className="create-entry-rail">
          <div className="create-entry-rail-image" aria-hidden="true">
            <img src="/roofing-hero.png" alt="" />
          </div>
          <section className="create-entry-rail-content">
            <p className="eyebrow">What happens next</p>
            <div className="entry-flow-list">
              <div data-state="completed">
                <span><CheckCircle2 aria-hidden="true" size={17} /></span>
                <div><strong>Create workspace</strong><p>Completed</p></div>
              </div>
              <div data-state="current">
                <span>2</span>
                <div><strong>Create work entry</strong><p>Add job details, schedule, assignment, and scope.</p></div>
              </div>
              <div>
                <span>3</span>
                <div><strong>Document the job</strong><p>Add Before, During, and After photos.</p></div>
              </div>
              <div>
                <span>4</span>
                <div><strong>Generate report</strong><p>Create a professional customer-ready report.</p></div>
              </div>
            </div>
          </section>
          <section className="secure-work-card">
            <FileText aria-hidden="true" size={21} />
            <div>
              <h3>All your work is private</h3>
              <p>Your data is only visible to workspace members.</p>
            </div>
          </section>
        </aside>
      </div>
    </form>
  )
}
