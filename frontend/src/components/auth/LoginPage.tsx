import { useState, type FormEvent } from "react"

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

interface LoginPageProps {
  onLogin: (userName: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      setError("Email is required.")
      return
    }

    if (!password.trim()) {
      setError("Password is required.")
      return
    }

    setError("")
    onLogin("Armando Arvizu")
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <CardHeader>
          <div className="brand-row">
            <div className="brand-mark">FP</div>
            <div>
              <CardTitle>FieldProof</CardTitle>
              <CardDescription>
                Sign in to your proof-of-work dashboard.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                autoComplete="email"
                type="email"
                placeholder="armando@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-field">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                autoComplete="current-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <Button type="submit">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
