"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseclient"

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

const platformStyles: Record<string, { bg: string; hover: string; text: string; icon: string }> = {
  paypal: { bg: "bg-[#003087]", hover: "hover:bg-[#002870]", text: "text-white", icon: "₱" },
  cashapp: { bg: "bg-[#00D632]", hover: "hover:bg-[#00C02E]", text: "text-white", icon: "$" },
  venmo: { bg: "bg-[#3D95CE]", hover: "hover:bg-[#3487BD]", text: "text-white", icon: "V" },
  applepay: { bg: "bg-black", hover: "hover:bg-gray-900", text: "text-white", icon: "" },
  zelle: { bg: "bg-[#6D1ED4]", hover: "hover:bg-[#5D1AB8]", text: "text-white", icon: "Z" },
}

function getPlatformStyle(platform: string) {
  const normalized = platform.toLowerCase().replace(/\s+/g, "")
  return (
    platformStyles[normalized] || {
      bg: "bg-gray-800",
      hover: "hover:bg-gray-700",
      text: "text-white",
      icon: "💳",
    }
  )
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
    <div className="min-h-screen bg-[#d2f77f] p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={48} height={48} className="rounded-xl" />
            <span className="text-2xl font-bold text-gray-900">LinkPayHub</span>
          </Link>
        </div>

        <Card className="shadow-2xl border-4 border-black rounded-3xl mb-6 max-w-md mx-auto">
          <CardContent className="pt-12 pb-8 px-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4 border-4 border-white shadow-lg">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || profile.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-gray-400" />
                )}
              </div>

              <h1 className="text-2xl font-bold text-[#00e85a] mb-1">@{profile.username}</h1>

              {profile.bio && <p className="text-sm text-gray-600 max-w-md mt-2">{profile.bio}</p>}
            </div>

            {paymentLinks.length > 0 ? (
              <div className="space-y-3">
                {paymentLinks.map((link) => {
                  const style = getPlatformStyle(link.platform)
                  const linkUrl = getDeepLink(link.platform, link.value)
                  const normalizedPlatform = link.platform.toLowerCase().replace(/\s+/g, "")
                  const isZelle = normalizedPlatform === "zelle"
                  const isApplePay = normalizedPlatform === "applepay" || normalizedPlatform === "applecash"

                  if (isZelle) {
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(link.value)
                          alert("Zelle info copied. Open your bank app → Zelle → Paste → Send.")
                        }}
                        className={`w-full h-14 px-6 text-base font-semibold rounded-2xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2 ${style.bg} ${style.hover} ${style.text}`}
                      >
                        {style.icon && <span className="text-xl font-bold">{style.icon}</span>}
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
                        className={`w-full h-14 px-6 text-base font-semibold rounded-2xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2 ${style.bg} ${style.hover} ${style.text}`}
                      >
                        {style.icon && <span className="text-xl font-bold">{style.icon}</span>}
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
                      className={`w-full h-14 px-6 text-base font-semibold rounded-2xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2 ${style.bg} ${style.hover} ${style.text}`}
                    >
                      {style.icon && <span className="text-xl font-bold">{style.icon}</span>}
                      {link.label || link.platform}
                    </a>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-600">No payment links available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
