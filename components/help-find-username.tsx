"use client"

import { X, Sparkles } from "lucide-react"

type PlatformId =
  | "paypal"
  | "cashapp"
  | "venmo"
  | "zelle"
  | "applepay"
  | "googlepay"
  | "bitcoin"
  | "stripe"

const GUIDES: Record<
  PlatformId,
  { title: string; steps: string[]; example: string }
> = {
  cashapp: {
    title: "Find your Cash App $cashtag",
    steps: [
      "Open your Cash App.",
      "Tap the profile icon in the top-right corner.",
      "Look for the line that starts with $ (like $ericvegas).",
      "Type exactly what's after the $ into the box.",
    ],
    example: "$yourname",
  },
  venmo: {
    title: "Find your Venmo @username",
    steps: [
      "Open your Venmo app.",
      "Tap the Me tab (bottom right).",
      "Your @username is shown right under your name.",
      "Type what's after the @ into the box.",
    ],
    example: "@yourname",
  },
  paypal: {
    title: "Find your PayPal.me link",
    steps: [
      "Open paypal.com/paypalme on your phone.",
      "Sign in if you need to.",
      "Your PayPal.me link looks like paypal.me/yourname.",
      "Type the part after paypal.me/ into the box.",
    ],
    example: "paypal.me/yourname",
  },
  zelle: {
    title: "Find your Zelle contact",
    steps: [
      "Zelle uses your email or phone number — not a username.",
      "Use the email or phone number you registered with your bank for Zelle.",
      "If you're not sure, log into your bank's app → look for Zelle → your contact info is shown there.",
    ],
    example: "you@email.com OR (555) 123-4567",
  },
  applepay: {
    title: "Find your Apple Pay contact",
    steps: [
      "Apple Pay uses your Apple ID email OR phone number.",
      "On iPhone: Settings → Wallet & Apple Pay → tap your card → scroll down to 'Send & Request'.",
      "The email or phone shown there is what people use to send you money.",
    ],
    example: "you@icloud.com OR (555) 123-4567",
  },
  googlepay: {
    title: "Find your Google Pay link",
    steps: [
      "Google Pay uses your email (the one linked to your Google account).",
      "Open Google Pay → profile → your email is shown there.",
    ],
    example: "you@gmail.com",
  },
  bitcoin: {
    title: "Find your Bitcoin address",
    steps: [
      "Open your Bitcoin wallet app (Coinbase, Cash App, Strike, etc.).",
      "Find the 'Receive' button.",
      "Copy the long string that starts with 1, 3, or bc1.",
      "Paste it in the box.",
    ],
    example: "bc1qxy2k...",
  },
  stripe: {
    title: "Find your Stripe payment link",
    steps: [
      "Log into dashboard.stripe.com.",
      "Go to Payments → Payment Links.",
      "Create a payment link if you don't have one yet.",
      "Copy the full URL (starts with https://buy.stripe.com/).",
    ],
    example: "https://buy.stripe.com/...",
  },
}

type Props = {
  open: boolean
  platformId: PlatformId | null
  onClose: () => void
}

export function HelpFindUsername({ open, platformId, onClose }: Props) {
  if (!open || !platformId) return null
  const guide = GUIDES[platformId]
  if (!guide) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border border-[#00e85a]/25 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 sm:p-7 relative shadow-[0_0_80px_rgba(0,232,90,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold mb-2">
          <Sparkles className="w-3 h-3" />
          Find it in 10 seconds
        </div>

        <h3 className="text-xl sm:text-2xl font-black tracking-[-0.02em] text-white mb-5">
          {guide.title}
        </h3>

        <ol className="space-y-3 mb-5">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#00e85a]/10 border border-[#00e85a]/30 flex items-center justify-center text-[11px] font-bold text-[#00e85a]">
                {i + 1}
              </div>
              <p className="text-sm text-white/80 leading-relaxed pt-0.5">{step}</p>
            </li>
          ))}
        </ol>

        <div className="bg-black/60 border border-white/[0.08] rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-semibold mb-0.5">Looks like</p>
          <p className="text-sm font-mono text-[#00e85a]">{guide.example}</p>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-[#00e85a] text-black font-bold py-3 rounded-full text-sm hover:bg-[#00c84e] transition shadow-[0_0_30px_rgba(0,232,90,0.35)]"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
