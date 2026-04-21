"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabaseclient"
import {
  User,
  LogOut,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Save,
  Copy,
  Check,
  Shield,
  Link2,
  Camera,
  Loader2,
  Smartphone,
  X,
} from "lucide-react"
import { PaymentIcon } from "@/components/payment-icons"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const PAYMENT_PLATFORMS = [
  { key: "paypal",    label: "PayPal",     placeholder: "paypal.me/yourusername",      color: "#003087", hint: "Enter paypal.me/username or full URL" },
  { key: "cashapp",   label: "Cash App",   placeholder: "$yourcashtag",                color: "#00D64F", hint: "Enter your $cashtag" },
  { key: "venmo",     label: "Venmo",      placeholder: "@username",                   color: "#3D95CE", hint: "Enter your @username" },
  { key: "zelle",     label: "Zelle",      placeholder: "Email or phone number",       color: "#6D1ED4", hint: "Enter your email or phone number" },
  { key: "applepay",  label: "Apple Pay",  placeholder: "Email or phone number",       color: "#555555", hint: "Enter your Apple Pay email or phone" },
  { key: "googlepay", label: "Google Pay", placeholder: "Email or payment link",       color: "#4285F4", hint: "Enter your email or Google Pay link" },
  { key: "bitcoin",   label: "Bitcoin",    placeholder: "Your BTC address",            color: "#F7931A", hint: "Enter your Bitcoin wallet address" },
  { key: "stripe",    label: "Stripe",     placeholder: "https://buy.stripe.com/...",  color: "#635BFF", hint: "Paste your full Stripe payment link" },
]

const LABEL_TO_KEY: Record<string, string> = PAYMENT_PLATFORMS.reduce(
  (acc, p) => ({ ...acc, [p.label]: p.key, [p.key]: p.key }),
  {},
)

interface UserProfile {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  auth_user_id: string | null
}

function normalizeLink(platformKey: string, value: string): string {
  const v = value.trim()
  if (!v) return ""
  if (v.startsWith("http://") || v.startsWith("https://")) return v

  switch (platformKey) {
    case "cashapp":
      return `https://cash.app/${v.startsWith("$") ? v : "$" + v}`
    case "venmo":
      return `https://venmo.com/u/${v.replace(/^@/, "").toLowerCase()}`
    case "paypal":
      return `https://paypal.me/${v.replace(/^paypal\.me\//, "")}`
    case "bitcoin":
      return v.startsWith("bitcoin:") ? v : `bitcoin:${v}`
    default:
      return v
  }
}

