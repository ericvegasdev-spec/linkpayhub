"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { User, QrCode, Smartphone, X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseclient"
import { QRCode } from "@/components/qr-code"
import { PaymentIcon, PLATFORM_META, normalizePlatformKey } from "@/components/payment-icons"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

interface PaymentLink {
  id: string
  platform: string
  label: string | null
  value: string
  sort_order: number
}

function getPlatformStyle(platform: string) {
  const key = normalizePlatformKey(platform)
  const meta = PLATFORM_META[key]
  return {
    bg: meta?.color ?? "#1a1a1a",
    hover: meta?.hover ?? "#2a2a2a",
    name: meta?.name ?? platform,
  }
}

function getDeepLink(platform: string, value: string): string {
  const normalized = platform.toLowerCase().replace(/\s+/g, "")

  switch (normalized) {
    case "cashapp": {
      let cashtag = ""
      if (value.includes("cash.app/")) {
        cashtag = value.split("cash.app/")[1]?.split("/")[0] || ""
      } else if (value.startsWith("$")) {
        cashtag = value
      }
      if (cashtag) {
        const cleanTag = cashtag.startsWith("$") ? cashtag : "$" + cashtag
        return `https://cash.app/${cleanTag}`
      }
      return value
    }

    case "venmo": {
      let venmoUser = ""
      if (value.includes("venmo.com/u/")) {
        venmoUser = value.split("venmo.com/u/")[1]?.split("/")[0] || ""
      } else if (value.includes("venmo.com/")) {
        venmoUser = value.split("venmo.com/")[1]?.split("/")[0] || ""
      } else if (value.startsWith("@")) {
        venmoUser = value.slice(1)
      }
      if (venmoUser) {
        if (typeof window !== "undefined" && /iPhone|Android/i.test(navigator.userAgent)) {
          return `venmo://paycharge?recipients=${venmoUser.toLowerCase()}`
        }
        return `https://venmo.com/u/${venmoUser.toLowerCase()}`
      }
      return value
    }

    case "paypal":
      if (value.startsWith("https://paypal.me/") || value.startsWith("http://paypal.me/")) return value
      if (value.toLowerCase().startsWith("paypal.me/")) return `https://${value}`
      if (!value.includes("/") && !value.includes("@") && !value.includes(".")) return `https://paypal.me/${value}`
      if (value.includes("paypal.") && !value.startsWith("http")) return `https://${value}`
      return value

    default:
      return value
  }
}

