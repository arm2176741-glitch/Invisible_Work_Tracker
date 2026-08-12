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
  caption: string
}

type SelectedEvidenceFiles = Record<EvidenceCategory, SelectedEvidenceFile[]>

const emptySelectedFiles: SelectedEvidenceFiles = {
  BEFORE: [],
  DURING: [],
  AFTER: [],
}
const acceptedEvidenceImageTypes = "image/jpeg,image/png,image/webp"

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

function getCategoryTitle(category: EvidenceCategory) {
  return evidenceCategories.find((item) => item.category === category)?.title ?? category
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
  const [selectedFiles, setSelectedFiles] =
    useState<SelectedEvidenceFiles>(emptySelectedFiles)
  const [fileInputKeys, setFileInputKeys] = useState<Record<EvidenceCategory, number>>({
    BEFORE: 0,
    DURING: 0,
    AFTER: 0,
  })
  const [uploadingCategory, setUploadingCategory] = useState<EvidenceCategory | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [activeEvidenceCategory, setActiveEvidenceCategory] =
    useState<EvidenceCategory>("BEFORE")
  const evidenceCarouselRef = useRef<HTMLDivElement>(null)
  const evidenceCardRefs = useRef<
    Partial<Record<EvidenceCategory, HTMLElement | null>>
  >({})
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
  const hasWorkDocumentation = Boolean(workEntry.workPerformedSummary?.trim())
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

  function getCategoryEvidence(category: EvidenceCategory) {
    return evidence.filter((evidenceItem) => evidenceItem.category === category)
  }

  function getCategoryState(
    item: (typeof evidenceCategories)[number],
    categoryEvidenceCount = getCategoryEvidence(item.category).length,
  ) {
    if (categoryEvidenceCount > 0) {
      return "complete"
    }

    return item.required ? "missing" : "optional"
  }

  function scrollToEvidenceCategory(category: EvidenceCategory) {
    setActiveEvidenceCategory(category)

    const carousel = evidenceCarouselRef.current
    const card = evidenceCardRefs.current[category]

    if (!carousel || !card) {
      return
    }

    const carouselRect = carousel.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()
    const targetLeft =
      carousel.scrollLeft +
      cardRect.left -
      carouselRect.left -
      (carousel.clientWidth - cardRect.width) / 2
    const maxScrollLeft = Math.max(0, carousel.scrollWidth - carousel.clientWidth)

    carousel.scrollTo({
      left: Math.min(Math.max(targetLeft, 0), maxScrollLeft),
      behavior: "smooth",
    })
  }

  function handleEvidenceCarouselScroll() {
    const carousel = evidenceCarouselRef.current

    if (!carousel) {
      return
    }

    const cards = Array.from(
      carousel.querySelectorAll<HTMLElement>("[data-evidence-category]"),
    )
    const carouselRect = carousel.getBoundingClientRect()
    const carouselCenter = carouselRect.left + carouselRect.width / 2
    let nearestCategory = activeEvidenceCategory
    let nearestDistance = Number.POSITIVE_INFINITY

    cards.forEach((card) => {
      const category = card.dataset.evidenceCategory as EvidenceCategory | undefined

      if (!category) {
        return
      }

      const cardRect = card.getBoundingClientRect()
      const cardCenter = cardRect.left + cardRect.width / 2
      const distance = Math.abs(cardCenter - carouselCenter)

      if (distance < nearestDistance) {
        nearestCategory = category
        nearestDistance = distance
      }
    })

    setActiveEvidenceCategory((currentCategory) =>
      currentCategory === nearestCategory ? currentCategory : nearestCategory,
    )
  }

  function handleFileSelection(category: EvidenceCategory, files: FileList | null) {
    const selectedImages = Array.from(files ?? []).filter((file) =>
      acceptedEvidenceImageTypes.split(",").includes(file.type),
    )

    setSelectedFiles((currentFiles) => {
      currentFiles[category].forEach((item) => URL.revokeObjectURL(item.previewUrl))
      const existingCategoryCount = evidence.filter(
        (evidenceItem) => evidenceItem.category === category,
      ).length
      const categoryTitle = getCategoryTitle(category)

      return {
        ...currentFiles,
        [category]: selectedImages.map((file, index) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          caption: buildDefaultCaption(categoryTitle, existingCategoryCount + index + 1),
        })),
      }
    })
  }

  function updateSelectedCaption(
    category: EvidenceCategory,
    previewUrl: string,
    caption: string,
  ) {
    setSelectedFiles((currentFiles) => ({
      ...currentFiles,
      [category]: currentFiles[category].map((selectedFile) =>
        selectedFile.previewUrl === previewUrl
          ? { ...selectedFile, caption }
          : selectedFile,
      ),
    }))
  }

  function handleDrop(
    category: EvidenceCategory,
    event: DragEvent<HTMLDivElement>,
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

    const filesToUpload = files.map((selectedFile, index) => ({
      file: selectedFile.file,
      previewUrl: selectedFile.previewUrl,
      caption: selectedFile.caption.trim()
        || buildDefaultCaption(item.title, existingCategoryCount + index + 1),
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
                Field evidence
              </p>
              <span>Saved automatically to report</span>
            </div>

            <div
              className="evidence-stage-tabs"
              role="tablist"
              aria-label="Evidence stages"
            >
              {evidenceCategories.map((item) => {
                const categoryEvidenceCount = getCategoryEvidence(item.category).length
                const state = getCategoryState(item, categoryEvidenceCount)
                const isActive = activeEvidenceCategory === item.category
                const shortTitle = item.title.replace(" Work", "")
                const stageStatus = categoryEvidenceCount > 0
                  ? `${categoryEvidenceCount} added`
                  : item.required
                    ? "missing"
                    : "optional"

                return (
                  <button
                    className="evidence-stage-tab"
                    data-active={isActive}
                    data-state={state}
                    key={item.category}
                    role="tab"
                    type="button"
                    aria-controls={`evidence-stage-${item.category}`}
                    aria-label={`${shortTitle} evidence stage, ${stageStatus}`}
                    aria-selected={isActive}
                    onClick={() => scrollToEvidenceCategory(item.category)}
                  >
                    <strong>{shortTitle}</strong>
                    <span className="evidence-stage-dot" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            <p className="evidence-stage-note">
              Choose a photo stage, then take or upload images.
            </p>

            <div
              className="evidence-category-grid"
              ref={evidenceCarouselRef}
              onScroll={handleEvidenceCarouselScroll}
            >
              {evidenceCategories.map((item) => {
                const categoryEvidence = getCategoryEvidence(item.category)
                const selectedForCategory = selectedFiles[item.category]
                const state = getCategoryState(item, categoryEvidence.length)

                return (
                  <article
                    className="evidence-category-card"
                    data-complete={categoryEvidence.length > 0}
                    data-evidence-category={item.category}
                    data-required={item.required}
                    id={`evidence-stage-${item.category}`}
                    key={item.category}
                    ref={(node) => {
                      evidenceCardRefs.current[item.category] = node
                    }}
                    role="tabpanel"
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

                    <div
                      className="evidence-dropzone"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(item.category, event)}
                    >
                      <CloudUpload aria-hidden="true" size={18} />
                      <span>JPEG, PNG, or WebP photos</span>
                      <div className="evidence-file-actions">
                        <label htmlFor={`photo-camera-${item.category}`}>
                          <Camera aria-hidden="true" size={13} />
                          Take photo
                        </label>
                        <label htmlFor={`photo-library-${item.category}`}>
                          Choose files
                        </label>
                      </div>
                    </div>
                    <Input
                      accept={acceptedEvidenceImageTypes}
                      capture="environment"
                      className="evidence-file-input"
                      id={`photo-camera-${item.category}`}
                      key={fileInputKeys[item.category]}
                      type="file"
                      onChange={(event) =>
                        handleFileSelection(item.category, event.target.files)
                      }
                    />
                    <Input
                      accept={acceptedEvidenceImageTypes}
                      className="evidence-file-input"
                      id={`photo-library-${item.category}`}
                      key={`library-${fileInputKeys[item.category]}`}
                      multiple
                      type="file"
                      onChange={(event) =>
                        handleFileSelection(item.category, event.target.files)
                      }
                    />

                    {selectedForCategory.length > 0 ? (
                      <div className="selected-evidence-preview-grid">
                        {selectedForCategory.map((selectedFile, index) => (
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
                            <Input
                              aria-label={`Caption for ${item.title} photo ${index + 1}`}
                              className="evidence-caption-input"
                              maxLength={255}
                              placeholder="Caption for this photo"
                              value={selectedFile.caption}
                              onChange={(event) =>
                                updateSelectedCaption(
                                  item.category,
                                  selectedFile.previewUrl,
                                  event.target.value,
                                )
                              }
                            />
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
