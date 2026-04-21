// Dashboard-scoped PWA manifest. When an owner taps "Add to Phone" from
// /dashboard, the saved home-screen icon opens right back to the dashboard
// — effectively a private "LinkPayHub admin" mini-app for managing their
// payment page.

export function GET() {
  const manifest = {
    name: "Link Pay Hub",
    short_name: "Link Pay Hub",
    description: "Manage your LinkPayHub — edit your bio, photo, and payment links.",
    start_url: "/dashboard",
    scope: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000804",
    theme_color: "#00e85a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/linkpayhub-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
