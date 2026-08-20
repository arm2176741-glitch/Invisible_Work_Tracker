import {
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ApiError, getCurrentUser, loginAccount, registerAccount } from "@/lib/api"
import type { LoginResult } from "@/types/domain"

interface LoginPageProps {
  onLogin: (result: LoginResult) => void
}

type AuthMode = "sign-in" | "create-account" | "reset-password"

type AuthError = {
  title: string
  detail: string
}

function getInitialAuthMode(): AuthMode {
  const mode = new URLSearchParams(window.location.search).get("mode")

  return mode === "create" ? "create-account" : "sign-in"
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function getPasswordRequirements(password: string) {
  return [
    {
      label: "10+ chars",
      met: password.length >= 10,
    },
    {
      label: "Mixed case",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: "Number",
      met: /\d/.test(password),
    },
  ]
}

function getFriendlyAuthError(error: unknown): AuthError {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: "We couldn't sign you in",
        detail: "The email or password is incorrect. Check your details and try again.",
      }
    }

    if (error.status === 429) {
      return {
        title: "Sign-in temporarily unavailable",
        detail:
          "Too many unsuccessful attempts were made. Try again later or reset your password.",
      }
    }

    if (error.status === 403) {
      return {
        title: "Sign-in unavailable",
        detail: "This account cannot currently access FieldProof.",
      }
    }

    if (error.status === 409) {
      return {
        title: "Account already exists",
        detail: "Use sign in for this email address, or reset the password.",
      }
    }

    return {
      title: "Request failed",
      detail: error.message,
    }
  }

  return {
    title: "Network failure",
    detail: "Could not reach FieldProof. Check your connection and try again.",
  }
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>(getInitialAuthMode)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [resetMessage, setResetMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCreatingAccount = authMode === "create-account"
  const isResettingPassword = authMode === "reset-password"
  const passwordRequirements = useMemo(
    () => getPasswordRequirements(password),
    [password],
  )
  const completedPasswordRequirementCount = passwordRequirements.filter(
    (requirement) => requirement.met,
  ).length
  const activePasswordRequirementIndex = passwordRequirements.findIndex(
    (requirement) => !requirement.met,
  )
  const passwordLengthProgress = Math.min(password.length / 10, 1)
  const passwordCaseProgress =
    (/[a-z]/.test(password) ? 0.5 : 0) + (/[A-Z]/.test(password) ? 0.5 : 0)
  const passwordNumberProgress = /\d/.test(password) ? 1 : 0
  const passwordStrengthPercent =
    ((passwordLengthProgress + passwordCaseProgress + passwordNumberProgress) / 3) * 100
  const passwordMeetsRequirements =
    passwordRequirements.every((requirement) => requirement.met)
  const passwordStrengthTone =
    password.length === 0
      ? "empty"
      : passwordMeetsRequirements
        ? "strong"
        : passwordStrengthPercent >= 58
          ? "medium"
          : "weak"

  function setInlineError(title: string, detail: string) {
    setError({ title, detail })
  }

  function handlePasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockActive(event.getModifierState("CapsLock"))
  }

  function handlePasswordFocus() {
    setCapsLockActive(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setResetMessage("")

    if (isResettingPassword) {
      if (!isValidEmail(resetEmail)) {
        setInlineError("Enter a valid email", "Use the email address for your FieldProof account.")
        return
      }

      setError(null)
      setResetMessage(
        "Password reset email delivery will be connected in the backend auth pass.",
      )
      return
    }

    if (isCreatingAccount && fullName.trim().length < 2) {
      setInlineError("Enter your full name", "Use the name your workspace team will recognize.")
      return
    }

    if (!isValidEmail(email)) {
      setInlineError("Enter a valid email", "Use your work email address.")
      return
    }

    if (!password) {
      setInlineError("Enter your password", "Password is required to continue.")
      return
    }

    if (isCreatingAccount && !passwordMeetsRequirements) {
      setInlineError(
        "Password needs more strength",
        "Use at least 10 characters, upper and lowercase letters, and one number.",
      )
      return
    }

    if (isCreatingAccount && password !== confirmPassword) {
      setInlineError("Passwords do not match", "Confirm your password before creating the account.")
      return
    }

    if (isCreatingAccount && !termsAccepted) {
      setInlineError(
        "Agreement required",
        "Accept the Terms of Service and acknowledge the Privacy Policy to continue.",
      )
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim()

      if (isCreatingAccount) {
        await registerAccount({
          name: fullName.trim(),
          email: normalizedEmail,
          password,
        })
      }

      const token = await loginAccount({
        email: normalizedEmail,
        password,
      })
      const currentUser = await getCurrentUser(token)

      onLogin({
        userName: currentUser.name,
        dashboardMode: "onboarding",
        token,
        rememberSession: keepSignedIn,
      })
    } catch (submitError) {
      setError(getFriendlyAuthError(submitError))
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchAuthMode(nextMode: AuthMode) {
    setError(null)
    setResetMessage("")
    setShowPassword(false)
    setShowConfirmPassword(false)
    setCapsLockActive(false)
    setAuthMode(nextMode)
  }

  return (
    <main className="login-page">
      <div className="login-corner-brand" aria-label="FieldProof">
        <div className="brand-mark">FP</div>
        <span>FieldProof</span>
      </div>

      <section className="login-frame" aria-label="FieldProof authentication">
        <div className="login-value-panel">
          <p className="eyebrow">Proof-of-work operations</p>
          <h1>Document the work. Prove the outcome.</h1>
          <p>
            Turn job details and Before, During, and After evidence into
            professional customer-ready reports.
          </p>
          <span>Built for contractors who need a clear record of every job.</span>
        </div>

        <Card className={`login-card ${isCreatingAccount ? "login-card--create" : ""}`}>
          <CardHeader>
            {!isResettingPassword ? (
              <div
                className={`auth-mode-toggle ${
                  isCreatingAccount ? "auth-mode-toggle--create" : "auth-mode-toggle--sign-in"
                }`}
                role="tablist"
                aria-label="Authentication mode"
              >
                <button
                  className={`auth-mode-option ${!isCreatingAccount ? "active" : ""}`}
                  type="button"
                  aria-pressed={!isCreatingAccount}
                  onClick={() => switchAuthMode("sign-in")}
                >
                  Sign in
                </button>
                <button
                  className={`auth-mode-option ${isCreatingAccount ? "active" : ""}`}
                  type="button"
                  aria-pressed={isCreatingAccount}
                  onClick={() => switchAuthMode("create-account")}
                >
                  Create account
                </button>
              </div>
            ) : null}

            <div className="auth-heading-group">
              <CardTitle key={authMode}>
                {isResettingPassword
                  ? "Reset your password"
                  : isCreatingAccount
                    ? "Create your account"
                    : "Sign in"}
              </CardTitle>
              <CardDescription>
                {isResettingPassword
                  ? "Enter your account email to start recovery."
                  : isCreatingAccount
                    ? "Create your FieldProof account. Workspace setup comes next."
                    : "Welcome back. Sign in to continue to your workspace."}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {isResettingPassword ? (
                <div className="form-field">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="input-shell">
                    <Mail aria-hidden="true" size={18} />
                    <Input
                      id="reset-email"
                      autoComplete="email"
                      inputMode="email"
                      type="email"
                      placeholder="you@company.com"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      disabled={isSubmitting}
                      aria-invalid={Boolean(error)}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {isCreatingAccount ? (
                    <div className="form-field auth-field--name">
                      <Label htmlFor="fullName">Full name</Label>
                      <div className="input-shell">
                        <UserRound aria-hidden="true" size={18} />
                        <Input
                          id="fullName"
                          autoComplete="name"
                          type="text"
                          placeholder="Armando Arvizu"
                          value={fullName}
                          onChange={(event) => setFullName(event.target.value)}
                          disabled={isSubmitting}
                          aria-invalid={Boolean(error && fullName.trim().length < 2)}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="form-field auth-field--email">
                    <Label htmlFor="email">Work email</Label>
                    <div className="input-shell">
                      <Mail aria-hidden="true" size={18} />
                      <Input
                        id="email"
                        autoComplete="email"
                        inputMode="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(error && !isValidEmail(email))}
                      />
                    </div>
                  </div>

                  <div className="form-field auth-field--password">
                    <div className="form-label-row">
                      <Label htmlFor="password">Password</Label>
                      {!isCreatingAccount ? (
                        <button
                          className="text-link"
                          type="button"
                          onClick={() => {
                            setResetEmail(email)
                            switchAuthMode("reset-password")
                          }}
                        >
                          Forgot password?
                        </button>
                      ) : null}
                    </div>
                    <div className="input-shell">
                      <LockKeyhole aria-hidden="true" size={18} />
                      <Input
                        id="password"
                        autoComplete={isCreatingAccount ? "new-password" : "current-password"}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onBlur={() => setCapsLockActive(false)}
                        onFocus={handlePasswordFocus}
                        onKeyUp={handlePasswordKey}
                        onChange={(event) => setPassword(event.target.value)}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(error && !password)}
                      />
                      <button
                        className="input-icon-button"
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={isSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff aria-hidden="true" size={17} />
                        ) : (
                          <Eye aria-hidden="true" size={17} />
                        )}
                      </button>
                    </div>
                    {capsLockActive ? (
                      <p className="auth-field-warning" role="status">
                        Caps Lock is on.
                      </p>
                    ) : null}
                  </div>

                  {isCreatingAccount ? (
                    <>
                      <div
                        className="password-requirements password-requirements-inline"
                        data-strength={passwordStrengthTone}
                        aria-label={`${completedPasswordRequirementCount} of ${passwordRequirements.length} password requirements met`}
                        aria-live="polite"
                      >
                        <div className="password-progress-track" aria-hidden="true">
                          <span style={{ width: `${passwordStrengthPercent}%` }} />
                        </div>
                        <div className="password-inline-labels">
                          {passwordRequirements.map((requirement, index) => (
                            <span
                              data-state={
                                requirement.met
                                  ? "met"
                                  : activePasswordRequirementIndex === index
                                    ? "current"
                                    : "pending"
                              }
                              key={requirement.label}
                            >
                              {requirement.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="form-field auth-field--confirm">
                        <Label htmlFor="confirmPassword">Confirm password</Label>
                        <div className="input-shell">
                          <LockKeyhole aria-hidden="true" size={18} />
                          <Input
                            id="confirmPassword"
                            autoComplete="new-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onBlur={() => setCapsLockActive(false)}
                            onFocus={handlePasswordFocus}
                            onKeyUp={handlePasswordKey}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(error && password !== confirmPassword)}
                          />
                          <button
                            className="input-icon-button"
                            type="button"
                            aria-label={
                              showConfirmPassword
                                ? "Hide confirmed password"
                                : "Show confirmed password"
                            }
                            onClick={() =>
                              setShowConfirmPassword((current) => !current)
                            }
                            disabled={isSubmitting}
                          >
                            {showConfirmPassword ? (
                              <EyeOff aria-hidden="true" size={17} />
                            ) : (
                              <Eye aria-hidden="true" size={17} />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </>
              )}

              {!isResettingPassword && !isCreatingAccount ? (
                <div className="auth-option-row">
                  <label className="auth-checkbox">
                    <input
                      type="checkbox"
                      checked={keepSignedIn}
                      onChange={(event) => setKeepSignedIn(event.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span>Keep me signed in on this device</span>
                  </label>
                </div>
              ) : null}

              {isCreatingAccount ? (
                <label className="auth-checkbox auth-consent">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>
                    I agree to the <a href="/terms">Terms of Service</a> and
                    acknowledge the <a href="/privacy">Privacy Policy</a>.
                  </span>
                </label>
              ) : null}

              {error ? (
                <div className="auth-alert" role="alert">
                  <AlertCircle aria-hidden="true" size={17} />
                  <div>
                    <strong>{error.title}</strong>
                    <p>{error.detail}</p>
                  </div>
                </div>
              ) : null}

              {resetMessage ? (
                <div className="auth-alert auth-alert-info" role="status">
                  <ShieldCheck aria-hidden="true" size={17} />
                  <div>
                    <strong>Recovery flow ready</strong>
                    <p>{resetMessage}</p>
                  </div>
                </div>
              ) : null}

              <Button
                className="login-submit"
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? isCreatingAccount
                    ? "Creating account..."
                    : isResettingPassword
                      ? "Preparing reset..."
                      : "Signing in..."
                  : isCreatingAccount
                    ? "Create account"
                    : isResettingPassword
                      ? "Send reset link"
                      : "Sign in"}
              </Button>

              {isResettingPassword ? (
                <button
                  className="auth-secondary-switch"
                  type="button"
                  onClick={() => switchAuthMode("sign-in")}
                >
                  Return to sign in
                </button>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </section>

      <footer className="login-footer">
        <nav aria-label="Legal and support links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/help">Help</a>
        </nav>
        <span>© 2026 FieldProof</span>
      </footer>
    </main>
  )
}
