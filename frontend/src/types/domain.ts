export type MembershipRole = "OWNER" | "ADMIN" | "CREW" | "SUBCONTRACTOR"

export type WorkEntryStatus = "DRAFT" | "SUBMITTED" | "COMPLETED"

export type PhotoCategory = "BEFORE" | "DURING" | "AFTER"

export type ReportStatus = "GENERATED" | "SHARED"

export type DashboardMode = "onboarding" | "operational"

export interface Workspace {
  id: number
  name: string
  role: MembershipRole
  status: "ACTIVE" | "INACTIVE"
  memberCount: number
  workEntryCount: number
  reportCount: number
}

export interface WorkEntryPhoto {
  id: number
  category: PhotoCategory
  caption: string
  uploadedAt: string
  previewUrl?: string
  contentUrl?: string
}

export interface WorkEntry {
  id: number
  jobName: string
  jobAddress: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  customerContactName?: string | null
  workType: string
  workDate?: string | null
  scheduledStartTime?: string | null
  arrivalWindow?: string | null
  estimatedDuration?: string | null
  assignedCrew?: string | null
  siteAccessNotes?: string | null
  internalNotes?: string | null
  status: WorkEntryStatus
  workPerformed: string
  proofReady: boolean
  reportId?: number
  reportNumber?: string
  thumbnailUrl: string
  updatedLabel: string
  photoCount: number
  photos: WorkEntryPhoto[]
}

export interface ReportSnapshot {
  id: number
  workEntryId?: number
  reportNumber: string
  status: ReportStatus
  generatedAt: string
  reviewedAt?: string | null
  workspaceName: string
  jobName: string
  jobAddress: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  customerContactName?: string | null
  workType: string
  workDate?: string | null
  scheduledStartTime?: string | null
  arrivalWindow?: string | null
  estimatedDuration?: string | null
  workStatus: WorkEntryStatus
  workPerformed: string
  photos: WorkEntryPhoto[]
}

export interface DashboardSummary {
  activeJobs: number
  needsEvidence: number
  readyForReport: number
  proofReady: number
  reportsGenerated: number
}

export interface AttentionItem {
  id: number
  title: string
  detail: string
  tone: "warning" | "info"
}

export interface UpcomingItem {
  id: number
  title: string
  detail: string
  timeLabel: string
}

export interface ActivityItem {
  id: number
  title: string
  detail: string
  tone: "success" | "neutral" | "report"
}

export interface LoginResult {
  userName: string
  dashboardMode: DashboardMode
  token: string
  rememberSession?: boolean
}
