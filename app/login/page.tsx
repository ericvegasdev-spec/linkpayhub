"use client"

import type React from "react"
import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, KeyRound, CheckCircle2 } from "lucide-react"
import { supabase } from "@/lib/supabaseclient"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"magic" | "password">("magic")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const router = useRouter()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const redirectBase =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "")

      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback`,
        },
      })

      if (otpErr) {
        setError(otpErr.message)
        return
      }

      setLinkSent(true)
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (authError) {
        setError(
          authError.message.toLowerCase().includes("invalid")
            ? "Invalid email or password."
            : authError.message,
        )
        return
      }
      if (!data.session) {
        setError("Sign in failed.")
        return
      }
      router.push("/dashboard")
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (linkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.1)_0%,_transparent_60%)] pointer-events-none" />

        <div className="relative z-10 max-w-md w-full bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#1a1a1a] rounded-3xl p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#00e85a]/10 border border-[#00e85a]/30 flex items-center justify-center shadow-[0_0_30px_rgba(0,232,90,0.2)]">
            <CheckCircle2 className="w-7 h-7 text-[#00e85a]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Check your email</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            We sent a sign-in link to <span className="text-[#00e85a] font-semibold">{email.trim().toLowerCase()}</span>.<br />
            Click it to open your dashboard.
          </p>
          <button
            onClick={() => {
              setLinkSent(false)
              setEmail("")
            }}
            className="text-xs text-white/50 hover:text-white/80 transition"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.08)_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#1a1a1a] rounded-3xl p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-5">
              <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={48} height={48} className="rounded-xl" />
              <span className="text-2xl font-bold text-[#00e85a] drop-shadow-[0_0_20px_rgba(0,232,90,0.35)]">LinkPayHub</span>
            </Link>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-white/50 text-sm mt-1">Sign in to edit your page.</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-white/70 font-medium">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#222] bg-[#111] text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-[#00e85a] focus:border-[#00e85a]/50 transition"
              />
            </div>

            {mode === "password" && (
              <div className="space-y-1.5">
                <label className="text-sm text-white/70 font-medium">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#222] bg-[#111] text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-[#00e85a] focus:border-[#00e85a]/50 transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (mode === "password" && !password)}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#00e85a] text-black font-bold px-5 py-3 rounded-xl hover:bg-[#00c84e] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-[0_0_30px_rgba(0,232,90,0.35)]"
            >
              {mode === "magic" ? <Mail className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              {loading
                ? "Sending..."
                : mode === "magic"
                ? "Email me a sign-in link"
                : "Sign in with password"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "magic" ? "password" : "magic")
              setError("")
            }}
            className="w-full text-center text-xs text-white/50 hover:text-white/80 transition mt-4"
          >
            {mode === "magic" ? "Use password instead" : "Use email link instead (no password)"}
          </button>

          <p className="text-center text-sm text-white/60 mt-6 pt-6 border-t border-white/5">
            No account yet?{" "}
            <Link href="/" className="text-[#00e85a] hover:underline font-medium">
              Create your page
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
