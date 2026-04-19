"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabaseclient"

export default function SignupPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const cleanUsername = username.toLowerCase().trim()
      const cleanEmail = email.trim()

      if (!cleanUsername || !cleanEmail || !password) {
        throw new Error("Username, email, and password are required.")
      }

      const redirectBase =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "")

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback`,
        },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error("User creation failed — no user returned")

      const { error: profileError } = await supabase.from("profiles").insert({
        auth_user_id: authData.user.id,
        username: cleanUsername,
        display_name: username,
      })

      if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`)

      setSuccessMessage("Account created! Check your email to confirm your account.")
      setSuccess(true)
      setUsername("")
      setEmail("")
      setPassword("")
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 bg-black/70 border border-white/10 rounded-3xl p-6 sm:p-8"
      >
        <Link href="/" className="flex items-center justify-center gap-3 mb-2">
          <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={48} height={48} className="rounded-xl" />
          <span className="text-2xl font-bold text-white">LinkPayHub</span>
        </Link>

        <div className="space-y-1 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold">Create Your LinkPayHub</h1>
          <p className="text-sm text-white/60">One link for the apps you get paid with.</p>
        </div>

        {error && <div className="rounded-xl bg-red-900/60 border border-red-500 px-3 py-2 text-sm">{error}</div>}

        {success && (
          <div className="rounded-xl bg-emerald-900/60 border border-emerald-500 px-3 py-2 text-sm text-center space-y-2">
            <p className="font-semibold">✓ Check your email!</p>
            <p>{successMessage}</p>
            <p className="text-xs text-emerald-200">Click the confirmation link to activate your account and manage your page.</p>
          </div>
        )}

        {/* Username */}
        <div className="space-y-1">
          <label className="text-sm">Username</label>
          <div className="flex items-center overflow-hidden rounded-2xl bg-white/5 border border-white/10">
            <span className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm text-white/60 border-r border-white/10">
              linkpayhub.com/
            </span>
            <input
              type="text"
              className="flex-1 bg-transparent px-3 py-2 outline-none text-sm text-white placeholder:text-white/40"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            type="email"
            className="w-full rounded-2xl bg-white/5 px-3 py-2 outline-none text-sm border border-white/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input
            type="password"
            className="w-full rounded-2xl bg-white/5 px-3 py-2 outline-none text-sm border border-white/10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-white text-black font-semibold py-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  )
}
