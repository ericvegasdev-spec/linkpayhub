"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Shield, Link2, Zap, Check } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabaseclient"
import { Session } from "@supabase/supabase-js"

export default function HomePage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setAuthLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const handleGetStarted = () => {
    if (username) {
      localStorage.setItem("linkpayhub_temp_username", username)
    }
    router.push("/onboarding")
  }

  const handleLogin = () => {
    router.push("/login")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Subtle animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black opacity-100 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,232,90,0.08)_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,168,63,0.06)_0%,_transparent_50%)] pointer-events-none" />
      
      <header className="relative z-10 bg-black/80 backdrop-blur-sm border-b border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-4 sm:py-6 font-mono flex items-center justify-between">
          <Link href="/" className="inline-flex flex-col gap-0.5 sm:gap-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image src="/linkpayhub-logo.png" alt="LinkPayHub Logo" width={64} height={64} className="rounded-xl w-10 h-10 sm:w-16 sm:h-16" />
              <span className="font-bold text-[#00e85a] font-mono text-2xl sm:text-4xl drop-shadow-[0_0_20px_rgba(0,232,90,0.3)]">
                LinkPayHub
              </span>
            </div>
            <p className="text-[#00a83f] font-medium ml-12 sm:ml-20 text-xs sm:text-sm">The easiest way to get paid.</p>
          </Link>

          {/* Auth Button */}
          {!authLoading && (
            <div>
              {session ? (
                <button
                  onClick={handleLogout}
                  className="px-6 py-2.5 bg-[#00e85a] text-black font-semibold rounded-full hover:bg-[#00c84e] transition-colors text-sm sm:text-base shadow-[0_0_20px_rgba(0,232,90,0.3)]"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-6 py-2.5 bg-[#1a6bff] text-white font-semibold rounded-full hover:bg-[#0055e0] transition-colors text-sm sm:text-base shadow-[0_4px_20px_rgba(26,107,255,0.3)]"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Get Started for Free — CTA Banner */}
      <section className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 overflow-hidden">
        {/* Radial glow behind text */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(26,107,255,0.12)_0%,_transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.06)_0%,_transparent_60%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-4 sm:space-y-5">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 bg-[#1a6bff]/10 border border-[#1a6bff]/30 text-[#1a6bff] text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a6bff] animate-pulse" />
            No credit card required
          </div>

          {/* Primary CTA headline */}
          <h2 className="text-[36px] sm:text-[52px] lg:text-[68px] font-black leading-[1.05] tracking-tight text-balance">
            <span className="text-white">Payments Made</span>{" "}
            <span className="text-[#00e85a] drop-shadow-[0_0_30px_rgba(0,232,90,0.4)]">Easy</span>
          </h2>

          {/* Supporting line */}
          <p className="text-sm text-[#00a83f] max-w-xl mx-auto leading-relaxed sm:text-3xl text-[rgba(220,110,0,1)]">
            {"Create your personal payment link in 30 seconds \n no account needed to start."}
          </p>

          {/* Arrow pointing down toward the hero */}
          <div className="pt-2 flex justify-center">
            <svg
              className="w-6 h-6 text-[#1a6bff] animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Bottom divider glow line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#1a6bff]/40 to-transparent" />
      </section>

      <section className="relative py-10 sm:py-20 lg:py-28 z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#001a08]/30 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 w-full">

          {/* --- Mobile layout: headline → phone mockup → CTA --- */}
          <div className="flex flex-col items-center gap-6 lg:hidden">

            {/* Headline ONLY above phone on mobile */}
            <div className="w-full text-center">
              <h1 className="text-[30px] sm:text-[42px] font-extrabold text-[#00e85a] leading-[1.15] tracking-tight drop-shadow-[0_0_40px_rgba(0,232,90,0.25)]">
                One link for all your payments.
              </h1>
            </div>

            {/* Phone mockup — hero image below headline */}
            <div className="w-full flex justify-center">
              <div className="relative w-[220px] xs:w-[260px] sm:w-[300px]">
                <div
                  className="relative bg-gradient-to-br from-[#2C2C2C] via-[#1a1a1a] to-[#0a0a0a] rounded-[2.5rem] p-2"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 2px rgba(255,255,255,0.15)" }}
                >
                  <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#111] rounded-full z-20" />
                  <div className="relative bg-white rounded-[2rem] overflow-hidden" style={{ aspectRatio: "9 / 19.5" }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent pointer-events-none z-10" />
                    <div className="bg-white px-4 pt-7 pb-2">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-black">
                        <span>9:41</span>
                        <div className="w-4 h-2.5 border border-black rounded-sm relative">
                          <div className="absolute inset-0.5 bg-black rounded-[1px]" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-[#F5FFF8] to-white px-4 py-5 text-center">
                      <div className="w-16 h-16 mx-auto rounded-full mb-3 overflow-hidden shadow-lg ring-2 ring-white">
                        <Image src="/maryjane-avatar.png" alt="Maryjane Profile" width={64} height={64} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-base font-bold text-[#0B0B0B] mb-0.5">@Maryjane</h2>
                      <p className="text-[10px] text-[#5A5A5A] mb-4">Business owner of Beauty Salon</p>
                      <div className="space-y-2">
                        <div className="bg-[#00D632] text-white py-2.5 px-3 rounded-full font-semibold text-xs shadow flex items-center justify-center gap-1.5">
                          <span className="text-sm">$</span> Cash App
                        </div>
                        <div className="bg-[#008CFF] text-white py-2.5 px-3 rounded-full font-semibold text-xs shadow flex items-center justify-center gap-1.5">
                          <span className="font-bold">V</span> Venmo
                        </div>
                        <div className="bg-[#6D1ED4] text-white py-2.5 px-3 rounded-full font-semibold text-xs shadow flex items-center justify-center gap-1.5">
                          <span className="font-bold">Z</span> Zelle
                        </div>
                        <div className="bg-[#000000] text-white py-2.5 px-3 rounded-full font-semibold text-xs shadow flex items-center justify-center gap-1.5">
                          <span className="font-bold">A</span> Apple Pay
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-20 h-1 bg-white/30 rounded-full" />
                </div>
              </div>
            </div>

            {/* All remaining text + CTA below phone on mobile */}
            <div className="w-full text-center space-y-5 max-w-sm mx-auto">
              <p className="text-sm sm:text-base text-[#00c84e] leading-relaxed">
                Save your Cash App, Venmo, and Zelle usernames once – clients click and pay you directly in the app they choose.
              </p>
              <p className="text-xs sm:text-sm text-[#00a83f] font-semibold">
                We never touch your money. Your payment apps open directly to your exact profile.
              </p>
              <div className="w-full space-y-3">
              <div className="bg-white rounded-full px-4 border border-white/20 flex items-center gap-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_32px_rgba(0,0,0,0.5)] transition-shadow py-3">
                <span className="text-[#1a6bff] font-semibold whitespace-nowrap text-xs">linkpayhub.com/</span>
                <input
                  type="text"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[#0047e0] font-bold text-sm placeholder:text-[#93b4ff]"
                />
              </div>
              <button
                onClick={handleGetStarted}
                disabled={!username}
                className="w-full bg-[#1a6bff] text-white px-6 py-4 rounded-full font-bold text-sm hover:bg-[#0055e0] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(26,107,255,0.45)]"
              >
                Create your link
              </button>
              <p className="text-xs font-medium text-[#00a83f] text-center">Takes 30 seconds. No login required.</p>
              </div>
            </div>
          </div>

          {/* --- Desktop layout: text left, phone right (side by side) --- */}
          <div className="hidden lg:grid lg:grid-cols-2 items-center gap-16">
            <div className="space-y-10 text-left">
              <div className="space-y-6">
                <h1 className="text-[56px] xl:text-[68px] font-extrabold text-[#00e85a] leading-[1.1] tracking-tight drop-shadow-[0_0_40px_rgba(0,232,90,0.25)] mx-[46px] my-px py-[19px] text-center">
                  One Link For All Your Payments.
                </h1>
                <p className="text-[19px] text-[#00c84e] leading-[1.65] max-w-lg text-destructive-foreground mx-7 text-center">
                  Save your Cash App, Venmo, and Zelle usernames once clients click and pay you directly in the app they choose.
                </p>
                <p className="text-[15px] text-[#00a83f] leading-relaxed font-semibold max-w-lg text-destructive-foreground mx-[25px] text-center">
                  We never touch your money. Your payment apps open directly to your exact profile.
                </p>
              </div>
              <div className="max-w-md space-y-5">
                <div className="bg-white rounded-full px-6 border border-white/20 flex items-center shadow-[0_4px_28px_rgba(0,0,0,0.45)] hover:shadow-[0_8px_36px_rgba(0,0,0,0.55)] transition-shadow py-3.5 mx-[11px] gap-2.5">
                  <span className="text-[#1a6bff] font-semibold whitespace-nowrap text-sm">linkpayhub.com/</span>
                  <input
                    type="text"
                    placeholder="yourname"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[#0047e0] font-bold text-base placeholder:text-[#93b4ff]"
                  />
                </div>
                <button
                  onClick={handleGetStarted}
                  disabled={!username}
                  className="w-full bg-[#1a6bff] text-white px-8 py-5 rounded-full font-bold text-lg hover:bg-[#0055e0] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_24px_rgba(26,107,255,0.45)]"
                >
                  Create your link
                </button>
                <p className="text-sm font-medium text-[#00a83f] text-center">Takes 30 seconds. No login required.</p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative w-[360px] xl:w-[400px]">
                <div
                  className="relative bg-gradient-to-br from-[#2C2C2C] via-[#1a1a1a] to-[#0a0a0a] rounded-[3.5rem] p-3"
                  style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 2px rgba(255,255,255,0.2)" }}
                >
                  <div className="absolute inset-0 rounded-[3.5rem] bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-[#111] rounded-full z-20" />
                  <div className="relative bg-white rounded-[3rem] overflow-hidden" style={{ aspectRatio: "9 / 19.5" }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent pointer-events-none z-10" />
                    <div className="bg-white px-6 pt-8 pb-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-black">
                        <span>9:41</span>
                        <div className="w-4 h-3 border border-black rounded-sm relative">
                          <div className="absolute inset-0.5 bg-black rounded-[1px]" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-b from-[#F5FFF8] to-white px-6 py-10 text-center">
                      <div className="w-28 h-28 mx-auto rounded-full mb-5 overflow-hidden shadow-lg ring-4 ring-white">
                        <Image src="/maryjane-avatar.png" alt="Maryjane Profile" width={112} height={112} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-2xl font-bold text-[#0B0B0B] mb-1">@Maryjane</h2>
                      <p className="text-sm text-[#5A5A5A] mb-8">Business owner of Beauty Salon</p>
                      <div className="space-y-3.5">
                        <div className="bg-[#00D632] text-white py-4 px-4 rounded-full font-semibold text-base shadow-lg flex items-center justify-center gap-2">
                          <span className="text-xl">$</span> Cash App
                        </div>
                        <div className="bg-[#008CFF] text-white py-4 px-4 rounded-full font-semibold text-base shadow-lg flex items-center justify-center gap-2">
                          <span className="font-bold text-lg">V</span> Venmo
                        </div>
                        <div className="bg-[#6D1ED4] text-white py-4 px-4 rounded-full font-semibold text-base shadow-lg flex items-center justify-center gap-2">
                          <span className="font-bold text-lg">Z</span> Zelle
                        </div>
                        <div className="bg-[#000000] text-white py-4 px-4 rounded-full font-semibold text-base shadow-lg flex items-center justify-center gap-2">
                          <span className="font-bold text-lg">A</span> Apple Pay
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/30 rounded-full" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-black via-[#050a06] to-[#080808] z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">How it works</h2>
            <p className="text-base sm:text-xl text-[#00a83f]">Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#0d1a10] border border-[#00e85a]/20 flex items-center justify-center mb-4 sm:mb-6">
                <Check className="h-7 w-7 sm:h-8 sm:w-8 text-[#00e85a]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#00e85a]">Pick your username</h3>
              <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                Choose a unique username for your personal payment link
              </p>
            </div>

            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#0d1a10] border border-[#00e85a]/20 flex items-center justify-center mb-4 sm:mb-6">
                <Link2 className="h-7 w-7 sm:h-8 sm:w-8 text-[#00e85a]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#00e85a]">Add your payment apps</h3>
              <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                Connect Cash App, Venmo, PayPal, Zelle, and more in seconds
              </p>
            </div>

            <div className="text-center space-y-3 sm:space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#0d1a10] border border-[#00e85a]/20 flex items-center justify-center mb-4 sm:mb-6">
                <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-[#00e85a]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#00e85a]">Share your link anywhere</h3>
              <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                One link to share everywhere—social media, email, or in person
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 sm:py-20 lg:py-32 px-4 sm:px-6 bg-gradient-to-br from-[#080808] via-black to-[#050a06] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,232,90,0.04)_0%,_transparent_70%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <Card className="bg-[#0d0d0d]/90 backdrop-blur-sm p-6 sm:p-12 shadow-[0_0_60px_rgba(0,232,90,0.05)] border border-[#1a1a1a]">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6 sm:mb-8 text-center">Why LinkPayHub?</h2>
            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00e85a] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#00e85a] mb-1.5 sm:mb-2">{"No more asking \"Do you have...?\""}</h3>
                  <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                    Show all your payment options at once. Let people choose how they want to pay you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00e85a] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#00e85a] mb-1.5 sm:mb-2">Works with all major payment apps</h3>
                  <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                    Cash App, Venmo, PayPal, Zelle, Apple Pay, Google Pay, Bitcoin—connect them all.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00e85a] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#00e85a] mb-1.5 sm:mb-2">Easy to share for anyone</h3>
                  <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                    One simple link. Share it in your bio, email signature, or anywhere you want to get paid.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00e85a] flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-1">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#00e85a] mb-1.5 sm:mb-2">Safe and private</h3>
                  <p className="text-[#00a83f] text-base sm:text-lg leading-relaxed">
                    We never handle payments. People are directed straight to your chosen platform.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="relative py-16 sm:py-20 lg:py-32 px-4 sm:px-6 bg-gradient-to-t from-black via-[#050a06] to-[#080808] z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,168,63,0.06)_0%,_transparent_60%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Frequently asked questions</h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
            <AccordionItem value="item-1" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl sm:rounded-2xl px-4 sm:px-6">
              <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-[#00e85a] hover:no-underline py-4 sm:py-6">
                Is LinkPayHub safe?
              </AccordionTrigger>
              <AccordionContent className="text-[#00a83f] text-sm sm:text-base leading-relaxed pb-4 sm:pb-6">
                Yes! We never handle your payments directly. When someone clicks a payment option, they go straight to
                that platform (like PayPal or Cash App) where the transaction happens securely.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl sm:rounded-2xl px-4 sm:px-6">
              <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-[#00e85a] hover:no-underline py-4 sm:py-6">
                What apps can I connect?
              </AccordionTrigger>
              <AccordionContent className="text-[#00a83f] text-sm sm:text-base leading-relaxed pb-4 sm:pb-6">
                You can connect any payment app—Cash App, Venmo, PayPal, Zelle, Apple Pay, Google Pay, Bitcoin wallets,
                Stripe, and more.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl sm:rounded-2xl px-4 sm:px-6">
              <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-[#00e85a] hover:no-underline py-4 sm:py-6">
                Do people see apps I don't have?
              </AccordionTrigger>
              <AccordionContent className="text-[#00a83f] text-sm sm:text-base leading-relaxed pb-4 sm:pb-6">
                No! Your LinkPayHub only shows the payment methods you've added. If you don't add Venmo, visitors won't
                see a Venmo option.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl sm:rounded-2xl px-4 sm:px-6">
              <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-[#00e85a] hover:no-underline py-4 sm:py-6">
                Can I change my username later?
              </AccordionTrigger>
              <AccordionContent className="text-[#00a83f] text-sm sm:text-base leading-relaxed pb-4 sm:pb-6">
                Your username is permanent once created to ensure link consistency. Choose carefully when setting up
                your account.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <footer className="relative bg-gradient-to-t from-[#001a08] to-black border-t border-[#1a1a1a] py-8 sm:py-12 px-4 sm:px-6 z-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[#00a83f] text-sm sm:text-base">© 2025 LinkPayHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
