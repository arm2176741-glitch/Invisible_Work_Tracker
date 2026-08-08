import type { EvidenceCategory } from "@/lib/onboarding"
import type { WorkEntryStatus } from "@/types/domain"

const API_BASE = "/api"

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(
    status: number,
    code: string | undefined,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

interface AuthResponse {
  token?: string
  message?: string
}

export interface CurrentUserResponse {
  id: number
  email: string
  name: string
  role: string
}

export interface OrganizationResponse {
  id: number
  name: string
  active: boolean
  createdByUserId: number
  role: string
  membershipStatus: string
  createdAt: string
  updatedAt: string
}

export interface WorkEntryResponse {
  id: number
  organizationId: number
  userId: number
  jobName: string
  jobAddress: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  customerContactName?: string | null
  workType: string
  description: string
  status: WorkEntryStatus
  workDate?: string | null
  scheduledStartTime?: string | null
  arrivalWindow?: string | null
  estimatedDuration?: string | null
  assignedCrew?: string | null
  siteAccessNotes?: string | null
  internalNotes?: string | null
  createdAt: string
  updatedAt: string
  report?: ReportResponse | null
}

export interface WorkEntryPhotoResponse {
  id: number
  workEntryId: number
  uploadedByUserId: number
  category: EvidenceCategory
  originalFilename: string
  caption: string
  contentType: string
  fileSizeBytes: number
  createdAt: string
}

export interface ReportResponse {
  id: number
  workEntryId: number
  reportNumber: string
  status: "GENERATED" | "SHARED"
  snapshotJson: string
  generatedAt: string
  reviewedAt?: string | null
  createdAt: string
}

export interface ReportShareLinkResponse {
  id: number
  reportId: number
  shareUrl: string | null
  expiresAt: string
  revokedAt?: string | null
}

async function parseResponseBody(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const body = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof body === "object" && body !== null ? body.code : undefined,
      typeof body === "object" && body !== null && "message" in body
        ? String(body.message)
        : response.statusText || "Request failed",
    )
  }

  return body as T
}

async function jsonRequest<T>(
  path: string,
  body: unknown,
  token?: string,
  method = "POST",
) {
  return apiRequest<T>(
    path,
    {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    token,
  )
}

export async function registerAccount(input: {
  name: string
  email: string
  password: string
}) {
  return jsonRequest<AuthResponse>("/auth/register", input)
}

export async function loginAccount(input: {
  email: string
  password: string
}) {
  const response = await jsonRequest<AuthResponse>("/auth/login", input)

  if (!response.token) {
    throw new ApiError(500, "AUTH_TOKEN_MISSING", "Login did not return a session token.")
  }

  return response.token
}

export function getCurrentUser(token: string) {
  return apiRequest<CurrentUserResponse>("/auth/me", {}, token)
}

export function logoutAccount(token: string) {
  return apiRequest<null>(
    "/auth/logout",
    {
      method: "POST",
    },
    token,
  )
}

export function listOrganizations(token: string) {
  return apiRequest<OrganizationResponse[]>("/organizations", {}, token)
}

export function createOrganization(token: string, name: string) {
  return jsonRequest<OrganizationResponse>("/organizations", { name }, token)
}

export function listWorkEntries(token: string, organizationId: number) {
  return apiRequest<WorkEntryResponse[]>(
    `/work-entries?organizationId=${encodeURIComponent(String(organizationId))}`,
    {},
    token,
  )
}

export function createWorkEntry(
  token: string,
  input: {
    organizationId: number
    jobName: string
    jobAddress: string
    customerName: string
    customerPhone?: string
    customerEmail?: string
    customerContactName?: string
    workType: string
    description: string
    workDate?: string
    scheduledStartTime?: string
    arrivalWindow?: string
    estimatedDuration?: string
    assignedCrew?: string
    siteAccessNotes?: string
    internalNotes?: string
  },
) {
  return jsonRequest<WorkEntryResponse>("/work-entries", input, token)
}

export function updateWorkEntryStatus(
  token: string,
  workEntryId: number,
  status: WorkEntryStatus,
) {
  return jsonRequest<WorkEntryResponse>(
    `/work-entries/${workEntryId}/status`,
    { status },
    token,
    "PATCH",
  )
}

export function updateWorkEntrySummary(
  token: string,
  workEntryId: number,
  description: string,
) {
  return jsonRequest<WorkEntryResponse>(
    `/work-entries/${workEntryId}/summary`,
    { description },
    token,
    "PATCH",
  )
}

export function listWorkEntryPhotos(token: string, workEntryId: number) {
  return apiRequest<WorkEntryPhotoResponse[]>(
    `/work-entries/${workEntryId}/photos`,
    {},
    token,
  )
}

export function uploadWorkEntryPhoto(
  token: string,
  workEntryId: number,
  input: {
    category: EvidenceCategory
    caption?: string
    file: File
  },
) {
  const formData = new FormData()
  formData.append("category", input.category)

  if (input.caption) {
    formData.append("caption", input.caption)
  }

  formData.append("file", input.file)

  return apiRequest<WorkEntryPhotoResponse>(
    `/work-entries/${workEntryId}/photos`,
    {
      method: "POST",
      body: formData,
    },
    token,
  )
}

export function generateReport(token: string, workEntryId: number) {
  return apiRequest<ReportResponse>(
    `/work-entries/${workEntryId}/reports`,
    {
      method: "POST",
    },
    token,
  )
}

export function getReport(token: string, reportId: number) {
  return apiRequest<ReportResponse>(`/reports/${reportId}`, {}, token)
}

export function markReportReviewed(token: string, reportId: number) {
  return apiRequest<ReportResponse>(
    `/reports/${reportId}/reviewed`,
    {
      method: "POST",
    },
    token,
  )
}

export function createReportShareLink(token: string, reportId: number) {
  return apiRequest<ReportShareLinkResponse>(
    `/reports/${reportId}/share-links`,
    {
      method: "POST",
    },
    token,
  )
}

export function revokeReportShareLink(
  token: string,
  reportId: number,
  shareLinkId: number,
) {
  return apiRequest<ReportShareLinkResponse>(
    `/reports/${reportId}/share-links/${shareLinkId}`,
    {
      method: "DELETE",
    },
    token,
  )
}

export function getSharedReport(rawToken: string) {
  return apiRequest<ReportResponse>(
    `/shared/reports/${encodeURIComponent(rawToken)}`,
  )
}
