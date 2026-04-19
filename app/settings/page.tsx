"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabaseclient"

const PAYMENT_PLATFORMS = [
  {
    key: "cashapp",
    label: "Cash App",
    placeholder: "$cashtag",
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
    hint: "Enter your email or phone",
  },
  {
    key: "paypal",
    label: "PayPal",
    placeholder: "paypal.me/username",
    color: "#003087",
    hint: "Enter your PayPal.me username",
  },
  {
    key: "applepay",
    label: "Apple Pay",
    placeholder: "Email or phone number",
    color: "#000000",
    hint: "Enter your Apple Pay email or phone",
  },
]

type Step = "verify" | "edit"

interface PaymentLink {
  id?: string
  platform: string
  link: string
  display_order: number
}

export default function SettingsPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("verify")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({})
  const [originalLinks, setOriginalLinks] = useState<PaymentLink[]>([])
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [username, setUsername] = useState("")

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        setEmail(session.user.email || "")
        await loadPaymentLinks(session.user.id)
        setStep("edit")
      }
    }
    checkSession()
  }, [])

  const loadPaymentLinks = async (uid: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("auth_user_id", uid)
      .maybeSingle()

    if (!profile) return

    setProfileId(profile.id)
    if (profile.username) setUsername(profile.username)

    const { data: links } = await supabase
      .from("payment_links")
      .select("*")
      .eq("profile_id", profile.id)
      .order("sort_order")

    if (links) {
      setOriginalLinks(links)
      const map: Record<string, string> = {}
      links.forEach((l: any) => {
        const key = (l.platform || "").toLowerCase().replace(/\s+/g, "")
        map[key] = l.value
      })
      setPaymentLinks(map)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError("")
    setAuthLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setUserId(data.user.id)
      await loadPaymentLinks(data.user.id)
      setStep("edit")
    } catch (err: any) {
      setAuthError(err.message || "Invalid email or password.")
    } finally {
      setAuthLoading(false)
    }
  }

  const normalizeLink = (platform: string, value: string): string => {
    if (!value.trim()) return ""
    const v = value.trim()
    switch (platform) {
      case "cashapp":
        if (v.startsWith("https://")) return v
        const tag = v.startsWith("$") ? v : `$${v}`
        return `https://cash.app/${tag}`
      case "venmo":
        if (v.startsWith("https://")) return v
        const handle = v.startsWith("@") ? v.slice(1) : v
        return `https://venmo.com/${handle}`
      case "paypal":
        if (v.startsWith("https://")) return v
        const user = v.toLowerCase().replace("paypal.me/", "")
        return `https://paypal.me/${user}`
      case "zelle":
        return v
      case "applepay":
        return v
      default:
        return v
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileId) return
    setSaveLoading(true)
    setSaveError("")
    setSaveSuccess(false)

    try {
      await supabase.from("payment_links").delete().eq("profile_id", profileId)

      const toInsert = PAYMENT_PLATFORMS
        .filter(p => paymentLinks[p.key]?.trim())
        .map((p, idx) => ({
          profile_id: profileId,
          platform: p.label,
          value: normalizeLink(p.key, paymentLinks[p.key] || ""),
          sort_order: idx,
        }))

      if (toInsert.length > 0) {
        const { error } = await supabase.from("payment_links").insert(toInsert)
        if (error) throw error
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || "Failed to save. Please try again.")
    } finally {
      setSaveLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center gap-3 border-b border-[#1a1a1a]">
          <a href="/" className="flex items-center gap-3">
            <Image
              src="/linkpayhub-logo.png"
              alt="LinkPayHub Logo"
              width={44}
              height={44}
              className="rounded-xl"
            />
            <span className="text-2xl font-bold text-[#00e85a]">LinkPayHub</span>
          </a>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-[#0d0d0d] rounded-3xl shadow-xl border border-[#1a1a1a] p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#0d1a10] border border-[#00e85a]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#00e85a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-[#00e85a]">Verify Your Identity</h1>
                <p className="text-[#00a83f] mt-2 text-sm">Enter your credentials to access your payment settings</p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#00e85a] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a] bg-[#111111] text-[#00e85a] placeholder:text-[#1f4d2e] focus:outline-none focus:ring-2 focus:ring-[#00e85a] focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#00e85a] mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a] bg-[#111111] text-[#00e85a] placeholder:text-[#1f4d2e] focus:outline-none focus:ring-2 focus:ring-[#00e85a] focus:border-transparent transition"
                  />
                </div>

                {authError && (
                  <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl px-4 py-3 text-sm">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#00e85a] text-black font-semibold py-3.5 rounded-xl hover:bg-[#00c84e] transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {authLoading ? "Verifying..." : "Verify & Continue"}
                </button>
              </form>

              <p className="text-center text-sm text-[#00a83f] mt-6">
                Your data is encrypted and never shared.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#1a1a1a] bg-black/80 backdrop-blur-sm sticky top-0 z-10">
        <a href="/" className="flex items-center gap-3">
          <Image
            src="/linkpayhub-logo.png"
            alt="LinkPayHub Logo"
            width={44}
            height={44}
            className="rounded-xl"
          />
          <span className="text-2xl font-bold text-[#00e85a]">LinkPayHub</span>
        </a>
        <div className="flex items-center gap-3">
          {username && (
            <a
              href={`/p?u=${username}`}
              className="text-sm text-[#00e85a] font-semibold hover:underline hidden sm:block"
            >
              View Profile
            </a>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-[#00a83f] hover:text-[#00e85a] font-medium transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#00e85a]">Payment Settings</h1>
          {username && (
            <p className="text-[#00a83f] mt-1">
              Editing <span className="font-semibold text-[#00e85a]">linkpayhub.com/{username}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div className="bg-[#0d0d0d] rounded-3xl shadow-md border border-[#1a1a1a] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#1a1a1a]">
              <h2 className="text-lg font-bold text-[#00e85a]">Your Payment Links</h2>
              <p className="text-sm text-[#00a83f] mt-0.5">Update your payment app usernames below. Leave blank to hide.</p>
            </div>

            <div className="divide-y divide-[#1a1a1a]">
              {PAYMENT_PLATFORMS.map((platform) => (
                <div key={platform.key} className="px-6 py-5 flex items-center gap-4">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: platform.color }}
                  />

                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-semibold text-[#00e85a] mb-1.5">
                      {platform.label}
                    </label>
                    <input
                      type="text"
                      value={paymentLinks[platform.key] || ""}
                      onChange={e =>
                        setPaymentLinks(prev => ({
                          ...prev,
                          [platform.key]: e.target.value,
                        }))
                      }
                      placeholder={platform.placeholder}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#1a1a1a] bg-[#111111] text-[#00e85a] placeholder:text-[#1f4d2e] text-sm focus:outline-none focus:ring-2 focus:ring-[#00e85a] focus:border-transparent transition"
                    />
                    <p className="text-xs text-[#00a83f] mt-1">{platform.hint}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Save footer */}
            <div className="px-6 py-5 bg-[#080808] border-t border-[#1a1a1a] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-[#00a83f] flex items-center gap-2">
                <svg className="w-4 h-4 text-[#00e85a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Changes are saved securely
              </div>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-[#00e85a] text-sm font-semibold">Saved successfully!</span>
                )}
                {saveError && (
                  <span className="text-red-400 text-sm">{saveError}</span>
                )}
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="bg-[#00e85a] text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-[#00c84e] transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {saveLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Security note */}
        <div className="mt-6 bg-[#0d0d0d] rounded-2xl border border-[#1a1a1a] px-6 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#00e85a] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-[#00e85a]">Security reminder</p>
            <p className="text-sm text-[#00a83f] mt-0.5">
              We never store or process payments. Your payment apps open directly on your visitors device. Only save usernames or handles — never passwords.
            </p>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 bg-[#0d0d0d] rounded-2xl border border-red-900/40 px-6 py-5">
          <h3 className="text-sm font-bold text-red-400 mb-1">Danger Zone</h3>
          <p className="text-sm text-[#00a83f] mb-3">Sign out of your account on this device.</p>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-400 font-semibold border border-red-900/40 px-4 py-2 rounded-xl hover:bg-red-950 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
