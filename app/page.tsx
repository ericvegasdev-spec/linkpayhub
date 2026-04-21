"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Shield, Link2, Zap, ArrowRight, QrCode, Sparkles, Eye, Lock, Heart, Palette } from "lucide-react"
import { supabase } from "@/lib/supabaseclient"
import { Session } from "@supabase/supabase-js"

// ── Scroll-triggered reveal ──────────────────────────────────────────────
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-visible")
            obs.unobserve(el)
          }
        })
      },
      { threshold: 0.15, rootMargin: "-50px 0px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`lph-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

// ── Subtle parallax Y based on scroll (element-centered) ─────────────────
function useParallax(strength = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const rect = el.getBoundingClientRect()
        const vh = window.innerHeight
        const center = rect.top + rect.height / 2 - vh / 2
        el.style.setProperty("--parallax", `${-center * strength}px`)
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [strength])
  return ref
}

// ── Layered scroll FX for hero elements ──────────────────────────────────
// Each ref moves at a different rate + fades out as user scrolls away from
// the top. Uses direct style manipulation (no re-renders) for 60fps on mobile.
function useHeroScrollFx(refs: {
  eyebrow: React.RefObject<HTMLElement | null>
  headline: React.RefObject<HTMLElement | null>
  subtitle: React.RefObject<HTMLElement | null>
  cta: React.RefObject<HTMLElement | null>
  chips: React.RefObject<HTMLElement | null>
}) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }
    let raf = 0
    const tiers: Array<[
      React.RefObject<HTMLElement | null>,
      number, // translate multiplier (negative = moves up faster than scroll)
      number, // fade distance (px of scroll before fully faded)
    ]> = [
      [refs.eyebrow, -0.45, 260],
      [refs.headline, -0.18, 900],
      [refs.subtitle, -0.28, 500],
      [refs.cta, -0.12, 1100],
      [refs.chips, -0.35, 400],
    ]
    const apply = () => {
      raf = 0
      const y = window.scrollY
      for (const [ref, mult, fade] of tiers) {
        const el = ref.current
        if (!el) continue
        if (y === 0) {
          // let initial lph-enter CSS animation play unobstructed
          el.style.transform = ""
          el.style.opacity = ""
          el.style.willChange = ""
          continue
        }
        const ty = Math.max(-280, y * mult)
        const opacity = Math.max(0, Math.min(1, 1 - y / fade))
        el.style.transform = `translate3d(0, ${ty}px, 0)`
        el.style.opacity = `${opacity}`
        el.style.willChange = "transform, opacity"
      }
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(apply)
    }
    apply()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [refs])
}

