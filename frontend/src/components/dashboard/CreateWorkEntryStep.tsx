import { useId, useState } from "react"
import {
  BriefcaseBusiness,
  Clock3,
  MapPinned,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface CreateWorkEntryInput {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerContactName?: string
  jobTitle: string
  propertyAddress: string
  workType: string
  workDate?: string
  scheduledStartTime?: string
  arrivalWindow?: string
  estimatedDuration?: string
  assignedCrew?: string
  siteAccessNotes?: string
  internalNotes?: string
  plannedScope?: string
}

export type CreateWorkEntryCompletion = "addPhotos" | "dashboard"

interface CreateWorkEntryStepProps {
  workspaceName: string
  ownerName?: string
  onBackToDashboard: () => void
  onCreateWorkEntry: (
    input: CreateWorkEntryInput,
    completion: CreateWorkEntryCompletion,
  ) => Promise<void> | void
  mode?: "onboarding" | "operational"
}

type FieldErrors = Partial<Record<keyof CreateWorkEntryInput, string>>
type SubmitAction = CreateWorkEntryCompletion

const workTypes = [
  "Roofing",
  "Fascia",
  "Inspection",
  "Repair",
  "Restoration",
  "Other",
  "Custom",
]
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function today() {
  return new Date().toISOString().slice(0, 10)
}

function getAddressTitlePart(address: string) {
  return address.split(",")[0]?.trim() || "New job"
}

function buildAutoJobTitle(workType: string, address: string) {
  const normalizedType = workType.trim() || "Job"

  return `${normalizedType} - ${getAddressTitlePart(address)}`
}

function validate(input: CreateWorkEntryInput): FieldErrors {
  const errors: FieldErrors = {}

  if (input.customerName.trim().length < 2) {
    errors.customerName = "Customer name is required."
  }

  if (input.propertyAddress.trim().length < 5) {
    errors.propertyAddress = "Property address is required."
  }

  if (!input.workType.trim()) {
    errors.workType = "Job type is required."
  }

  if (input.customerEmail && !emailPattern.test(input.customerEmail)) {
    errors.customerEmail = "Enter a valid email address."
  }

  return errors
}

export function CreateWorkEntryStep({
  workspaceName,
  ownerName = "Workspace owner",
  onBackToDashboard,
  onCreateWorkEntry,
  mode = "onboarding",
}: CreateWorkEntryStepProps) {
  const customerNameId = useId()
  const customerPhoneId = useId()
  const customerEmailId = useId()
  const contactPersonId = useId()
  const titleId = useId()
  const addressId = useId()
  const accessNotesId = useId()
  const typeId = useId()
  const customTypeId = useId()
  const dateId = useId()
  const startTimeId = useId()
  const arrivalWindowId = useId()
  const durationId = useId()
  const scheduleLaterId = useId()
  const crewId = useId()
  const scopeId = useId()
  const internalNotesId = useId()

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerContactName, setCustomerContactName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [workType, setWorkType] = useState("")
  const [customWorkType, setCustomWorkType] = useState("")
  const [workDate, setWorkDate] = useState(today)
  const [scheduledStartTime, setScheduledStartTime] = useState("")
  const [arrivalWindow, setArrivalWindow] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [scheduleLater, setScheduleLater] = useState(false)
  const [assignedCrew, setAssignedCrew] = useState(ownerName)
  const [siteAccessNotes, setSiteAccessNotes] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [plannedScope, setPlannedScope] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submittingAction, setSubmittingAction] =
    useState<SubmitAction | null>(null)
  const isOperationalMode = mode === "operational"
  const isSubmitting = submittingAction !== null

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

  async function submitWorkEntry(
    completion: CreateWorkEntryCompletion,
    submitAction: SubmitAction = completion,
  ) {
    if (isSubmitting) {
      return
    }

    const trimmedAddress = propertyAddress.trim()
    const trimmedWorkType = workType === "Custom"
      ? customWorkType.trim()
      : workType.trim()
    const input: CreateWorkEntryInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerContactName: customerContactName.trim() || undefined,
      jobTitle: jobTitle.trim() || buildAutoJobTitle(trimmedWorkType, trimmedAddress),
      propertyAddress: trimmedAddress,
      workType: trimmedWorkType,
      workDate: scheduleLater ? undefined : workDate,
      scheduledStartTime: scheduleLater ? undefined : scheduledStartTime.trim() || undefined,
      arrivalWindow: scheduleLater ? undefined : arrivalWindow.trim() || undefined,
      estimatedDuration: scheduleLater ? undefined : estimatedDuration.trim() || undefined,
      assignedCrew: assignedCrew.trim() || undefined,
      siteAccessNotes: siteAccessNotes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      plannedScope: plannedScope.trim() || undefined,
    }
    const nextErrors = validate(input)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmittingAction(submitAction)

    try {
      await onCreateWorkEntry(input, completion)
    } finally {
      setSubmittingAction(null)
    }
  }

  function handlePrimarySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitWorkEntry("addPhotos")
  }

  function handleSaveDraft() {
    void submitWorkEntry("dashboard")
  }

  return (
    <form
      className="create-entry-page"
      onSubmit={handlePrimarySubmit}
      aria-label={`Create job for ${workspaceName}`}
    >
      <section className="card create-entry-card">
        <div className="create-entry-header">
          <p className="eyebrow">
            {isOperationalMode ? "NEW JOB" : "STEP 2 OF 5"} / FieldProof Portal
          </p>
          <h1>{isOperationalMode ? "Create job" : "Create your first job"}</h1>
          <p>
            Add the customer and property details. You can document the work
            and generate a proof report after creating the job.
          </p>
        </div>

        <div className="create-entry-section">
          <div className="create-entry-section-title">
            <UserRound aria-hidden="true" size={18} />
            <h2>Customer information</h2>
          </div>

          <div className="create-entry-form-grid">
            <div className="create-entry-field">
              <Label htmlFor={customerNameId}>Customer or company name *</Label>
              <Input
                id={customerNameId}
                value={customerName}
                maxLength={150}
                autoComplete="organization"
                placeholder="Smith Residence"
                onChange={(event) => {
                  setCustomerName(event.target.value)
                  clearError("customerName")
                }}
                aria-invalid={Boolean(errors.customerName)}
                disabled={isSubmitting}
              />
              {errors.customerName ? <p className="field-error">{errors.customerName}</p> : null}
            </div>

            <div className="create-entry-field">
              <Label htmlFor={customerPhoneId}>Phone</Label>
              <Input
                id={customerPhoneId}
                value={customerPhone}
                maxLength={40}
                type="tel"
                autoComplete="tel"
                placeholder="(602) 555-0198"
                onChange={(event) => setCustomerPhone(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="create-entry-field">
              <Label htmlFor={customerEmailId}>Email</Label>
              <Input
                id={customerEmailId}
                value={customerEmail}
                maxLength={150}
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="customer@example.com"
                onChange={(event) => {
                  setCustomerEmail(event.target.value)
                  clearError("customerEmail")
                }}
                aria-invalid={Boolean(errors.customerEmail)}
                disabled={isSubmitting}
              />
              {errors.customerEmail ? <p className="field-error">{errors.customerEmail}</p> : null}
            </div>

            <div className="create-entry-field">
              <Label htmlFor={contactPersonId}>Contact person</Label>
              <Input
                id={contactPersonId}
                value={customerContactName}
                maxLength={150}
                autoComplete="name"
                placeholder="John Smith"
                onChange={(event) => setCustomerContactName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        <div className="create-entry-section">
          <div className="create-entry-section-title">
            <MapPinned aria-hidden="true" size={18} />
            <h2>Property</h2>
          </div>

          <div className="create-entry-form-grid">
            <div className="create-entry-field create-entry-field-wide">
              <Label htmlFor={addressId}>Property address *</Label>
              <Input
                id={addressId}
                value={propertyAddress}
                maxLength={255}
                autoComplete="street-address"
                placeholder="1003 N 26th St, Phoenix, AZ 85008"
                onChange={(event) => {
                  setPropertyAddress(event.target.value)
                  clearError("propertyAddress")
                }}
                aria-invalid={Boolean(errors.propertyAddress)}
                disabled={isSubmitting}
              />
              {errors.propertyAddress ? <p className="field-error">{errors.propertyAddress}</p> : null}
            </div>

            <div className="create-entry-field create-entry-field-wide">
              <Label htmlFor={accessNotesId}>Site access notes</Label>
              <Textarea
                id={accessNotesId}
                value={siteAccessNotes}
                maxLength={1000}
                placeholder="Gate code, where to park, dogs on property, roof-access instructions."
                onChange={(event) => setSiteAccessNotes(event.target.value)}
                disabled={isSubmitting}
              />
              <p className="field-helper-text">
                Private field notes for the contractor and crew.
              </p>
            </div>
          </div>
        </div>

        <div className="create-entry-section">
          <div className="create-entry-section-title">
            <BriefcaseBusiness aria-hidden="true" size={18} />
            <h2>Job details</h2>
          </div>

          <div className="create-entry-form-grid">
            <div className="create-entry-field">
              <Label htmlFor={typeId}>Job type *</Label>
              <select
                id={typeId}
                value={workType}
                onChange={(event) => {
                  setWorkType(event.target.value)
                  clearError("workType")
                }}
                aria-invalid={Boolean(errors.workType)}
                disabled={isSubmitting}
              >
                <option value="" disabled>Select job type</option>
                {workTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.workType ? <p className="field-error">{errors.workType}</p> : null}
            </div>

            {workType === "Custom" ? (
              <div className="create-entry-field">
                <Label htmlFor={customTypeId}>Custom job type *</Label>
                <Input
                  id={customTypeId}
                  value={customWorkType}
                  maxLength={100}
                  placeholder="Tile repair, flat-roof coating..."
                  onChange={(event) => {
                    setCustomWorkType(event.target.value)
                    clearError("workType")
                  }}
                  disabled={isSubmitting}
                />
              </div>
            ) : null}

            <div className="create-entry-field">
              <Label htmlFor={titleId}>Job title</Label>
              <Input
                id={titleId}
                value={jobTitle}
                maxLength={120}
                placeholder="Auto-generated if left blank"
                onChange={(event) => setJobTitle(event.target.value)}
                disabled={isSubmitting}
              />
              <p className="field-helper-text">
                Leave blank to create "Roof Repair - 1003 N 26th St."
              </p>
            </div>

            <div className="create-entry-field">
              <Label htmlFor={crewId}>Assigned crew</Label>
              <Input
                id={crewId}
                value={assignedCrew}
                maxLength={500}
                placeholder={`${ownerName}, Alan`}
                onChange={(event) => setAssignedCrew(event.target.value)}
                disabled={isSubmitting}
              />
              <p className="field-helper-text">
                Separate names with commas. Crew accounts come later.
              </p>
            </div>
          </div>
        </div>

        <div className="create-entry-section">
          <div className="create-entry-section-title">
            <Clock3 aria-hidden="true" size={18} />
            <h2>Schedule</h2>
          </div>

          <div className="create-entry-form-grid">
            <div className="create-entry-field">
              <Label htmlFor={dateId}>Scheduled date</Label>
              <Input
                id={dateId}
                type="date"
                value={workDate}
                onChange={(event) => {
                  setWorkDate(event.target.value)
                  clearError("workDate")
                }}
                aria-invalid={Boolean(errors.workDate)}
                disabled={isSubmitting || scheduleLater}
              />
              {errors.workDate ? <p className="field-error">{errors.workDate}</p> : null}
            </div>

            <div className="create-entry-field">
              <Label htmlFor={startTimeId}>Start time</Label>
              <Input
                id={startTimeId}
                type="time"
                value={scheduledStartTime}
                onChange={(event) => setScheduledStartTime(event.target.value)}
                disabled={isSubmitting || scheduleLater}
              />
            </div>

            <div className="create-entry-field">
              <Label htmlFor={arrivalWindowId}>Arrival window</Label>
              <Input
                id={arrivalWindowId}
                value={arrivalWindow}
                maxLength={100}
                placeholder="8:00-10:00 AM"
                onChange={(event) => setArrivalWindow(event.target.value)}
                disabled={isSubmitting || scheduleLater}
              />
            </div>

            <div className="create-entry-field">
              <Label htmlFor={durationId}>Estimated duration</Label>
              <Input
                id={durationId}
                value={estimatedDuration}
                maxLength={80}
                placeholder="1 day"
                onChange={(event) => setEstimatedDuration(event.target.value)}
                disabled={isSubmitting || scheduleLater}
              />
            </div>
          </div>

          <label className="schedule-later-control" htmlFor={scheduleLaterId}>
            <input
              id={scheduleLaterId}
              type="checkbox"
              checked={scheduleLater}
              onChange={(event) => setScheduleLater(event.target.checked)}
              disabled={isSubmitting}
            />
            <span>Schedule later</span>
          </label>
        </div>

        <div className="create-entry-section">
          <div className="create-entry-section-title create-entry-section-title-with-label">
            <span>
              <ShieldCheck aria-hidden="true" size={18} />
              <h2>Planned scope</h2>
            </span>
            <small>Optional</small>
          </div>
          <div className="create-entry-field">
            <Label htmlFor={scopeId}>Describe the expected work</Label>
            <Textarea
              id={scopeId}
              value={plannedScope}
              maxLength={500}
              placeholder="Describe what the crew expects to inspect, repair, replace, or install."
              onChange={(event) => setPlannedScope(event.target.value)}
              disabled={isSubmitting}
            />
            <div className="field-footer-row">
              <p>Actual work performed is recorded later before the report is generated.</p>
              <span>{plannedScope.length}/500</span>
            </div>
          </div>

          <div className="create-entry-field create-entry-field-wide create-entry-field-spaced">
            <Label htmlFor={internalNotesId}>Internal notes</Label>
            <Textarea
              id={internalNotesId}
              value={internalNotes}
              maxLength={1000}
              placeholder="Private notes for the company. These do not appear in the customer report."
              onChange={(event) => setInternalNotes(event.target.value)}
              disabled={isSubmitting}
            />
            <div className="field-footer-row">
              <p>Keep gate codes, pricing notes, and crew-only context here.</p>
              <span>{internalNotes.length}/1000</span>
            </div>
          </div>
        </div>

        <div className="create-entry-actions">
          <Button
            className="create-entry-cancel-button"
            type="button"
            variant="ghost"
            onClick={onBackToDashboard}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="create-entry-draft-button"
            type="button"
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
          >
            {submittingAction === "dashboard" ? "Saving draft..." : "Save as draft"}
          </Button>
          <Button className="create-entry-submit-button" type="submit" disabled={isSubmitting}>
            {submittingAction === "addPhotos"
              ? "Creating job..."
              : isOperationalMode
                ? "Create job and add photos"
                : "Create job and add Before photos"}
          </Button>
        </div>
      </section>
    </form>
  )
}
