import type { ReportSnapshot, WorkEntry, Workspace } from "@/types/domain"

export const currentWorkspace: Workspace = {
  id: 1,
  name: "Arvizu Roofing LLC",
  role: "OWNER",
  status: "ACTIVE",
  memberCount: 1,
  workEntryCount: 2,
  reportCount: 1,
}

export const workEntries: WorkEntry[] = [
  {
    id: 101,
    jobName: "Roof Tear Off",
    jobAddress: "1003 N 26th St, Phoenix, AZ 85008",
    workType: "Roofing",
    workDate: "2026-07-21",
    status: "COMPLETED",
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
]

export const mockReport: ReportSnapshot = {
  id: 501,
  reportNumber: "FP-2026-000501",
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
