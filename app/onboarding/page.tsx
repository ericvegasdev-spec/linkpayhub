"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { supabase } from "@/lib/supabaseclient"
import { HelpFindUsername } from "@/components/help-find-username"
import { QRCode } from "@/components/qr-code"

import {
  ArrowRight,
  ArrowLeft,
  Upload,
  User,
  CheckCircle2,
  AtSign,
  HelpCircle,
  Copy,
  Check,
  Share2,
  Download,
} from "lucide-react"

const PLATFORM_COLORS: Record<string, string> = {
  paypal: "#003087",
  cashapp: "#00D632",
  venmo: "#008CFF",
  zelle: "#6D1ED4",
  applepay: "#000000",
  googlepay: "#4285F4",
  bitcoin: "#F7931A",
  stripe: "#635BFF",
}

const PAYMENT_PLATFORMS = [
  { id: "paypal", name: "PayPal", placeholder: "paypal.me/yourusername or https://paypal.me/yourusername" },
  { id: "cashapp", name: "Cash App", placeholder: "$yourcashtag or https://cash.app/$yourcashtag" },
  { id: "venmo", name: "Venmo", placeholder: "@yourusername or https://venmo.com/yourusername" },
  { id: "zelle", name: "Zelle", placeholder: "your@email.com or phone number" },
  { id: "applepay", name: "Apple Pay", placeholder: "your@email.com or phone number" },
  { id: "googlepay", name: "Google Pay", placeholder: "your@email.com or payment link" },
  { id: "bitcoin", name: "Bitcoin", placeholder: "Your BTC address or bitcoin: URI" },
  { id: "stripe", name: "Stripe", placeholder: "https://buy.stripe.com/... (paste your full link)" },
]

function normalizePaymentLink(platformId: string, value: string): string {
  const trimmed = value.trim()

  // Already a full URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  // Platform-specific normalization
  switch (platformId) {
    case "cashapp":
      // $cashtag -> https://cash.app/$cashtag
      if (trimmed.startsWith("$")) {
        return `https://cash.app/${trimmed}`
      }
      return trimmed.startsWith("cash.app") ? `https://${trimmed}` : trimmed

    case "venmo": {
      const username = trimmed
        .toLowerCase()
        .replace(/^@/, "")
        .replace("https://venmo.com/u/", "")
        .replace("venmo.com/u/", "")

      // Store as web URL (public page will convert to venmo:// on mobile)
      return `https://venmo.com/u/${username}`
    }

    case "paypal":
      // https://paypal.me/username
      if (!trimmed.includes("/") && !trimmed.includes("@")) {
        return `https://paypal.me/${trimmed}`
      }
      return trimmed.startsWith("paypal.me") ? `https://${trimmed}` : trimmed

    case "zelle":
    case "applepay":
    case "googlepay":
      // These typically use email/phone, return as-is
      return trimmed

    case "bitcoin":
      // Bitcoin addresses or bitcoin: URIs
      if (trimmed.startsWith("bitcoin:")) {
        return trimmed
      }
      return `bitcoin:${trimmed}`

    default:
      // For other platforms, if it looks like a domain, add https://
      if (trimmed.includes(".") && !trimmed.includes("@")) {
        return `https://${trimmed}`
      }
      return trimmed
  }
}

