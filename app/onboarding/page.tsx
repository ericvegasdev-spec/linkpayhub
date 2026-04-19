"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { createClient } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Upload, User } from "lucide-react"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
  const [email, setEmail] = useState("") // stored only for claim flow later (optional)
  const [bio, setBio] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({})

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  async function isUsernameTaken(u: string) {
    // relies on your "Public read profiles" policy (SELECT) that you showed
    const { data, error } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle()
    if (error) {
      // If RLS blocks SELECT, you’ll get an error here. You DO have public read, so you should be fine.
      console.error("[onboarding] username check error:", error)
      return false
    }
    return !!data?.id
  }

  async function handleCompleteSetup() {
    setErrorMsg(null)

    const cleanUsername = normalizeUsername(username)
    if (!cleanUsername) {
      setErrorMsg("Please choose a username.")
      return
    }

    if (activePaymentLinks.length === 0) {
      setErrorMsg("Add at least one payment link.")
      return
    }

    setSaving(true)
    try {
      // 1) Prevent duplicates (recommended)
      const taken = await isUsernameTaken(cleanUsername)
      if (taken) {
        setErrorMsg("That username is taken. Try another.")
        setSaving(false)
        return
      }

      // 2) Insert profile row (THIS MATCHES YOUR profiles table)
      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          username: cleanUsername,
          display_name: cleanUsername, // optional column in your table
          bio: bio || null,
          avatar_url: profilePhoto || null,
          auth_user_id: null, // unclaimed until they verify later
        })
        .select("id, username")
        .single()

      if (profileErr || !profileRow?.id) {
        console.error("[onboarding] profiles insert failed:", profileErr)
        setErrorMsg("Failed saving profile. Check RLS and table columns.")
        setSaving(false)
        return
      }

      const inserts = activePaymentLinks.map(([platformId, value], idx) => {
        const platform = PAYMENT_PLATFORMS.find((p) => p.id === platformId)
        const normalizedValue = normalizePaymentLink(platformId, value)
        return {
          profile_id: profileRow.id,
          platform: platform?.name || platformId,
          label: platform?.name || null,
          value: normalizedValue, // Now properly formatted URL
          sort_order: idx,
        }
      })

      const { error: payErr } = await supabase.from("payment_links").insert(inserts)

      if (payErr) {
        console.error("[onboarding] payment_links insert failed:", payErr)
        setErrorMsg("Profile saved, but payment links failed. Check RLS for payment_links.")
        setSaving(false)
        return
      }

      // 4) Optional localStorage (fast fallback)
      localStorage.setItem(
        "linkpayhub_onboarding_last",
        JSON.stringify({
          username: cleanUsername,
          email,
          bio,
          profilePhoto,
          paymentLinks,
        }),
      )

      router.push(`/p?u=${cleanUsername}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#d2f77f] p-4">
      <Link href="/" className="flex items-center gap-3 mb-12">
        <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={56} height={56} className="rounded-xl" />
        <span className="text-3xl font-bold text-gray-900">LinkPayHub</span>
      </Link>

      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${step === 1 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              1
            </div>
            <span className={`font-semibold ${step === 1 ? "text-gray-900" : "text-gray-500"}`}>Account</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              2
            </div>
            <span className={`font-semibold ${step === 2 ? "text-gray-900" : "text-gray-500"}`}>Payment Links</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center text-base font-semibold transition-colors ${step === 3 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}
            >
              3
            </div>
            <span className={`font-semibold ${step === 3 ? "text-gray-900" : "text-gray-500"}`}>Review</span>
          </div>
        </div>
      </div>

      <Card className="w-full max-w-3xl shadow-xl border-0">
        {/* Step 1 */}
        {step === 1 && (
          <>
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl">Create Your Page</CardTitle>
              <CardDescription className="text-base space-y-2">
                <div>No login required to launch! Get your payment link up and running in seconds.</div>
                <div className="text-sm text-gray-600">Optional: Add your email to claim and secure your profile later. Email-based account management is coming soon.</div>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4 pb-4 border-b">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-[#d2f77f] flex items-center justify-center overflow-hidden border-4 border-gray-200">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto || "/placeholder.svg"}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-gray-600" />
                    )}
                  </div>

                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    <Upload className="h-4 w-4 text-white" />
                  </label>

                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {username && <p className="text-lg font-semibold text-[rgba(255,0,0,1)]">@{normalizeUsername(username)}</p>}
                <p className="text-sm text-destructive-foreground">Upload your profile photo</p>

                <div className="w-full space-y-2 mt-2">
                  <Label htmlFor="bio" className="text-base font-semibold">
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself..."
                    className="text-base resize-none border border-white/10"
                    rows={3}
                    maxLength={100}
                  />
                  <p className="text-sm text-gray-500 text-right">{bio.length}/100</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-semibold">
                  Username
                </Label>
                <div className="flex items-center gap-0">
                  <span className="inline-flex items-center px-4 h-12 text-base text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">
                    linkpayhub.com/
                  </span>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                    placeholder="yourname"
                    className="flex-1 h-12 text-base rounded-l-none border-l-0 border border-white/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  Email <span className="text-gray-500 font-normal">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-12 text-base border border-white/10"
                />
                <p className="text-xs text-gray-600">Your email will be used to claim and manage your profile in the future.</p>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!normalizeUsername(username)}
                  className="h-12 px-8 text-base bg-blue-500 hover:bg-blue-600 rounded-full"
                >
                  Continue <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            </CardContent>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl">Add Your Payment Links</CardTitle>
              <CardDescription className="text-base">
                Add at least one. You can edit later after you claim your page.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
                {PAYMENT_PLATFORMS.map((platform) => (
                  <div key={platform.id} className="space-y-2">
                    <Label htmlFor={platform.id} className="text-base font-semibold">
                      {platform.name}
                    </Label>
                    <Input
                      id={platform.id}
                      value={paymentLinks[platform.id] || ""}
                      onChange={(e) => handlePaymentLinkChange(platform.id, e.target.value)}
                      placeholder={platform.placeholder}
                      className="h-12 text-base border border-white/10"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-6 text-base rounded-full">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={activePaymentLinks.length === 0}
                  className="h-12 px-8 text-base bg-blue-500 hover:bg-blue-600 rounded-full"
                >
                  Continue <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            </CardContent>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl">Review</CardTitle>
              <CardDescription className="text-base">Click Complete Setup to publish your page.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-[#d2f77f]/20 rounded-lg space-y-2 border-2 border-[#d2f77f]">
                  <p className="text-sm text-gray-600 font-medium">Your URL</p>
                  <p className="text-xl font-bold text-gray-900">linkpayhub.com/{normalizeUsername(username)}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-base font-semibold">Payment Links ({activePaymentLinks.length})</p>
                  <div className="space-y-2">
                    {activePaymentLinks.map(([platformId, link]) => {
                      const platform = PAYMENT_PLATFORMS.find((p) => p.id === platformId)
                      return (
                        <div key={platformId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <span className="font-semibold text-gray-900">{platform?.name}</span>
                          <span className="text-sm text-gray-600 truncate max-w-[250px]">{link}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)} className="h-12 px-6 text-base rounded-full">
                  Back
                </Button>

                <Button
                  onClick={handleCompleteSetup}
                  disabled={saving}
                  className="h-12 px-8 text-base bg-blue-500 hover:bg-blue-600 rounded-full"
                >
                  {saving ? "Saving..." : "Complete Setup"}
                </Button>
              </div>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}