export default function DashboardPage() {
  const router = useRouter()

  // Auth state
  const [userEmail, setUserEmail] = useState<string>("")
  const [authLoading, setAuthLoading] = useState(true)

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bio, setBio] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)

  // Avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Payment links state (keyed by short key: "paypal", "cashapp", etc.)
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")

  // UI state
  const [copied, setCopied] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installOpen, setInstallOpen] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as InstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleAddToPhone = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === "accepted") setInstallPrompt(null)
      return
    }
    setInstallOpen(true)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/login")
        return
      }
      setUserEmail(session.user.email ?? "")
      await fetchData(session.user.id)
      setAuthLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login")
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchData = async (uid: string) => {
    setProfileLoading(true)
    try {
      const { data: userData, error: userErr } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, auth_user_id")
        .eq("auth_user_id", uid)
        .maybeSingle()

      if (userErr) throw userErr
      if (!userData) throw new Error("Profile not found")

      setProfile(userData)
      setBio(userData.bio ?? "")

      const { data: links, error: linksErr } = await supabase
        .from("payment_links")
        .select("platform, value")
        .eq("profile_id", userData.id)
        .order("sort_order")

      if (linksErr) throw linksErr

      // Map DB platform strings (either short key or display label) back to form keys
      const map: Record<string, string> = {}
      ;(links ?? []).forEach((l: { platform: string; value: string }) => {
        const key = LABEL_TO_KEY[l.platform] ?? l.platform.toLowerCase().replace(/\s+/g, "")
        map[key] = l.value
      })
      setPaymentLinks(map)
    } catch (err: any) {
      setSaveError(err.message || "Failed to load profile data")
    } finally {
      setProfileLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Image must be under 5MB.")
      return
    }

    setAvatarUploading(true)
    setSaveError("")

    // Try Supabase Storage first; if the bucket isn't set up yet, fall back
    // to a base64 data URL so the upload still works (same fallback the
    // onboarding flow uses). Warn via setSaveError so the owner knows to
    // eventually create the bucket for performance.
    const saveUrl = async (url: string) => {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id)
      if (updateErr) throw updateErr
      setProfile({ ...profile, avatar_url: url })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path)
      await saveUrl(pub.publicUrl)
    } catch (err: any) {
      // Bucket not set up or upload failed — fall back to inline base64.
      try {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        await saveUrl(dataUrl)
        console.warn("Avatar stored inline as base64 (Supabase Storage fallback). Create the public 'avatars' bucket in Supabase for better performance.")
      } catch (fallbackErr: any) {
        setSaveError(fallbackErr.message || err.message || "Photo upload failed.")
      }
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)

    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ bio: bio.trim() || null })
        .eq("id", profile.id)

      if (profileErr) throw profileErr

      const { error: deleteErr } = await supabase
        .from("payment_links")
        .delete()
        .eq("profile_id", profile.id)

      if (deleteErr) throw deleteErr

      const toInsert = PAYMENT_PLATFORMS
        .map((p, idx) => ({ platform: p, value: (paymentLinks[p.key] ?? "").trim(), idx }))
        .filter(({ value }) => value.length > 0)
        .map(({ platform, value, idx }) => ({
          profile_id: profile.id,
          platform: platform.key,
          label: platform.label,
          value: normalizeLink(platform.key, value),
          sort_order: idx,
        }))

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from("payment_links").insert(toInsert)
        if (insertErr) throw insertErr
      }

      setProfile({ ...profile, bio: bio.trim() || null })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setSaveError(err.message || "Failed to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const handleCopyLink = async () => {
    if (!profile?.username) return
    await navigator.clipboard.writeText(`https://linkpayhub.com/${profile.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeCount = PAYMENT_PLATFORMS.filter((p) => paymentLinks[p.key]?.trim()).length

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,232,90,0.08)_0%,_transparent_50%)] pointer-events-none" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-8 h-8 border-2 border-[#00e85a] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#00e85a] text-sm">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,232,90,0.07)_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,168,63,0.05)_0%,_transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm border-b border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={40} height={40} className="rounded-xl" />
            <span className="text-xl font-bold text-[#00e85a] drop-shadow-[0_0_12px_rgba(0,232,90,0.3)]">LinkPayHub</span>
          </Link>

          <div className="flex items-center gap-3">
            {profile?.username && (
              <Link
                href={`/${profile.username}`}
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#00e85a] font-medium hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Profile
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg border border-[#1a1a1a] hover:border-[#333]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Profile summary card */}
        <div className="bg-[#0a0a0a]/90 border border-[#1a1a1a] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar + upload */}
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center overflow-hidden ring-2 ring-[#00e85a]/20">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-500" />
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#00e85a] flex items-center justify-center cursor-pointer hover:bg-[#00c84e] transition shadow-[0_0_20px_rgba(0,232,90,0.4)]"
              title="Change photo"
            >
              {avatarUploading ? (
                <Loader2 className="w-4 h-4 text-black animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-black" />
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={avatarUploading}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">
                {profile?.username ? `@${profile.username}` : userEmail}
              </h1>
              <span className="inline-flex items-center gap-1 text-xs bg-[#00e85a]/10 text-[#00e85a] border border-[#00e85a]/20 px-2 py-0.5 rounded-full font-medium">
                <Shield className="w-3 h-3" />
                Verified
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{userEmail}</p>
            {profile?.username && (
              <p className="text-xs text-gray-600 mt-1 font-mono">linkpayhub.com/{profile.username}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            {profile?.username && (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border border-[#00e85a]/30 text-[#00e85a] hover:bg-[#00e85a]/10 transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 text-sm text-gray-400 px-3 py-2 rounded-xl border border-[#1a1a1a]">
              <Link2 className="w-4 h-4 text-[#00e85a]" />
              {activeCount} active {activeCount === 1 ? "link" : "links"}
            </div>
          </div>
        </div>

        {/* Add to Phone CTA — saves an icon that opens the dashboard like a native app */}
        <button
          type="button"
          onClick={handleAddToPhone}
          className="group w-full bg-gradient-to-r from-[#fbbf24]/[0.08] to-[#00e85a]/[0.04] hover:from-[#fbbf24]/[0.12] border border-[#fbbf24]/30 hover:border-[#fbbf24]/50 rounded-2xl p-5 flex items-center gap-4 text-left transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-[#fbbf24]/15 border border-[#fbbf24]/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Smartphone className="w-5 h-5 text-[#fbbf24]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">Add to Phone</p>
            <p className="text-xs text-white/50 mt-0.5 leading-snug">
              One-tap dashboard access, like a real app. The icon opens straight here to edit your page.
            </p>
          </div>
          <div className="flex-shrink-0 text-xs font-bold text-[#fbbf24] uppercase tracking-wider pr-1">Install</div>
        </button>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Bio editor */}
          <div className="bg-[#0a0a0a]/90 border border-[#1a1a1a] rounded-2xl p-5 sm:p-6">
            <div className="mb-3">
              <h2 className="text-base font-bold text-white">Your bio</h2>
              <p className="text-xs text-gray-500 mt-0.5">Appears under your name on your public profile.</p>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 100))}
              placeholder="Tell people about yourself..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#222] bg-[#111] text-white placeholder:text-gray-600 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#00e85a] focus:border-[#00e85a]/50 transition"
            />
            <p className="text-xs text-gray-600 text-right mt-1">{bio.length}/100</p>
          </div>

          {/* Payment links editor */}
          <div className="bg-[#0a0a0a]/90 border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Payment Links</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Leave a field blank to hide it from your public profile.
                </p>
              </div>
              {profileLoading && (
                <div className="w-5 h-5 border-2 border-[#00e85a] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>

            <div className="divide-y divide-[#111]">
              {PAYMENT_PLATFORMS.map((platform) => {
                const hasValue = !!paymentLinks[platform.key]?.trim()
                return (
                  <div
                    key={platform.key}
                    className={`px-5 sm:px-6 py-4 flex items-start gap-4 transition-colors ${hasValue ? "bg-[#00e85a]/[0.02]" : ""}`}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-1 text-white"
                      style={{ backgroundColor: platform.color }}
                    >
                      <PaymentIcon platform={platform.key} className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-white">{platform.label}</label>
                        {hasValue && <CheckCircle className="w-3.5 h-3.5 text-[#00e85a]" />}
                      </div>
                      <input
                        type="text"
                        value={paymentLinks[platform.key] || ""}
                        onChange={(e) =>
                          setPaymentLinks((prev) => ({ ...prev, [platform.key]: e.target.value }))
                        }
                        placeholder={platform.placeholder}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#222] bg-[#111] text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-1 focus:ring-[#00e85a] focus:border-[#00e85a]/50 transition"
                      />
                      <p className="text-xs text-gray-500">{platform.hint}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 sm:px-6 py-4 bg-[#080808] border-t border-[#1a1a1a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="w-3.5 h-3.5 text-[#00e85a]" />
                Changes are encrypted and saved securely to Supabase
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-[#00e85a] text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </span>
                )}
                {saveError && (
                  <span className="flex items-center gap-1.5 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving || profileLoading}
                  className="ml-auto sm:ml-0 inline-flex items-center gap-2 bg-[#00e85a] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#00c84e] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-[0_0_24px_rgba(0,232,90,0.35)]"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="bg-[#0a0a0a]/90 border border-[#1a1a1a] rounded-2xl px-5 sm:px-6 py-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#00e85a] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Security reminder</p>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
              LinkPayHub never stores or processes payments. Your payment apps open directly on your visitor's device. Only save usernames or handles — never passwords or private keys.
            </p>
          </div>
        </div>

        <div className="bg-[#0a0a0a]/90 border border-red-900/30 rounded-2xl px-5 sm:px-6 py-5">
          <h3 className="text-sm font-bold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-sm text-gray-500 mb-4">Sign out of your account on this device.</p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-sm text-red-400 font-semibold border border-red-900/40 px-4 py-2 rounded-xl hover:bg-red-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

      </main>

      {/* Add-to-Phone iOS Safari instructions modal */}
      {installOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setInstallOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#0a0a0a] border border-[#fbbf24]/30 rounded-3xl p-6 shadow-[0_30px_100px_rgba(251,191,36,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInstallOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#fbbf24]/15 border border-[#fbbf24]/30 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-[#fbbf24]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Add to Phone</h3>
                <p className="text-xs text-white/50 mt-0.5">Open your dashboard like an app</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#fbbf24]">1</div>
                <p className="text-sm text-white/80 leading-snug flex-1">
                  Tap the <span className="font-semibold text-white">Share</span> button at the bottom of Safari
                </p>
                <div className="w-10 h-10 rounded-xl bg-[#007aff]/15 border border-[#007aff]/40 flex items-center justify-center flex-shrink-0" aria-hidden>
                  <svg className="w-5 h-5 text-[#3b9eff]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 7H6.5A2.5 2.5 0 0 0 4 9.5v10A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5v-10A2.5 2.5 0 0 0 17.5 7h-2" />
                    <path d="M12 2v13" />
                    <path d="m7 7 5-5 5 5" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#fbbf24]">2</div>
                <p className="text-sm text-white/80 leading-snug flex-1">
                  Scroll and tap <span className="font-semibold text-white">Add to Home Screen</span>
                </p>
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0" aria-hidden>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#fbbf24]/15 border border-[#fbbf24]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#fbbf24]">3</div>
                <p className="text-sm text-white/80 leading-snug flex-1">
                  Tap <span className="font-semibold text-white">Add</span> — the icon opens straight to your dashboard
                </p>
                <div className="px-3 h-8 rounded-full bg-[#007aff] flex items-center justify-center flex-shrink-0" aria-hidden>
                  <span className="text-white text-xs font-bold">Add</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setInstallOpen(false)}
              className="mt-5 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 rounded-full text-sm transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
