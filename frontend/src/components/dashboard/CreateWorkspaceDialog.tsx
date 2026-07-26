import { BriefcaseBusiness, FileText, Image, Info } from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface CreateWorkspaceInput {
  name: string
  primaryTrade: string
  phone?: string
  email?: string
}

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateWorkspace: (input: CreateWorkspaceInput) => Promise<void> | void
}

function validateWorkspaceName(value: string) {
  const normalized = value.trim()

  if (normalized.length === 0) {
    return "Workspace name is required."
  }

  if (normalized.length < 2) {
    return "Workspace name must contain at least 2 characters."
  }

  if (normalized.length > 100) {
    return "Workspace name cannot exceed 100 characters."
  }

  return null
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreateWorkspace,
}: CreateWorkspaceDialogProps) {
  const nameInputId = useId()
  const tradeInputId = useId()
  const phoneInputId = useId()
  const emailInputId = useId()
  const errorId = useId()
  const [workspaceName, setWorkspaceName] = useState("")
  const [primaryTrade, setPrimaryTrade] = useState("Roofing")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedName = workspaceName.trim()
    const validationError = validateWorkspaceName(normalizedName)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await onCreateWorkspace({
        name: normalizedName,
        primaryTrade,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      })
      setWorkspaceName("")
      setPrimaryTrade("Roofing")
      setPhone("")
      setEmail("")
      onOpenChange(false)
    } catch {
      setError("Workspace could not be created. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) {
      return
    }

    if (!nextOpen) {
      setError(null)
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="workspace-dialog">
        <form onSubmit={handleSubmit}>
          <div className="workspace-dialog-grid">
            <div className="workspace-dialog-main">
              <DialogHeader>
                <p className="eyebrow">Step 1 of 5</p>
                <DialogTitle className="workspace-dialog-title">
                  Create your workspace
                </DialogTitle>
                <DialogDescription className="workspace-dialog-copy">
                  Set up the company where jobs, crew members, photos, and proof
                  reports will live.
                </DialogDescription>
              </DialogHeader>

              <div className="workspace-info-callout">
                <Info aria-hidden="true" size={17} />
                <p>
                  A workspace is the company container for every FieldProof job,
                  photo, crew member, and report.
                </p>
              </div>

              <div className="workspace-form-stack">
                <div className="workspace-form-field">
                  <Label htmlFor={nameInputId}>Workspace name *</Label>
                  <Input
                    id={nameInputId}
                    name="workspaceName"
                    value={workspaceName}
                    onChange={(event) => {
                      setWorkspaceName(event.target.value)
                      if (error) {
                        setError(null)
                      }
                    }}
                    placeholder="e.g. Arvizu Roofing LLC"
                    autoComplete="organization"
                    maxLength={100}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                    disabled={isSubmitting}
                  />
                  {error ? (
                    <p className="workspace-form-error" id={errorId}>
                      {error}
                    </p>
                  ) : (
                    <p className="workspace-form-help">
                      This is the name of your company or organization.
                    </p>
                  )}
                </div>

                <div className="workspace-form-field">
                  <Label htmlFor={tradeInputId}>Primary trade *</Label>
                  <select
                    id={tradeInputId}
                    name="primaryTrade"
                    value={primaryTrade}
                    onChange={(event) => setPrimaryTrade(event.target.value)}
                    disabled={isSubmitting}
                  >
                    <option>Roofing</option>
                    <option>General contracting</option>
                    <option>Remodeling</option>
                    <option>Restoration</option>
                    <option>Painting</option>
                    <option>Other</option>
                  </select>
                  <p className="workspace-form-help">
                    Select the trade that best represents your work.
                  </p>
                </div>

                <div className="workspace-form-field">
                  <Label htmlFor={phoneInputId}>Company phone (optional)</Label>
                  <Input
                    id={phoneInputId}
                    name="companyPhone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    disabled={isSubmitting}
                  />
                  <p className="workspace-form-help">
                    Used on reports and for customer communication.
                  </p>
                </div>

                <div className="workspace-form-field">
                  <Label htmlFor={emailInputId}>Company email (optional)</Label>
                  <Input
                    id={emailInputId}
                    name="companyEmail"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="info@arvizuroofing.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                  <p className="workspace-form-help">
                    Used on reports and for customer communication.
                  </p>
                </div>
              </div>
            </div>

            <aside className="workspace-next-panel" aria-label="What happens next">
              <p className="eyebrow">What happens next</p>
              <div className="workspace-next-list">
                <div>
                  <span>
                    <BriefcaseBusiness aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <strong>1. Create your first work entry</strong>
                    <p>Add job details, schedule, and assignment in minutes.</p>
                  </div>
                </div>
                <div>
                  <span>
                    <Image aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <strong>2. Add Before and After evidence</strong>
                    <p>Upload photos and notes to document completed work.</p>
                  </div>
                </div>
                <div>
                  <span>
                    <FileText aria-hidden="true" size={16} />
                  </span>
                  <div>
                    <strong>3. Generate a customer-ready report</strong>
                    <p>Turn documentation into a professional report in seconds.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <DialogFooter className="workspace-dialog-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
