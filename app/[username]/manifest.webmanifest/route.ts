// Per-profile PWA manifest. Lets a visitor "Add to Home Screen" from a
// profile page and have the saved icon open directly to that profile
// (start_url + scope) and show the person's @handle as the icon label
// (name/short_name) instead of the generic site.

type Params = { params: Promise<{ username: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { username } = await params
  const handle = username.toLowerCase().replace(/[^a-z0-9]/g, "")

  const manifest = {
    name: `Pay @${handle}`,
    short_name: `@${handle}`,
    description: `Pay @${handle} through Cash App, Venmo, PayPal, Zelle, Apple Pay — one tap.`,
    start_url: `/${handle}`,
    scope: `/${handle}`,
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
      "Cache-Control": "public, max-age=600",
    },
  })
}
