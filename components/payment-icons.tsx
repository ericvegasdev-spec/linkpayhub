import type { ComponentType, SVGProps } from "react"
import {
  SiCashapp,
  SiVenmo,
  SiPaypal,
  SiZelle,
  SiApplepay,
  SiGooglepay,
  SiBitcoin,
  SiStripe,
} from "react-icons/si"

type IconComp = ComponentType<SVGProps<SVGSVGElement>>

// Single source of truth for payment-platform presentation on profile + preview
// cards. Brand icons come from Simple Icons (via react-icons) so they are the
// real, recognizable marks — not text substitutes.
export const PLATFORM_META: Record<
  string,
  { name: string; color: string; hover: string; icon: IconComp }
> = {
  cashapp: { name: "Cash App", color: "#00D632", hover: "#00C02E", icon: SiCashapp },
  venmo: { name: "Venmo", color: "#008CFF", hover: "#0077DD", icon: SiVenmo },
  paypal: { name: "PayPal", color: "#003087", hover: "#002870", icon: SiPaypal },
  zelle: { name: "Zelle", color: "#6D1ED4", hover: "#5D1AB8", icon: SiZelle },
  applepay: { name: "Apple Pay", color: "#000000", hover: "#111111", icon: SiApplepay },
  googlepay: { name: "Google Pay", color: "#4285F4", hover: "#3A76DB", icon: SiGooglepay },
  bitcoin: { name: "Bitcoin", color: "#F7931A", hover: "#E0831A", icon: SiBitcoin },
  stripe: { name: "Stripe", color: "#635BFF", hover: "#4F47E5", icon: SiStripe },
}

export function normalizePlatformKey(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "")
}

export function PaymentIcon({
  platform,
  className = "w-5 h-5",
  brandColor = false,
}: {
  platform: string
  className?: string
  brandColor?: boolean
}) {
  const key = normalizePlatformKey(platform)
  const meta = PLATFORM_META[key]
  if (!meta) return null
  const Icon = meta.icon
  return <Icon className={className} style={brandColor ? { color: meta.color } : undefined} aria-hidden />
}
