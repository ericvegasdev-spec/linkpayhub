import { ImageResponse } from "next/og"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Pay me on LinkPayHub"

type Props = { params: Promise<{ username: string }> }

async function fetchProfile(username: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("username", username)
      .maybeSingle()
    return data
  } catch {
    return null
  }
}

export default async function OGImage({ params }: Props) {
  const { username } = await params
  const profile = await fetchProfile(username.toLowerCase())

  const handle = profile?.username || username
  const avatarUrl =
    profile?.avatar_url && /^https?:\/\//i.test(profile.avatar_url)
      ? profile.avatar_url
      : null

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #063d20 0%, #012a14 55%, #000804 100%)",
          position: "relative",
          padding: "70px 90px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 900px 700px at 20% 0%, rgba(0,232,90,0.28) 0%, transparent 60%)",
          }}
        />

        {/* Main content row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "70px",
            width: "100%",
            zIndex: 10,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 400,
              height: 400,
              borderRadius: "50%",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.04)",
              border: "6px solid rgba(0,232,90,0.35)",
              boxShadow: "0 0 80px rgba(0,232,90,0.45)",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                width="400"
                height="400"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ fontSize: 220, color: "rgba(255,255,255,0.35)", display: "flex" }}>
                @
              </div>
            )}
          </div>

          {/* Text block */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div
              style={{
                fontSize: 30,
                color: "#00e85a",
                letterSpacing: 4,
                fontWeight: 700,
                marginBottom: 14,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Pay me with one tap
            </div>
            <div
              style={{
                fontSize: 96,
                color: "white",
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: 22,
                letterSpacing: -3,
                display: "flex",
              }}
            >
              @{handle}
            </div>
            <div
              style={{
                fontSize: 26,
                color: "rgba(255,255,255,0.62)",
                lineHeight: 1.3,
                display: "flex",
              }}
            >
              Cash App · Venmo · PayPal · Zelle · Apple Pay
            </div>
          </div>
        </div>

        {/* Branding bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 42,
            right: 90,
            display: "flex",
            alignItems: "center",
            gap: 14,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: 30,
              color: "#00e85a",
              fontWeight: 800,
              letterSpacing: -0.5,
              display: "flex",
            }}
          >
            LinkPayHub
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.35)", display: "flex" }}>→</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
