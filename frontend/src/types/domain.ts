export type MembershipRole = "OWNER" | "ADMIN" | "CREW" | "SUBCONTRACTOR"

export type WorkEntryStatus = "DRAFT" | "SUBMITTED" | "COMPLETED"

export type PhotoCategory = "BEFORE" | "DURING" | "AFTER"

export type ReportStatus = "GENERATED"

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
}

export interface WorkEntry {
  id: number
  jobName: string
  jobAddress: string
  workType: string
  workDate: string
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
  reportNumber: string
  status: ReportStatus
  generatedAt: string
  workspaceName: string
  jobName: string
  jobAddress: string
  workType: string
  workDate: string
  workStatus: WorkEntryStatus
  workPerformed: string
  photos: WorkEntryPhoto[]
}

export interface DashboardSummary {
  activeJobs: number
  needsEvidence: number
  proofReady: number
  reportsGenerated: number
}

export interface AttentionItem {
  id: number
  title: string
  detail: string
  tone: "warning" | "info"
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
}
