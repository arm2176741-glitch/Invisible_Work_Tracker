export type MembershipRole = "OWNER" | "ADMIN" | "CREW" | "SUBCONTRACTOR"

export type WorkEntryStatus = "DRAFT" | "SUBMITTED" | "COMPLETED"

export type PhotoCategory = "BEFORE" | "DURING" | "AFTER"

export type ReportStatus = "GENERATED"

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