export default function HomePage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const phoneRef = useParallax(0.08)
  const heroBlobRef = useParallax(0.05)

  const eyebrowRef = useRef<HTMLSpanElement | null>(null)
  const headlineRef = useRef<HTMLHeadingElement | null>(null)
  const subtitleRef = useRef<HTMLParagraphElement | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const chipsRef = useRef<HTMLDivElement | null>(null)

  useHeroScrollFx({
    eyebrow: eyebrowRef,
    headline: headlineRef,
    subtitle: subtitleRef,
    cta: ctaRef,
    chips: chipsRef,
  })

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setAuthLoading(false)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription?.unsubscribe()
  }, [])

  const handleGetStarted = () => {
    if (username) localStorage.setItem("linkpayhub_temp_username", username)
    router.push("/onboarding")
  }

  const handleLogin = () => router.push("/login")
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* ─── Ambient background ─────────────────────────────────────────── */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#010804] to-black pointer-events-none" aria-hidden />
      <div className="fixed inset-0 lph-grid opacity-[0.18] pointer-events-none lph-grid-drift" aria-hidden />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,232,90,0.12)_0%,_transparent_55%)] pointer-events-none" aria-hidden />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,232,90,0.05)_0%,_transparent_60%)] pointer-events-none" aria-hidden />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 sticky top-0 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/linkpayhub-logo.png" alt="LinkPayHub" width={40} height={40} className="rounded-xl w-9 h-9 sm:w-10 sm:h-10" />
            <span className="font-bold text-white tracking-tight text-lg sm:text-xl">
              LinkPayHub
            </span>
          </Link>

          {!authLoading && (
            <div className="flex items-center gap-2">
              {session ? (
                <>
                  <Link
                    href="/dashboard"
                    className="hidden sm:inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition px-3 py-2 rounded-full"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-white/70 hover:text-white transition px-4 py-2 rounded-full border border-white/10 hover:border-white/20"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-white/80 hover:text-white transition px-4 py-2 rounded-full border border-white/10 hover:border-white/20"
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden">
        {/* Parallax green blob */}
        <div ref={heroBlobRef} className="absolute top-[20%] left-1/2 w-[800px] h-[800px] max-w-[110vw] max-h-[110vw] pointer-events-none" style={{ transform: "translate(-50%, -50%) translateY(var(--parallax, 0px))" }} aria-hidden>
          <div className="w-full h-full bg-[radial-gradient(circle,_rgba(0,232,90,0.18)_0%,_transparent_55%)] lph-blob" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 sm:pt-20 lg:pt-28 pb-16 sm:pb-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-10 xl:gap-14 items-center">
            {/* LEFT: Copy + CTA */}
            <div className="space-y-8 text-center lg:text-left">
              <span
                ref={eyebrowRef}
                className="lph-enter inline-flex items-center gap-2 bg-[#00e85a]/[0.07] border border-[#00e85a]/30 text-[#00e85a] text-[11px] sm:text-xs font-semibold tracking-[0.15em] uppercase px-3 py-1.5 rounded-full shadow-[0_0_24px_rgba(0,232,90,0.15)]"
                style={{ animationDelay: "0ms" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00e85a] shadow-[0_0_10px_rgba(0,232,90,0.9)]" />
                No credit card · 30 sec setup
              </span>

              <h1
                ref={headlineRef}
                className="lph-enter font-black tracking-[-0.03em] leading-[0.95] text-[40px] xs:text-[52px] sm:text-[80px] lg:text-[104px] xl:text-[128px]"
                style={{ animationDelay: "80ms" }}
              >
                <span className="block text-white">One link.</span>
                <span className="block bg-gradient-to-br from-[#00e85a] via-[#00e85a] to-[#00a83f] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(0,232,90,0.35)]">
                  Every payment.
                </span>
              </h1>

              <p
                ref={subtitleRef}
                className="lph-enter text-base sm:text-xl text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                style={{ animationDelay: "160ms" }}
              >
                One link. Every app they pay with. Zero fees.
              </p>

              <div
                ref={ctaRef}
                className="lph-enter max-w-md mx-auto lg:mx-0 space-y-3"
                style={{ animationDelay: "240ms" }}
              >
                <div className="relative flex items-center overflow-hidden rounded-full bg-[#0a0a0a] border border-white/10 hover:border-[#00e85a]/50 transition-colors shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                  <span className="pl-5 pr-1 py-3 sm:py-4 text-sm sm:text-base text-white/40 whitespace-nowrap font-mono">
                    linkpayhub.com/
                  </span>
                  <input
                    type="text"
                    placeholder="yourname"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    className="flex-1 min-w-0 bg-transparent outline-none text-white font-semibold text-base sm:text-lg placeholder:text-white/30 pr-4"
                    aria-label="Choose your username"
                  />
                </div>
                <button
                  onClick={handleGetStarted}
                  disabled={!username}
                  className="group relative overflow-hidden w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black px-7 py-4 sm:py-5 rounded-full font-bold text-base sm:text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:scale-[1.02] enabled:active:scale-[0.98] shadow-[0_10px_40px_rgba(251,191,36,0.35)] enabled:hover:shadow-[0_15px_50px_rgba(251,191,36,0.5)]"
                >
                  <span className="relative z-10 inline-flex items-center justify-center gap-2">
                    Claim your link
                    <ArrowRight className="w-5 h-5 transition-transform group-enabled:group-hover:translate-x-0.5" />
                  </span>
                </button>
                <p className="text-xs text-white/40 text-center lg:text-left">
                  No login required to start. Takes 30 seconds.
                </p>
              </div>

              <div
                ref={chipsRef}
                className="lph-enter flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-[11px] sm:text-xs text-white/40 uppercase tracking-[0.15em] font-semibold pt-2"
                style={{ animationDelay: "320ms" }}
              >
                <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-[#00e85a]" /> We never touch your money</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-[#00e85a]" /> Opens their app, one tap</span>
                <span className="flex items-center gap-1.5"><QrCode className="w-3 h-3 text-[#00e85a]" /> Share with a QR</span>
              </div>
            </div>

            {/* RIGHT: Phone mockup */}
            <div className="relative flex justify-center">
              <div
                ref={phoneRef}
                className="relative w-[260px] sm:w-[320px] lg:w-[440px] xl:w-[500px] 2xl:w-[540px] lph-float"
                style={{ transform: "translateY(var(--parallax, 0px))" }}
              >
                {/* Glow aura */}
                <div className="absolute -inset-10 bg-[radial-gradient(circle,_rgba(0,232,90,0.35)_0%,_transparent_65%)] pointer-events-none blur-2xl" aria-hidden />

                <div
                  className="relative bg-gradient-to-br from-[#1f1f1f] via-[#0f0f0f] to-[#050505] rounded-[2.8rem] lg:rounded-[3.5rem] p-2.5 lg:p-3"
                  style={{
                    boxShadow:
                      "0 40px 100px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 2px rgba(255,255,255,0.15), 0 0 120px rgba(0,232,90,0.22)",
                  }}
                >
                  <div className="absolute top-2.5 lg:top-3 left-1/2 -translate-x-1/2 w-16 lg:w-24 h-5 lg:h-7 bg-black rounded-full z-20" />

                  <div className="relative rounded-[2.3rem] lg:rounded-[3rem] overflow-hidden" style={{ aspectRatio: "9 / 19.5", background: "linear-gradient(180deg, #063d20 0%, #012a14 50%, #000804 100%)" }}>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,232,90,0.25)_0%,_transparent_55%)] pointer-events-none" />
                    <div className="relative px-5 pt-7 pb-1.5">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-white">
                        <span>9:41</span>
                        <div className="w-3.5 h-2.5 border border-white rounded-sm relative">
                          <div className="absolute inset-0.5 bg-white rounded-[1px]" />
                        </div>
                      </div>
                    </div>
                    <div className="relative px-5 pt-5 pb-8 text-center">
                      <div className="w-20 h-20 mx-auto rounded-full mb-3 overflow-hidden ring-2 ring-white/15 shadow-[0_0_32px_rgba(0,232,90,0.35)]">
                        <Image src="/maryjane-avatar.png" alt="" width={80} height={80} className="w-full h-full object-cover" />
                      </div>
                      <h2 className="text-lg font-bold text-[#00e85a] drop-shadow-[0_0_14px_rgba(0,232,90,0.4)] mb-0.5">@Maryjane</h2>
                      <p className="text-[11px] text-white/60 mb-5">Business owner · Beauty Salon</p>
                      <div className="space-y-2.5">
                        <div className="bg-[#00D632] text-white py-3 px-3 rounded-full font-semibold text-xs shadow-md flex items-center justify-center gap-1.5">
                          <span>$</span> Cash App
                        </div>
                        <div className="bg-[#008CFF] text-white py-3 px-3 rounded-full font-semibold text-xs shadow-md flex items-center justify-center gap-1.5">
                          <span>V</span> Venmo
                        </div>
                        <div className="bg-[#6D1ED4] text-white py-3 px-3 rounded-full font-semibold text-xs shadow-md flex items-center justify-center gap-1.5">
                          <span>Z</span> Zelle
                        </div>
                        <div className="bg-black text-white py-3 px-3 rounded-full font-semibold text-xs shadow-md flex items-center justify-center gap-1.5 border border-white/10">
                          <span>A</span> Apple Pay
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating pill accent */}
                <div className="absolute -left-8 sm:-left-14 top-20 bg-[#0a0a0a]/90 backdrop-blur border border-[#00e85a]/30 rounded-full px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-[#00e85a] flex items-center gap-1.5 shadow-[0_0_24px_rgba(0,232,90,0.25)] lph-float">
                  <Sparkles className="w-3 h-3" />
                  Just tap to pay
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social proof / stats ───────────────────────────────────────── */}
      <section className="relative z-10 py-10 sm:py-16 border-y border-white/[0.06] bg-black/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
          {[
            { num: "1", label: "Link to share" },
            { num: "8+", label: "Payment apps" },
            { num: "0%", label: "Platform fees" },
            { num: "30s", label: "Setup time" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="text-center md:text-left">
                <div className="font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-none">
                  {s.num}
                </div>
                <div className="text-[11px] sm:text-xs uppercase tracking-[0.15em] text-white/40 mt-2 font-semibold">
                  {s.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 sm:py-32 px-4 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-2xl mb-14 sm:mb-20">
              <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold mb-4">
                How it works
              </span>
              <h2 className="font-black tracking-[-0.02em] text-[clamp(36px,7vw,64px)] text-white leading-[1.02]">
                Three steps.<br />
                <span className="text-white/40">Thirty seconds.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { n: "01", icon: Shield, title: "Pick your username", body: "Grab your handle — linkpayhub.com/you. It's yours to keep and share anywhere." },
              { n: "02", icon: Link2, title: "Add your payment apps", body: "Paste your Cash App, Venmo, PayPal, Zelle, Apple Pay, Bitcoin, or Stripe. Takes seconds." },
              { n: "03", icon: Zap, title: "Share one link. Get paid.", body: "Text it, post it, put it on your card. Every payer opens the app they already use." },
            ].map((step, i) => (
              <Reveal key={step.n} delay={i * 120}>
                <div className="group relative h-full bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-white/[0.08] rounded-3xl p-7 sm:p-8 hover:border-[#00e85a]/40 transition-all duration-500 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,232,90,0.08)_0%,_transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-[#00e85a]/10 border border-[#00e85a]/30 flex items-center justify-center shadow-[0_0_24px_rgba(0,232,90,0.15)] group-hover:shadow-[0_0_40px_rgba(0,232,90,0.35)] transition-shadow">
                        <step.icon className="w-5 h-5 text-[#00e85a]" />
                      </div>
                      <span className="font-black text-5xl text-white/5 group-hover:text-[#00e85a]/20 transition-colors leading-none">
                        {step.n}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">{step.title}</h3>
                    <p className="text-white/50 text-sm sm:text-base leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why LinkPayHub — iconified, lighter grid ─────────────────────── */}
      <section className="relative z-10 py-24 sm:py-32 px-4 sm:px-6 lg:px-10 bg-gradient-to-b from-transparent via-[#001806]/25 to-transparent">
        {/* Subtle warm corner glow to break up the page rhythm */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] max-w-[80vw] max-h-[80vw] pointer-events-none opacity-60" aria-hidden>
          <div className="w-full h-full bg-[radial-gradient(circle,_rgba(251,191,36,0.08)_0%,_transparent_60%)]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-2xl mb-14 sm:mb-20">
              <span className="inline-block text-[11px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold mb-4">
                Why LinkPayHub
              </span>
              <h2 className="font-black tracking-[-0.02em] text-[clamp(36px,7vw,64px)] text-white leading-[1.02]">
                Built for<br />
                <span className="text-white/40">people who get paid.</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Eye, title: "All options, one view", body: "Payer picks their app." },
              { icon: Lock, title: "We don't touch money", body: "Direct to your app." },
              { icon: Heart, title: "Made for creators", body: "Streamers, biz, freelancers." },
              { icon: Palette, title: "Looks sharp anywhere", body: "Branded on every share." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="group bg-[#0a0a0a]/60 border border-white/[0.06] hover:border-[#00e85a]/30 rounded-2xl p-6 transition-all hover:-translate-y-0.5 h-full">
                  <div className="w-10 h-10 rounded-xl bg-[#00e85a]/10 border border-[#00e85a]/25 flex items-center justify-center mb-4 group-hover:shadow-[0_0_24px_rgba(0,232,90,0.3)] transition-shadow">
                    <item.icon className="w-5 h-5 text-[#00e85a]" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5 tracking-tight">{item.title}</h3>
                  <p className="text-white/50 text-sm leading-snug">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Mid-page CTA — warm spotlight band for contrast ─────────────── */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-10 overflow-hidden">
        {/* Warm amber glow to make this CTA zone pop from the surrounding dark */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] max-w-[140vw] bg-[radial-gradient(ellipse,_rgba(251,191,36,0.12)_0%,_transparent_60%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <Reveal>
            <h2 className="font-black tracking-[-0.02em] text-[clamp(40px,9vw,84px)] leading-[0.98] mb-6">
              <span className="text-white">Your link is</span>
              <br />
              <span className="bg-gradient-to-r from-[#00e85a] to-[#00a83f] bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(0,232,90,0.35)]">
                seconds away.
              </span>
            </h2>
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-8">
              Claim your username before someone else grabs it. It's free — always.
            </p>
            <button
              onClick={handleGetStarted}
              disabled={!username}
              className="inline-flex items-center gap-2 bg-[#fbbf24] hover:bg-[#f59e0b] text-black px-8 py-4 rounded-full font-bold text-base sm:text-lg shadow-[0_15px_50px_rgba(251,191,36,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {username ? `Claim @${username}` : "Get your free link"}
              <ArrowRight className="w-5 h-5" />
            </button>
            {!username && (
              <p className="mt-3 text-xs text-white/40">
                Type a username in the hero up top, or start at onboarding.
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 sm:py-32 px-4 sm:px-6 lg:px-10">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="font-black tracking-[-0.02em] text-[clamp(36px,7vw,64px)] text-white leading-[1.02] mb-10 sm:mb-14 text-center">
              Questions.<br />
              <span className="text-white/40">Straight answers.</span>
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem value="i1" className="bg-[#0a0a0a]/80 border border-white/[0.08] rounded-2xl px-5 sm:px-6 hover:border-[#00e85a]/30 transition-colors">
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-white hover:no-underline py-5">
                  What info do you store about me?
                </AccordionTrigger>
                <AccordionContent className="text-white/60 text-sm sm:text-base leading-relaxed pb-5">
                  Just your username, your optional email, and your payment handles (like your $cashtag or @venmo-username). Stuff you'd write on a business card. We never see passwords, card numbers, or your money — your payment apps handle all of that when your payer taps through.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="i2" className="bg-[#0a0a0a]/80 border border-white/[0.08] rounded-2xl px-5 sm:px-6 hover:border-[#00e85a]/30 transition-colors">
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-white hover:no-underline py-5">
                  What apps can I connect?
                </AccordionTrigger>
                <AccordionContent className="text-white/60 text-sm sm:text-base leading-relaxed pb-5">
                  Cash App, Venmo, PayPal, Zelle, Apple Pay, Google Pay, Bitcoin, and Stripe payment links. More coming as people ask.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="i3" className="bg-[#0a0a0a]/80 border border-white/[0.08] rounded-2xl px-5 sm:px-6 hover:border-[#00e85a]/30 transition-colors">
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-white hover:no-underline py-5">
                  Do payers see apps I don't have?
                </AccordionTrigger>
                <AccordionContent className="text-white/60 text-sm sm:text-base leading-relaxed pb-5">
                  No. Only the payment methods you've added show up. If you skip Venmo, nobody sees a Venmo button.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="i4" className="bg-[#0a0a0a]/80 border border-white/[0.08] rounded-2xl px-5 sm:px-6 hover:border-[#00e85a]/30 transition-colors">
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-white hover:no-underline py-5">
                  Can I change my username later?
                </AccordionTrigger>
                <AccordionContent className="text-white/60 text-sm sm:text-base leading-relaxed pb-5">
                  Your username is permanent to keep your shared links working forever. Choose carefully at signup.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="i5" className="bg-[#0a0a0a]/80 border border-white/[0.08] rounded-2xl px-5 sm:px-6 hover:border-[#00e85a]/30 transition-colors">
                <AccordionTrigger className="text-left text-base sm:text-lg font-semibold text-white hover:no-underline py-5">
                  Is there a fee?
                </AccordionTrigger>
                <AccordionContent className="text-white/60 text-sm sm:text-base leading-relaxed pb-5">
                  No. LinkPayHub is free. Your payment apps may have their own fees (e.g., PayPal's standard rates), but we add zero on top.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Image src="/linkpayhub-logo.png" alt="" width={24} height={24} className="rounded-md" />
            <span>© 2025 LinkPayHub. Every payment, one link.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/login" className="hover:text-white transition">Login</Link>
            <Link href="/onboarding" className="hover:text-white transition">Create a page</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