function normalizeUsername(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
}

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [bio, setBio] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [awaitingEmail, setAwaitingEmail] = useState(false)

  // Help + success UI state
  const [helpPlatform, setHelpPlatform] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    const tempUsername = localStorage.getItem("linkpayhub_temp_username")
    if (tempUsername) {
      setUsername(normalizeUsername(tempUsername))
      localStorage.removeItem("linkpayhub_temp_username")
    }
  }, [])

  const activePaymentLinks = useMemo(
    () => Object.entries(paymentLinks).filter(([_, v]) => (v ?? "").trim() !== ""),
    [paymentLinks],
  )

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setProfilePhoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handlePaymentLinkChange = (platformId: string, value: string) => {
    setPaymentLinks((prev) => ({ ...prev, [platformId]: value }))
  }

  const profileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${normalizeUsername(username)}`
      : `https://linkpayhub.com/${normalizeUsername(username)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {}
  }

  const handleShareLink = async () => {
    const shareData = {
      title: "My LinkPayHub",
      text: "Pay me through any of these apps:",
      url: profileUrl,
    }
    const nav: any = typeof navigator !== "undefined" ? navigator : null
    if (!nav) return
    try {
      if (typeof nav.share === "function") {
        await nav.share(shareData)
      } else {
        await nav.clipboard.writeText(profileUrl)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
      }
    } catch {}
  }

  const handleDownloadQr = () => {
    const svg = document.querySelector<SVGElement>("#lph-success-qr svg")
    const canvas = document.querySelector<HTMLCanvasElement>("#lph-success-qr canvas")

    const triggerDownload = (dataUrl: string) => {
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `linkpayhub-${normalizeUsername(username) || "profile"}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }

    if (canvas) {
      triggerDownload(canvas.toDataURL("image/png"))
      return
    }
    if (svg) {
      const xml = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([xml], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const img = document.createElement("img")
      img.onload = () => {
        const c = document.createElement("canvas")
        c.width = img.naturalWidth || 400
        c.height = img.naturalHeight || 400
        const ctx = c.getContext("2d")
        if (!ctx) return
        ctx.fillStyle = "#0a0a0a"
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(img, 0, 0)
        triggerDownload(c.toDataURL("image/png"))
        URL.revokeObjectURL(url)
      }
      img.src = url
    }
  }

  async function isUsernameTaken(u: string) {
    // relies on your "Public read profiles" policy (SELECT) that you showed
    const { data, error } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle()
    if (error) return false
    return !!data?.id
  }

  async function handleCompleteSetup() {
    setErrorMsg(null)

    const cleanUsername = normalizeUsername(username)
    if (!cleanUsername) {
      setErrorMsg("Please choose a username.")
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg("A valid email is required to secure your page.")
      return
    }

    if (activePaymentLinks.length === 0) {
      setErrorMsg("Add at least one payment link.")
      return
    }

    setSaving(true)
    try {
      const taken = await isUsernameTaken(cleanUsername)
      if (taken) {
        setErrorMsg("That username is taken. Try another.")
        setSaving(false)
        return
      }

      // Reserve the profile (unclaimed) with pending_email for later claim via magic link
      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          username: cleanUsername,
          display_name: cleanUsername,
          bio: bio || null,
          avatar_url: profilePhoto || null,
          auth_user_id: null,
          pending_email: cleanEmail,
        })
        .select("id, username")
        .single()

      if (profileErr || !profileRow?.id) {
        setErrorMsg("Failed saving profile. Please try again.")
        setSaving(false)
        return
      }

      const inserts = activePaymentLinks.map(([platformId, value], idx) => {
        const platform = PAYMENT_PLATFORMS.find((p) => p.id === platformId)
        const normalizedValue = normalizePaymentLink(platformId, value)
        return {
          profile_id: profileRow.id,
          platform: platformId,
          label: platform?.name || null,
          value: normalizedValue,
          sort_order: idx,
        }
      })

      const { error: payErr } = await supabase.from("payment_links").insert(inserts)

      if (payErr) {
        setErrorMsg("Profile saved, but payment links failed to save.")
        setSaving(false)
        return
      }

      // Send magic link so the user can claim their profile
      const redirectBase =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== "undefined" ? window.location.origin : "")

      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback?claim=1`,
        },
      })

      if (otpErr) {
        setErrorMsg(`Page created but we couldn't send your email: ${otpErr.message}. Try the login page.`)
        setSaving(false)
        return
      }

      localStorage.setItem("linkpayhub_claim_username", cleanUsername)
      setAwaitingEmail(true)
    } finally {
      setSaving(false)
    }
  }

  if (awaitingEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center bg-black text-white p-4 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,232,90,0.14)_0%,_transparent_55%)] pointer-events-none" />
        <div className="fixed inset-0 lph-grid opacity-[0.1] pointer-events-none" />

        <Link href="/" className="relative z-10 flex items-center gap-3 mt-8 mb-8">
          <Image src="/linkpayhub-logo.png" alt="LinkPayHub" width={48} height={48} className="rounded-xl" />
          <span className="text-2xl font-bold text-white tracking-tight">LinkPayHub</span>
        </Link>

        <div className="relative z-10 max-w-md w-full space-y-5">
          {/* Hero success card */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-[#00e85a]/25 rounded-3xl p-6 sm:p-8 text-center shadow-[0_30px_100px_rgba(0,232,90,0.15)]">
            <div className="inline-flex items-center gap-1.5 bg-[#00e85a]/10 border border-[#00e85a]/30 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold text-[#00e85a] mb-4">
              <CheckCircle2 className="w-3 h-3" />
              Your page is live
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em] leading-[1.05] mb-2">
              Share it.<br />
              <span className="text-white/50">Get paid.</span>
            </h1>
            <p className="text-white/50 text-sm">
              This QR opens all your payment options in one tap.
            </p>
          </div>

          {/* QR card */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/[0.08] rounded-3xl p-5 sm:p-6">
            <div
              id="lph-success-qr"
              className="mx-auto bg-[#0a0a0a] rounded-2xl p-3 w-fit border border-[#00e85a]/20 shadow-[0_20px_60px_rgba(0,232,90,0.25)]"
            >
              <QRCode value={profileUrl} size={240} />
            </div>

            <p className="text-center mt-4 text-xs uppercase tracking-[0.15em] text-white/40 font-semibold">
              Your link
            </p>
            <p className="text-center mt-1 font-mono text-sm text-[#00e85a] break-all">
              linkpayhub.com/{normalizeUsername(username)}
            </p>

            <div className="grid grid-cols-3 gap-2 mt-5">
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-[#00e85a]" />
                ) : (
                  <Copy className="w-4 h-4 text-white/80" />
                )}
                <span className="text-[11px] font-semibold text-white/80">{linkCopied ? "Copied" : "Copy"}</span>
              </button>
              <button
                onClick={handleShareLink}
                className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
              >
                <Share2 className="w-4 h-4 text-white/80" />
                <span className="text-[11px] font-semibold text-white/80">Share</span>
              </button>
              <button
                onClick={handleDownloadQr}
                className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition"
              >
                <Download className="w-4 h-4 text-white/80" />
                <span className="text-[11px] font-semibold text-white/80">Save QR</span>
              </button>
            </div>
          </div>

          {/* Email claim card */}
          <div className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/[0.08] rounded-3xl p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00e85a]/10 border border-[#00e85a]/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#00e85a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Check your email to edit later</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                  We sent a magic link to <span className="text-white font-medium break-all">{email.trim().toLowerCase()}</span>. Click it anytime to update your payment info.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/30 text-center pb-8">
            Didn't get the email? <Link href="/login" className="text-[#00e85a] hover:underline">Try from the login page</Link>.
          </p>
        </div>
      </div>
    )
  }

  const cleanUsername = normalizeUsername(username)

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <HelpFindUsername
        open={!!helpPlatform}
        platformId={helpPlatform as any}
        onClose={() => setHelpPlatform(null)}
      />
      {/* Ambient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#010804] to-black pointer-events-none" aria-hidden />
      <div className="fixed inset-0 lph-grid opacity-[0.15] pointer-events-none" aria-hidden />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,232,90,0.1)_0%,_transparent_55%)] pointer-events-none" aria-hidden />

      <div className="relative z-10 flex flex-col items-center px-4 py-10 sm:py-14 min-h-screen">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <Image src="/linkpayhub-logo.png" alt="LinkPayHub" width={44} height={44} className="rounded-xl" />
          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">LinkPayHub</span>
        </Link>

        {/* Step indicator */}
        <div className="w-full max-w-2xl mb-8 sm:mb-10">
          <div className="flex items-center justify-between gap-2">
            {[
              { n: 1, label: "Account" },
              { n: 2, label: "Payments" },
              { n: 3, label: "Review" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex-1 flex items-center">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step > s.n
                        ? "bg-[#00e85a] text-black shadow-[0_0_20px_rgba(0,232,90,0.4)]"
                        : step === s.n
                        ? "bg-[#00e85a] text-black shadow-[0_0_30px_rgba(0,232,90,0.6)] ring-2 ring-[#00e85a]/30 ring-offset-2 ring-offset-black"
                        : "bg-white/5 text-white/40 border border-white/10"
                    }`}
                  >
                    {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-semibold hidden sm:inline ${
                      step >= s.n ? "text-white" : "text-white/40"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-1 h-px mx-3 sm:mx-4 bg-gradient-to-r from-white/10 via-white/10 to-white/10 relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-[#00e85a] to-[#00a83f] transition-all duration-500 ${
                        step > s.n ? "w-full" : "w-0"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card container */}
        <div className="w-full max-w-2xl bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          {/* Step 1 */}
          {step === 1 && (
            <div className="p-6 sm:p-10 space-y-8">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold">Step 1 of 3</span>
                <h1 className="font-black tracking-[-0.02em] text-[clamp(28px,5vw,40px)] text-white leading-[1.05] mt-2">
                  Create your page.
                </h1>
                <p className="text-white/50 text-sm mt-2">A few details so payers know it's you.</p>
              </div>

              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-[#0a0a0a] border-2 border-white/10 flex items-center justify-center overflow-hidden ring-2 ring-[#00e85a]/20">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-white/30" />
                    )}
                  </div>
                  <label
                    htmlFor="photo-upload"
                    className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-[#00e85a] flex items-center justify-center cursor-pointer hover:bg-[#00c84e] transition-colors shadow-[0_0_20px_rgba(0,232,90,0.45)]"
                  >
                    <Upload className="h-4 w-4 text-black" />
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                {cleanUsername && (
                  <p className="text-base font-bold text-[#00e85a] drop-shadow-[0_0_12px_rgba(0,232,90,0.4)]">
                    @{cleanUsername}
                  </p>
                )}
                <p className="text-xs text-white/40">Tap the upload icon to add a photo</p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-semibold text-white/80">Username</label>
                <div className="flex items-center overflow-hidden rounded-xl bg-[#111] border border-white/10 focus-within:border-[#00e85a]/50 transition-colors">
                  <span className="pl-4 pr-1 py-3 text-sm text-white/50 font-mono whitespace-nowrap">linkpayhub.com/</span>
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                    placeholder="yourname"
                    className="flex-1 min-w-0 bg-transparent outline-none text-white font-semibold placeholder:text-white/30 pr-4 py-3"
                  />
                </div>
                <p className="text-xs text-white/40">Lowercase, numbers, dashes. Your handle is permanent — pick wisely.</p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-white/80">Email</label>
                <div className="flex items-center overflow-hidden rounded-xl bg-[#111] border border-white/10 focus-within:border-[#00e85a]/50 transition-colors">
                  <AtSign className="ml-4 mr-2 w-4 h-4 text-white/40 flex-shrink-0" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder:text-white/30 pr-4 py-3"
                  />
                </div>
                <p className="text-xs text-white/40">We email you a magic link — no password to remember. Required to edit later.</p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label htmlFor="bio" className="text-sm font-semibold text-white/80">
                  Bio <span className="text-white/40 font-normal">(optional)</span>
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 100))}
                  placeholder="Tell people about yourself..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-[#111] border border-white/10 focus:border-[#00e85a]/50 focus:outline-none text-white placeholder:text-white/30 text-sm resize-none transition-colors"
                />
                <p className="text-xs text-white/40 text-right">{bio.length}/100</p>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setErrorMsg(null)
                    setStep(2)
                  }}
                  disabled={!cleanUsername || !email.trim()}
                  className="inline-flex items-center gap-2 bg-[#00e85a] text-black px-6 py-3 rounded-full font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-[1.02] active:scale-[0.98] transition-transform enabled:shadow-[0_0_30px_rgba(0,232,90,0.4)]"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="p-6 sm:p-10 space-y-8">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold">Step 2 of 3</span>
                <h1 className="font-black tracking-[-0.02em] text-[clamp(28px,5vw,40px)] text-white leading-[1.05] mt-2">
                  Add your payment apps.
                </h1>
                <p className="text-white/50 text-sm mt-2">Skip any you don't use. Add at least one to continue.</p>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {PAYMENT_PLATFORMS.map((platform) => {
                  const hasValue = !!paymentLinks[platform.id]?.trim()
                  const dotColor = PLATFORM_COLORS[platform.id] ?? "#00e85a"
                  return (
                    <div
                      key={platform.id}
                      className={`rounded-2xl border transition-all ${
                        hasValue
                          ? "bg-[#00e85a]/[0.03] border-[#00e85a]/25"
                          : "bg-[#0f0f0f] border-white/[0.06]"
                      }`}
                    >
                      <div className="px-4 py-3.5 flex items-start gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2"
                          style={{ backgroundColor: dotColor, boxShadow: `0 0 16px ${dotColor}66` }}
                        />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-semibold text-white">{platform.name}</label>
                              {hasValue && <CheckCircle2 className="w-3.5 h-3.5 text-[#00e85a]" />}
                            </div>
                            <button
                              type="button"
                              onClick={() => setHelpPlatform(platform.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-[#00e85a] transition-colors font-medium"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              I don't know
                            </button>
                          </div>
                          <input
                            id={platform.id}
                            value={paymentLinks[platform.id] || ""}
                            onChange={(e) => handlePaymentLinkChange(platform.id, e.target.value)}
                            placeholder={platform.placeholder}
                            className="w-full px-3 py-2 rounded-lg bg-[#111] border border-white/10 focus:border-[#00e85a]/50 focus:outline-none text-white placeholder:text-white/30 text-sm transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white px-4 py-3 rounded-full border border-white/10 hover:border-white/20 transition text-sm font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => {
                    setErrorMsg(null)
                    setStep(3)
                  }}
                  disabled={activePaymentLinks.length === 0}
                  className="inline-flex items-center gap-2 bg-[#00e85a] text-black px-6 py-3 rounded-full font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-[1.02] active:scale-[0.98] transition-transform enabled:shadow-[0_0_30px_rgba(0,232,90,0.4)]"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="p-6 sm:p-10 space-y-8">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold">Step 3 of 3</span>
                <h1 className="font-black tracking-[-0.02em] text-[clamp(28px,5vw,40px)] text-white leading-[1.05] mt-2">
                  Review and go live.
                </h1>
                <p className="text-white/50 text-sm mt-2">This is how your page will look to payers.</p>
              </div>

              {/* Live profile preview */}
              <div className="relative">
                <div className="absolute -inset-6 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.15)_0%,_transparent_60%)] pointer-events-none blur-xl" />
                <div className="relative max-w-sm mx-auto bg-white rounded-[2rem] border border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,232,90,0.12)]">
                  <div className="px-5 pt-5 pb-7 text-center bg-gradient-to-b from-[#F5FFF8] to-white">
                    <div className="w-16 h-16 mx-auto rounded-full mb-3 overflow-hidden shadow ring-2 ring-white bg-gray-100 flex items-center justify-center">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#0B0B0B] mb-0.5">@{cleanUsername}</h3>
                    {bio && <p className="text-[11px] text-[#5A5A5A] mb-4 px-2">{bio}</p>}
                    <div className="space-y-2 mt-4">
                      {activePaymentLinks.map(([platformId]) => {
                        const platform = PAYMENT_PLATFORMS.find((p) => p.id === platformId)
                        const color = PLATFORM_COLORS[platformId] ?? "#1a1a1a"
                        return (
                          <div
                            key={platformId}
                            className="py-2.5 px-3 rounded-full font-semibold text-xs text-white shadow flex items-center justify-center"
                            style={{ backgroundColor: color }}
                          >
                            {platform?.name}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#111]/60 border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50 mb-0.5">Your URL</p>
                  <p className="text-sm font-mono font-semibold text-white">linkpayhub.com/{cleanUsername}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50 mb-0.5">Payment methods</p>
                  <p className="text-sm font-semibold text-[#00e85a]">{activePaymentLinks.length} active</p>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white px-4 py-3 rounded-full border border-white/10 hover:border-white/20 transition text-sm font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleCompleteSetup}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-[#00e85a] text-black px-7 py-3 rounded-full font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:scale-[1.02] active:scale-[0.98] transition-transform enabled:lph-halo-pulse"
                >
                  {saving ? "Publishing..." : "Complete Setup"}
                  {!saving && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tiny helper footer */}
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/30 mt-8 text-center font-semibold">
          No credit card · No login until you edit
        </p>
      </div>
    </div>
  )
}
