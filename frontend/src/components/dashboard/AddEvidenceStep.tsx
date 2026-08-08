import { useEffect, useRef, useState, type DragEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  CloudUpload,
  Plus,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type {
  EvidenceCategory,
  OnboardingEvidenceItem,
  OnboardingFirstWorkEntry,
} from "@/lib/onboarding"

interface AddEvidenceStepProps {
  workEntry: OnboardingFirstWorkEntry
  workspaceName: string
  onUploadEvidence: (input: {
    category: EvidenceCategory
    files: Array<{
      file: File
      caption: string
      previewUrl: string
    }>
  }) => Promise<OnboardingEvidenceItem[]>
  onBackToDashboard: (evidence: OnboardingEvidenceItem[]) => void
  onEvidenceReady: (evidence: OnboardingEvidenceItem[]) => void
}

const evidenceCategories: Array<{
  category: EvidenceCategory
  title: string
  description: string
  required: boolean
}> = [
  {
    category: "BEFORE",
    title: "Before Work",
    description: "Show the original job condition before work begins.",
    required: true,
  },
  {
    category: "DURING",
    title: "During Work",
    description: "Show progress, materials, or work conditions.",
    required: false,
  },
  {
    category: "AFTER",
    title: "After Work",
    description: "Show the completed work before leaving the jobsite.",
    required: true,
  },
]

interface SelectedEvidenceFile {
  file: File
  previewUrl: string
}

type SelectedEvidenceFiles = Record<EvidenceCategory, SelectedEvidenceFile[]>

const emptySelectedFiles: SelectedEvidenceFiles = {
  BEFORE: [],
  DURING: [],
  AFTER: [],
}

function formatEvidenceTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatFileSize(bytes?: number) {
  if (!bytes) {
    return "Unknown size"
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function buildDefaultCaption(categoryTitle: string, photoNumber: number) {
  return `${categoryTitle} photo ${photoNumber}`
}

function formatJobDate(value?: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function AddEvidenceStep({
  workEntry,
  workspaceName,
  onUploadEvidence,
  onBackToDashboard,
  onEvidenceReady,
}: AddEvidenceStepProps) {
  const [evidence, setEvidence] = useState<OnboardingEvidenceItem[]>(
    workEntry.evidence ?? [],
  )
  const [captions, setCaptions] = useState<Record<EvidenceCategory, string>>({
    BEFORE: "",
    DURING: "",
    AFTER: "",
  })
  const [selectedFiles, setSelectedFiles] =
    useState<SelectedEvidenceFiles>(emptySelectedFiles)
  const [fileInputKeys, setFileInputKeys] = useState<Record<EvidenceCategory, number>>({
    BEFORE: 0,
    DURING: 0,
    AFTER: 0,
  })
  const [uploadingCategory, setUploadingCategory] = useState<EvidenceCategory | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const selectedFilesRef = useRef(selectedFiles)

  useEffect(() => {
    selectedFilesRef.current = selectedFiles
  }, [selectedFiles])

  useEffect(() => {
    return () => {
      Object.values(selectedFilesRef.current)
        .flat()
        .forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  const hasBefore = evidence.some((item) => item.category === "BEFORE")
  const hasAfter = evidence.some((item) => item.category === "AFTER")
  const hasDuring = evidence.some((item) => item.category === "DURING")
  const hasWorkDocumentation = Boolean(workEntry.description?.trim())
  const evidenceReady = hasBefore && hasAfter
  const jobMeta = [
    workEntry.workType,
    workEntry.propertyAddress?.split(",")[0],
    formatJobDate(workEntry.workDate),
  ].filter(Boolean).join(" - ")
  const footerStatusItems = [
    { label: "Work docs", complete: hasWorkDocumentation },
    { label: "Before", complete: hasBefore },
    { label: "After", complete: hasAfter },
    { label: "During (optional)", complete: hasDuring },
  ]

  function handleFileSelection(category: EvidenceCategory, files: FileList | null) {
    const selectedImages = Array.from(files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    )

    setSelectedFiles((currentFiles) => {
      currentFiles[category].forEach((item) => URL.revokeObjectURL(item.previewUrl))

      return {
        ...currentFiles,
        [category]: selectedImages.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      }
    })
  }

  function handleDrop(
    category: EvidenceCategory,
    event: DragEvent<HTMLLabelElement>,
  ) {
    event.preventDefault()
    handleFileSelection(category, event.dataTransfer.files)
  }

  async function addEvidence(item: (typeof evidenceCategories)[number]) {
    const files = selectedFiles[item.category]

    if (files.length === 0) {
      return
    }

    const existingCategoryCount = evidence.filter(
      (evidenceItem) => evidenceItem.category === item.category,
    ).length
    const caption = captions[item.category].trim()

    const filesToUpload = files.map((selectedFile, index) => ({
      file: selectedFile.file,
      previewUrl: selectedFile.previewUrl,
      caption:
        caption.length > 0
          ? files.length > 1
            ? `${caption} ${index + 1}`
            : caption
          : buildDefaultCaption(item.title, existingCategoryCount + index + 1),
    }))

    setUploadingCategory(item.category)
    setUploadError(null)

    try {
      const uploadedEvidence = await onUploadEvidence({
        category: item.category,
        files: filesToUpload,
      })

      setEvidence((currentEvidence) => [
        ...currentEvidence,
        ...uploadedEvidence.map((uploadedItem, index) => ({
          ...uploadedItem,
          previewUrl: uploadedItem.previewUrl ?? filesToUpload[index]?.previewUrl,
        })),
      ])
    } catch {
      setUploadError("Photo upload failed. Use JPEG, PNG, or WebP under 20MB and try again.")
      return
    } finally {
      setUploadingCategory(null)
    }

    setSelectedFiles((currentFiles) => ({
      ...currentFiles,
      [item.category]: [],
    }))
    setCaptions((currentCaptions) => ({
      ...currentCaptions,
      [item.category]: "",
    }))
    setFileInputKeys((currentKeys) => ({
      ...currentKeys,
      [item.category]: currentKeys[item.category] + 1,
    }))
  }

  function leaveEvidenceStep() {
    Object.values(selectedFiles)
      .flat()
      .forEach((item) => URL.revokeObjectURL(item.previewUrl))
    onBackToDashboard(evidence)
  }

  return (
    <div className="add-evidence-page">
      <header className="add-evidence-flow-header">
        <div className="add-evidence-header-copy">
          <button className="back-link-button" type="button" onClick={leaveEvidenceStep}>
            <ArrowLeft aria-hidden="true" size={15} />
            Back to dashboard
          </button>
          <p className="eyebrow">Step 3 of 5</p>
          <h1>Add Before and After photos</h1>
          <p>Upload at least one Before and one After photo to continue.</p>
        </div>

        <div className="add-evidence-header-meta">
          <p>{jobMeta || workspaceName}</p>
        </div>
      </header>

      <div className="add-evidence-layout">
        <section className="card add-evidence-card">
          {uploadError ? (
            <p className="form-error evidence-upload-error">{uploadError}</p>
          ) : null}

          <section className="evidence-documentation-panel">
            <div className="evidence-documentation-header">
              <p>
                <span className="evidence-header-dot" />
                Field evidence documentation
              </p>
              <span>Saved automatically to report</span>
            </div>

            <div className="evidence-category-grid">
              {evidenceCategories.map((item) => {
                const categoryEvidence = evidence.filter(
                  (evidenceItem) => evidenceItem.category === item.category,
                )
                const selectedForCategory = selectedFiles[item.category]
                const state =
                  categoryEvidence.length > 0
                    ? "complete"
                    : item.required
                      ? "missing"
                      : "optional"

                return (
                  <article
                    className="evidence-category-card"
                    data-complete={categoryEvidence.length > 0}
                    data-required={item.required}
                    key={item.category}
                  >
                    <div className="evidence-category-top">
                      <div>
                        <h2>{item.title}</h2>
                        <p>{item.description}</p>
                      </div>
                      <span className="evidence-state-pill" data-state={state}>
                        {categoryEvidence.length > 0
                          ? `${categoryEvidence.length} added`
                          : item.required
                            ? "Required - missing"
                            : "Optional"}
                      </span>
                    </div>

                    <Label
                      className="evidence-dropzone"
                      htmlFor={`photo-${item.category}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(item.category, event)}
                    >
                      <CloudUpload aria-hidden="true" size={18} />
                      <span>Drop photos or browse</span>
                    </Label>
                    <Input
                      accept="image/*"
                      className="evidence-file-input"
                      id={`photo-${item.category}`}
                      key={fileInputKeys[item.category]}
                      multiple
                      type="file"
                      onChange={(event) =>
                        handleFileSelection(item.category, event.target.files)
                      }
                    />

                    <Input
                      aria-label={`Caption for ${item.title}`}
                      className="evidence-caption-input"
                      placeholder="Add caption (appears in report)"
                      value={captions[item.category]}
                      onChange={(event) =>
                        setCaptions((currentCaptions) => ({
                          ...currentCaptions,
                          [item.category]: event.target.value,
                        }))
                      }
                    />

                    {selectedForCategory.length > 0 ? (
                      <div className="selected-evidence-preview-grid">
                        {selectedForCategory.map((selectedFile) => (
                          <div
                            className="selected-evidence-preview"
                            key={selectedFile.previewUrl}
                          >
                            <img
                              src={selectedFile.previewUrl}
                              alt=""
                              loading="lazy"
                            />
                            <span>{selectedFile.file.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <button
                      className="evidence-add-button"
                      type="button"
                      onClick={() => addEvidence(item)}
                      disabled={
                        selectedForCategory.length === 0 ||
                        uploadingCategory !== null
                      }
                    >
                      <Plus aria-hidden="true" size={13} />
                      {uploadingCategory === item.category
                        ? "Uploading..."
                        : selectedForCategory.length > 1
                          ? `Add ${selectedForCategory.length} photos`
                          : "Add photo"}
                    </button>

                    <div className="evidence-list">
                      {categoryEvidence.length === 0 ? (
                        <p className="evidence-empty">No photos added yet</p>
                      ) : (
                        categoryEvidence.map((evidenceItem) => (
                          <div className="evidence-list-item" key={evidenceItem.id}>
                            {evidenceItem.previewUrl ? (
                              <img src={evidenceItem.previewUrl} alt="" loading="lazy" />
                            ) : (
                              <Camera aria-hidden="true" size={15} />
                            )}
                            <div>
                              <strong>{evidenceItem.caption}</strong>
                              <span>
                                {evidenceItem.fileName
                                  ? `${evidenceItem.fileName} - ${formatFileSize(
                                      evidenceItem.fileSizeBytes,
                                    )}`
                                  : formatEvidenceTime(evidenceItem.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

        </section>
      </div>

      <footer className="evidence-footer-bar">
        <div>
          <div className="evidence-footer-status-list">
            {footerStatusItems.map((item) => {
              const StatusIcon = item.complete ? CheckCircle2 : X

              return (
                <span data-complete={item.complete} key={item.label}>
                  <StatusIcon aria-hidden="true" size={12} />
                  {item.label}
                </span>
              )
            })}
          </div>
          <p>Captions and photos appear in the customer report.</p>
        </div>

        <div className="evidence-footer-actions">
          <Button type="button" variant="ghost" onClick={leaveEvidenceStep}>
            Save and return
          </Button>
          <Button
            type="button"
            disabled={!evidenceReady}
            onClick={() => onEvidenceReady(evidence)}
          >
            Continue to report
            <ArrowRight aria-hidden="true" size={15} />
          </Button>
        </div>
      </footer>
    </div>
  )
}