export function PublicProfile({ username }: { username: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    async function loadProfile() {
      if (!username) {
        setError("Profile not found")
        setLoading(false)
        return
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", username)
          .maybeSingle()

        if (profileError) {
          setError("Profile not found")
          setLoading(false)
          return
        }

        if (!profileData) {
          setError("Profile not found")
          setLoading(false)
          return
        }

        setProfile(profileData)

        const { data: linksData } = await supabase
          .from("payment_links")
          .select("*")
          .eq("profile_id", profileData.id)
          .order("sort_order", { ascending: true })

        setPaymentLinks(linksData || [])
      } catch (err) {
        setError("Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username])

  // Capture the Chrome/Android PWA install prompt so visitors can "Save to
  // Home" as a real app icon. iOS Safari doesn't fire this — we fall back
  // to a short visual guide (Share -> Add to Home Screen).
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as InstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleAddToHome = async () => {
    if (installPrompt) {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === "accepted") setInstallPrompt(null)
      return
    }
    setInstallOpen(true)
  }

  const handleDownloadQr = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#lph-profile-qr canvas")
    const svg = document.querySelector<SVGElement>("#lph-profile-qr svg")
    const trigger = (dataUrl: string) => {
      const a = document.createElement("a")
      a.href = dataUrl
      a.download = `linkpayhub-${(profile?.username || "profile").toLowerCase()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    if (canvas) return trigger(canvas.toDataURL("image/png"))
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
        trigger(c.toDataURL("image/png"))
        URL.revokeObjectURL(url)
      }
      img.src = url
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-[#010804] to-black pointer-events-none" aria-hidden />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.12)_0%,_transparent_60%)] pointer-events-none" aria-hidden />

        {/* Top progress bar */}
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-white/5 overflow-hidden z-30">
          <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-[#00e85a] to-transparent lph-progress-bar" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-5">
          <Image
            src="/linkpayhub-logo.png"
            alt=""
            width={52}
            height={52}
            className="rounded-xl opacity-90 lph-float"
          />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] uppercase tracking-[0.25em] text-[#00e85a] font-semibold">
              Loading profile
            </p>
            <p className="text-sm text-white/40">
              One tap from payment, hang tight.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 relative overflow-hidden">
        <div className="fixed inset-0 bg-gradient-to-br from-black via-[#010804] to-black pointer-events-none" aria-hidden />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.08)_0%,_transparent_60%)] pointer-events-none" aria-hidden />

        <Link href="/" className="relative z-10 flex items-center gap-3 mb-8">
          <Image src="/linkpayhub-logo.png" alt="LinkPayHub" width={48} height={48} className="rounded-xl" />
          <span className="text-2xl font-bold text-white tracking-tight">LinkPayHub</span>
        </Link>

        <div className="relative z-10 max-w-sm w-full bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/[0.08] rounded-3xl p-8 text-center space-y-4">
          <p className="text-lg font-bold text-white">{error || "Profile not found"}</p>
          <p className="text-sm text-white/50">
            Double-check the link, or head back home.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#00e85a] text-black px-5 py-3 rounded-full font-bold text-sm hover:bg-[#00c84e] transition shadow-[0_0_30px_rgba(0,232,90,0.35)]"
          >
            Go home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#00140a] text-white p-4 py-12 relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-b from-[#063d20] via-[#012a14] to-[#000804] pointer-events-none" aria-hidden />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,232,90,0.28)_0%,_transparent_55%)] pointer-events-none" aria-hidden />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,232,90,0.12)_0%,_transparent_60%)] pointer-events-none" aria-hidden />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={48} height={48} className="rounded-xl" />
            <span className="text-2xl font-bold text-white tracking-tight">LinkPayHub</span>
          </Link>
        </div>

        <Card className="bg-[#0a0a0a]/80 backdrop-blur-sm border border-white/[0.08] shadow-[0_0_60px_rgba(0,232,90,0.08)] rounded-3xl mb-6 max-w-md mx-auto">
          <CardContent className="pt-12 pb-8 px-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-32 w-32 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden mb-4 border border-white/10 shadow-[0_0_40px_rgba(0,232,90,0.25)]">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || profile.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-white/40" />
                )}
              </div>

              <h1 className="text-2xl font-bold text-[#00e85a] drop-shadow-[0_0_20px_rgba(0,232,90,0.35)] mb-1">@{profile.username}</h1>

              {profile.bio && <p className="text-sm text-white/60 max-w-md mt-2">{profile.bio}</p>}
            </div>

            {paymentLinks.length > 0 ? (
              <div className="space-y-3">
                {paymentLinks.map((link) => {
                  const style = getPlatformStyle(link.platform)
                  const linkUrl = getDeepLink(link.platform, link.value)
                  const normalizedPlatform = link.platform.toLowerCase().replace(/\s+/g, "")
                  const isZelle = normalizedPlatform === "zelle"
                  const isApplePay = normalizedPlatform === "applepay" || normalizedPlatform === "applecash"

                  const btnClass =
                    "w-full h-14 px-6 text-base font-semibold rounded-2xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2.5 text-white"
                  const btnStyle: React.CSSProperties = {
                    backgroundColor: style.bg,
                    boxShadow: `0 4px 16px ${style.bg}30`,
                  }

                  if (isZelle) {
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(link.value)
                          alert("Zelle info copied. Open your bank app → Zelle → Paste → Send.")
                        }}
                        className={btnClass}
                        style={btnStyle}
                      >
                        <PaymentIcon platform={link.platform} className="w-5 h-5" />
                        {link.label || "Zelle"}
                      </button>
                    )
                  }

                  if (isApplePay) {
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(link.value)
                          alert("Apple Pay info copied. Open Wallet → Apple Cash → Send → Paste → Send.")
                        }}
                        className={btnClass}
                        style={btnStyle}
                      >
                        <PaymentIcon platform={link.platform} className="w-5 h-5" />
                        {link.label || "Apple Pay"}
                      </button>
                    )
                  }

                  return (
                    <a
                      key={link.id}
                      href={linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={btnClass}
                      style={btnStyle}
                    >
                      <PaymentIcon platform={link.platform} className="w-5 h-5" />
                      {link.label || link.platform}
                    </a>
                  )
                })}
              </div>
            ) : (
              <p className="text-white/60">No payment links available.</p>
            )}

            {/* Secondary actions: QR + Add to Home */}
            <div className="flex gap-2 mt-5 pt-5 border-t border-white/[0.06]">
              <button
                onClick={() => setQrOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition text-[13px] font-semibold text-white/80"
              >
                <QrCode className="w-4 h-4" />
                Show QR
              </button>
              <button
                onClick={handleAddToHome}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#00e85a]/10 border border-[#00e85a]/30 hover:bg-[#00e85a]/15 hover:border-[#00e85a]/50 transition text-[13px] font-semibold text-[#00e85a]"
              >
                <Smartphone className="w-4 h-4" />
                Add to Phone
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR modal */}
      {qrOpen && profile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setQrOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#0a0a0a] border border-[#00e85a]/25 rounded-3xl p-6 shadow-[0_30px_100px_rgba(0,232,90,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
            <div className="text-center mb-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold mb-1">Scan to pay</p>
              <h3 className="text-xl font-bold text-white">@{profile.username}</h3>
              <p className="text-xs text-white/50 mt-1 font-mono break-all">
                linkpayhub.com/{profile.username}
              </p>
            </div>
            <div
              id="lph-profile-qr"
              className="mx-auto bg-[#0a0a0a] rounded-2xl p-3 w-fit border border-[#00e85a]/25 shadow-[0_0_60px_rgba(0,232,90,0.18)]"
            >
              <QRCode
                value={`${typeof window !== "undefined" ? window.location.origin : "https://linkpayhub.com"}/${profile.username}`}
                size={320}
              />
            </div>
            <button
              onClick={handleDownloadQr}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-[#00e85a] text-black font-bold py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Download className="w-4 h-4" />
              Save to Photos
            </button>
          </div>
        </div>
      )}

      {/* Add-to-Home instructions modal (iOS Safari) */}
      {installOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setInstallOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#0a0a0a] border border-[#00e85a]/25 rounded-3xl p-6 shadow-[0_30px_100px_rgba(0,232,90,0.25)]"
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
              <div className="w-12 h-12 rounded-2xl bg-[#00e85a]/10 border border-[#00e85a]/30 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-[#00e85a]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Add to Phone</h3>
                <p className="text-xs text-white/50 mt-0.5">One tap to pay @{profile?.username}</p>
              </div>
            </div>
            <div className="space-y-3">
              {/* Step 1 — Share button */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#00e85a]/15 border border-[#00e85a]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#00e85a]">1</div>
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
              {/* Step 2 — Add to Home Screen row */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#00e85a]/15 border border-[#00e85a]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#00e85a]">2</div>
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
              {/* Step 3 — Add button */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#00e85a]/15 border border-[#00e85a]/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#00e85a]">3</div>
                <p className="text-sm text-white/80 leading-snug flex-1">
                  Tap <span className="font-semibold text-white">Add</span> — the icon opens straight to this profile
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
