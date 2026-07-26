import type {
  ActivityItem,
  AttentionItem,
  DashboardSummary,
  ReportSnapshot,
  WorkEntry,
  Workspace,
} from "@/types/domain"

export const currentWorkspace: Workspace = {
  id: 1,
  name: "Arvizu Roofing LLC",
  role: "OWNER",
  status: "ACTIVE",
  memberCount: 2,
  workEntryCount: 7,
  reportCount: 12,
}

export const dashboardSummary: DashboardSummary = {
  activeJobs: 7,
  needsEvidence: 3,
  proofReady: 5,
  reportsGenerated: 12,
}

export const workEntries: WorkEntry[] = [
  {
    id: 101,
    jobName: "Roof Tear Off",
    jobAddress: "1003 N 26th St, Phoenix, AZ 85008",
    workType: "Roofing",
    workDate: "2026-07-21",
    status: "COMPLETED",
    reportNumber: "RPT-2026-0721-001",
    thumbnailUrl: "/roofing-hero.png",
    updatedLabel: "Updated 2h ago",
    workPerformed:
      "Removed damaged shingles, inspected the roof deck, and installed replacement materials on the front slope.",
    proofReady: true,
    reportId: 501,
    photoCount: 3,
    photos: [
      {
        id: 1,
        category: "BEFORE",
        caption: "Existing shingle damage",
        uploadedAt: "2026-07-21T08:22:00",
      },
      {
        id: 2,
        category: "DURING",
        caption: "Underlayment installation",
        uploadedAt: "2026-07-21T10:14:00",
      },
      {
        id: 3,
        category: "AFTER",
        caption: "Completed front slope",
        uploadedAt: "2026-07-21T13:18:00",
      },
    ],
  },
  {
    id: 102,
    jobName: "Fascia Repair",
    jobAddress: "2148 E Polk St, Phoenix, AZ 85006",
    workType: "Exterior repair",
    workDate: "2026-07-20",
    status: "DRAFT",
    reportNumber: "RPT-2026-0720-004",
    thumbnailUrl: "/work-entry-fascia.svg",
    updatedLabel: "Updated 1d ago",
    workPerformed: "Prepared damaged fascia area for replacement.",
    proofReady: false,
    photoCount: 1,
    photos: [
      {
        id: 4,
        category: "BEFORE",
        caption: "Damaged fascia board before repair",
        uploadedAt: "2026-07-20T09:05:00",
      },
    ],
  },
  {
    id: 103,
    jobName: "Storm Damage Inspection",
    jobAddress: "3251 N 15th Ave, Phoenix, AZ 85015",
    workType: "Inspection",
    workDate: "2026-07-19",
    status: "SUBMITTED",
    reportNumber: "RPT-2026-0719-007",
    thumbnailUrl: "/work-entry-storm.svg",
    updatedLabel: "Updated 2d ago",
    workPerformed: "Documented visible storm damage and roof surface conditions.",
    proofReady: false,
    photoCount: 5,
    photos: [
      {
        id: 5,
        category: "BEFORE",
        caption: "Damaged shingles after storm",
        uploadedAt: "2026-07-19T08:48:00",
      },
      {
        id: 6,
        category: "DURING",
        caption: "Inspection close-up of damaged area",
        uploadedAt: "2026-07-19T09:12:00",
      },
    ],
  },
]

export const attentionItems: AttentionItem[] = [
  {
    id: 1,
    title: "Fascia Repair",
    detail: "1 work entry needs after evidence",
    tone: "warning",
  },
  {
    id: 2,
    title: "Storm Damage Inspection",
    detail: "Inspection pending review",
    tone: "info",
  },
  {
    id: 3,
    title: "Mesa Retail Center",
    detail: "2 work entries need evidence",
    tone: "warning",
  },
]

export const recentActivities: ActivityItem[] = [
  {
    id: 1,
    title: "Roof Tear Off report generated",
    detail: "1003 N 26th St - 2h ago",
    tone: "success",
  },
  {
    id: 2,
    title: "5 photos added to Fascia Repair",
    detail: "2148 E Polk St - 1d ago",
    tone: "neutral",
  },
  {
    id: 3,
    title: "Storm Damage report completed",
    detail: "3251 N 15th Ave - 2d ago",
    tone: "report",
  },
]

export const mockReport: ReportSnapshot = {
  id: 501,
  reportNumber: "RPT-2026-0721-001",
  status: "GENERATED",
  generatedAt: "2026-07-21T18:53:00",
  workspaceName: currentWorkspace.name,
  jobName: workEntries[0].jobName,
  jobAddress: workEntries[0].jobAddress,
  workType: workEntries[0].workType,
  workDate: workEntries[0].workDate,
  workStatus: workEntries[0].status,
  workPerformed: workEntries[0].workPerformed,
  photos: workEntries[0].photos,
}
