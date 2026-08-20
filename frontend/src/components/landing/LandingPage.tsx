import { ArrowRight, Camera, Check, FileText, ShieldCheck } from "lucide-react"

export function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="FieldProof">
        <a className="landing-brand" href="/" aria-label="FieldProof home">
          <span aria-hidden="true">FP</span>
          <strong>FieldProof</strong>
        </a>
        <a className="landing-login-link" href="/login">
          Log in
        </a>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Proof-of-work reports for contractors</p>
          <h1>FieldProof</h1>
          <p>
            Capture jobsite evidence, verify report readiness, and deliver a
            permanent proof record your customers can trust.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-primary-action" href="/login">
              Log in to FieldProof
              <ArrowRight aria-hidden="true" size={17} />
            </a>
            <a className="landing-secondary-action" href="/login?mode=create">
              Create account
            </a>
          </div>
        </div>
      </section>

      <section className="landing-proof-strip" aria-label="FieldProof workflow">
        <article>
          <Camera aria-hidden="true" size={18} />
          <span>Capture evidence</span>
        </article>
        <article>
          <ShieldCheck aria-hidden="true" size={18} />
          <span>Prove readiness</span>
        </article>
        <article>
          <FileText aria-hidden="true" size={18} />
          <span>Send the exact report</span>
        </article>
        <article>
          <Check aria-hidden="true" size={18} />
          <span>Preserve delivery history</span>
        </article>
      </section>
    </main>
  )
}
