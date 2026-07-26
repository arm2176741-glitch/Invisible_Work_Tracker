import { Eye, LockKeyhole, Mail, UserRound } from "lucide-react"
import { useState, type FormEvent } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { LoginResult } from "@/types/domain"

interface LoginPageProps {
  onLogin: (result: LoginResult) => void
}

type AuthMode = "sign-in" | "create-account"

export function LoginPage({ onLogin }: LoginPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const isCreatingAccount = authMode === "create-account"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isCreatingAccount && !fullName.trim()) {
      setError("Name is required.")
      return
    }

    if (!email.trim()) {
      setError("Email is required.")
      return
    }

    if (!password.trim()) {
      setError("Password is required.")
      return
    }

    setError("")
    onLogin({
      userName: isCreatingAccount ? fullName.trim() : "Armando Arvizu",
      dashboardMode: isCreatingAccount ? "onboarding" : "operational",
    })
  }

  function switchAuthMode(nextMode: AuthMode) {
    setError("")
    setShowPassword(false)
    setAuthMode(nextMode)
  }

  return (
    <main className="login-page">
      <div className="login-corner-brand" aria-label="FieldProof">
        <div className="brand-mark">FP</div>
        <span>FieldProof</span>
      </div>

      <section className="login-frame" aria-label="FieldProof authentication">
        <Card className="login-card">
          <CardHeader>
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

            <CardTitle key={authMode}>{isCreatingAccount ? "Create your account" : "Sign in"}</CardTitle>
          </CardHeader>

          <CardContent>
            <form className="login-form" onSubmit={handleSubmit}>
              {isCreatingAccount ? (
                <div className="form-field">
                  <Label htmlFor="fullName">Name</Label>
                  <div className="input-shell">
                    <UserRound aria-hidden="true" size={18} />
                    <Input
                      id="fullName"
                      autoComplete="name"
                      type="text"
                      placeholder="Armando Arvizu"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="form-field">
                <Label htmlFor="email">Email</Label>
                <div className="input-shell">
                  <Mail aria-hidden="true" size={18} />
                  <Input
                    id="email"
                    autoComplete="email"
                    type="email"
                    placeholder="armando@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <div className="form-label-row">
                  <Label htmlFor="password">Password</Label>
                  {!isCreatingAccount ? (
                    <button className="text-link" type="button">
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
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    className="input-icon-button"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    <Eye aria-hidden="true" size={17} />
                  </button>
                </div>
              </div>

              {error ? <p className="form-error">{error}</p> : null}

              <Button className="login-submit" type="submit">
                {isCreatingAccount ? "Create account" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
