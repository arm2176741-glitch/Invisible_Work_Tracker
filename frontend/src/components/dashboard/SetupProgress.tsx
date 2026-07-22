const steps = [
  "Create company workspace",
  "Create work entry",
  "Add before and after photos",
  "Generate proof report",
]

export function SetupProgress() {
  return (
    <section className="card section-card">
      <p className="eyebrow">Workflow complete</p>
      <h3>First proof loop is visible</h3>
      <p className="card-copy">
        The React migration starts from the validated workflow instead of a blank page.
      </p>

      <div className="step-list">
        {steps.map((step, index) => (
          <div className="step-row" key={step}>
            <span className="step-number">{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
