"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
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
} from "lucide-react"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PAYMENT_PLATFORMS = [
  {
    key: "paypal",
    label: "PayPal",
    placeholder: "paypal.me/yourusername",
    color: "#003087",
    hint: "Enter paypal.me/username or full URL",
  },
  {
    key: "cashapp",
    label: "Cash App",
    placeholder: "$yourcashtag",
    color: "#00D64F",
    hint: "Enter your $cashtag",
  },
  {
    key: "venmo",
    label: "Venmo",
    placeholder: "@username",
    color: "#3D95CE",
    hint: "Enter your @username",
  },
  {
    key: "zelle",
    label: "Zelle",
    placeholder: "Email or phone number",
    color: "#6D1ED4",
    hint: "Enter your email or phone number",
  },
  {
    key: "applepay",
    label: "Apple Pay",
    placeholder: "Email or phone number",
    color: "#555555",
    hint: "Enter your Apple Pay email or phone",
  },
  {
    key: "googlepay",
    label: "Google Pay",
    placeholder: "Email or payment link",
    color: "#4285F4",
    hint: "Enter your email or Google Pay link",
  },
  {
    key: "bitcoin",
    label: "Bitcoin",
    placeholder: "Your BTC address",
    color: "#F7931A",
    hint: "Enter your Bitcoin wallet address",
  },
  {
    key: "stripe",
    label: "Stripe",
    placeholder: "https://buy.stripe.com/...",
    color: "#635BFF",
    hint: "Paste your full Stripe payment link",
  },
]

interface PaymentLink {
  id?: string
  platform: string
  link: string
  display_order: number
}

interface UserProfile {
  id: string
  username: string
  bio: string
  avatar_url: string | null
  auth_user_id: string
}

function normalizeLink(platform: string, value: string): string {
  const v = value.trim()
  if (!v) return ""
  if (v.startsWith("http://") || v.startsWith("https://")) return v

  switch (platform) {
    case "cashapp":
      return `https://cash.app/${v.startsWith("$") ? v : "$" + v}`
    case "venmo":
      return `https://venmo.com/u/${v.replace(/^@/, "")}`
    case "paypal":
      return `https://paypal.me/${v.replace(/^paypal\.me\//, "")}`
    default:
      return v
  }
}

export default function DashboardPage() {
  const router = useRouter()

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState("")

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Payment links state
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({})
  const [originalLinks, setOriginalLinks] = useState<PaymentLink[]>([])
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")

  // UI state
  const [copied, setCopied] = useState(false)

  // On mount: check auth session
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/login")
        return
      }
      setUserId(session.user.id)
      setUserEmail(session.user.email ?? "")
      await fetchData(session.user.id)
      setAuthLoading(false)
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login")
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const fetchData = async (uid: string) => {
    setProfileLoading(true)
    try {
      console.log("[v0] Fetching profile for auth_user_id:", uid)
      
      // Fetch profile from profiles table
      const { data: userData, error: userErr } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, auth_user_id")
        .eq("auth_user_id", uid)
        .maybeSingle()

      if (userErr) throw userErr
      if (userData) {
        console.log("[v0] Profile loaded:", userData)
        setProfile(userData)

        // Fetch payment links for this profile
        const { data: links, error: linksErr } = await supabase
          .from("payment_links")
          .select("*")
          .eq("profile_id", userData.id)
          .order("sort_order")

        if (linksErr) throw linksErr
        if (links) {
          setOriginalLinks(links)
          const map: Record<string, string> = {}
          links.forEach((l: any) => {
            map[l.platform] = l.value
          })
          setPaymentLinks(map)
        }
      } else {
        console.log("[v0] No profile found for auth_user_id")
        throw new Error("Profile not found")
      }
    } catch (err: any) {
      console.error("[v0] Failed to load data:", err)
      setSaveError(err.message || "Failed to load profile data")
    } finally {
      setProfileLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)

    try {
      // Update profile bio
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ bio: paymentLinks.bio || null })
        .eq("id", profile.id)

      if (profileErr) throw profileErr

      // Remove old payment links
      const { error: deleteErr } = await supabase
        .from("payment_links")
        .delete()
        .eq("profile_id", profile.id)

      if (deleteErr) throw deleteErr

      // Insert updated payment links
      const toInsert = Object.entries(paymentLinks)
        .filter(([key, value]) => key !== "bio" && value?.trim())
        .map(([platform, value], idx) => {
          const p = PAYMENT_PLATFORMS.find(pl => pl.key === platform)
          return {
            profile_id: profile.id,
            platform: p?.label || platform,
            value: value.trim(),
            sort_order: idx,
          }
        })

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from("payment_links").insert(toInsert)
        if (insertErr) throw insertErr
      }

      setSaveSuccess(true)
      console.log("[v0] Profile and payment links saved successfully")
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setSaveError(err.message || "Failed to save changes. Please try again.")
      console.error("[v0] Save error:", err)
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

  // ── Loading ──────────────────────────────────────────────────────────────
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

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,232,90,0.07)_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,168,63,0.05)_0%,_transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-sm border-b border-[#1a1a1a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/linkpayhub-logo.png"
              alt="LinkPayHub Logo"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="text-xl font-bold text-[#00e85a] drop-shadow-[0_0_12px_rgba(0,232,90,0.3)]">
              LinkPayHub
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {profile?.username && (
              <Link
                href={`/p?u=${profile.username}`}
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
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-[#1a1a1a] border-2 border-[#333] flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-[#00e85a]/20">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-gray-500" />
            )}
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
            {profile?.bio && (
              <p className="text-sm text-gray-400 truncate">{profile.bio}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{userEmail}</p>
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

        {/* Payment links editor */}
        <form onSubmit={handleSave}>
          <div className="bg-[#0a0a0a]/90 border border-[#1a1a1a] rounded-2xl overflow-hidden">
            {/* Card header */}
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

            {/* Platform inputs */}
            <div className="divide-y divide-[#111]">
              {PAYMENT_PLATFORMS.map((platform) => {
                const hasValue = !!paymentLinks[platform.key]?.trim()
                return (
                  <div
                    key={platform.key}
                    className={`px-5 sm:px-6 py-4 flex items-start gap-4 transition-colors ${hasValue ? "bg-[#00e85a]/[0.02]" : ""}`}
                  >
                    {/* Color dot */}
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-3.5"
                      style={{ backgroundColor: platform.color }}
                    />

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-white">
                          {platform.label}
                        </label>
                        {hasValue && (
                          <CheckCircle className="w-3.5 h-3.5 text-[#00e85a]" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={paymentLinks[platform.key] || ""}
                        onChange={(e) =>
                          setPaymentLinks((prev) => ({
                            ...prev,
                            [platform.key]: e.target.value,
                          }))
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

            {/* Footer / Save */}
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
                  className="ml-auto sm:ml-0 inline-flex items-center gap-2 bg-[#00e85a] text-black font-bold px-5 py-2.5 rounded-xl hover:bg-[#00c84e] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Security note */}
        <div className="bg-[#0a0a0a]/90 border border-[#1a1a1a] rounded-2xl px-5 sm:px-6 py-4 flex items-start gap-3">
          <Shield className="w-4 h-4 text-[#00e85a] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">Security reminder</p>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
              LinkPayHub never stores or processes payments. Your payment apps open directly on your visitor's device. Only save usernames or handles — never passwords or private keys.
            </p>
          </div>
        </div>

        {/* Danger zone */}
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
    </div>
  )
}
