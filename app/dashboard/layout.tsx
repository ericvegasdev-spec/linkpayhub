import type { Metadata } from "next"

// Scope the manifest + apple-web-app metadata to /dashboard so the
// "Add to Phone" icon saved from the dashboard opens right back here
// (owner's mini-app for managing their LinkPayHub), separate from the
// per-profile manifest that serves payer-side /[username] pages.
export const metadata: Metadata = {
  title: "Dashboard · LinkPayHub",
  description: "Manage your LinkPayHub — edit your payment links, bio, and photo.",
  manifest: "/dashboard/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Link Pay Hub",
    statusBarStyle: "black-translucent",
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
