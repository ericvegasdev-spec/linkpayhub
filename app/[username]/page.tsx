import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"
import { PublicProfile } from "@/components/public-profile"

export function generateStaticParams() {
  return []
}

export const dynamicParams = true

type Props = {
  params: Promise<{ username: string }>
}

async function fetchProfile(username: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  try {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, bio, avatar_url")
      .eq("username", username)
      .maybeSingle()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await fetchProfile(username)

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://linkpayhub.com"
  const pageUrl = `${baseUrl}/${username}`

  if (!profile) {
    return {
      title: `@${username} — LinkPayHub`,
      description: "Send money through any app with one link.",
      openGraph: {
        title: `@${username} on LinkPayHub`,
        description: "One link. Every payment app.",
        url: pageUrl,
        siteName: "LinkPayHub",
        type: "profile",
      },
      twitter: { card: "summary" },
    }
  }

  const displayName = profile.display_name || profile.username
  const title = `@${profile.username} — LinkPayHub`
  const description = profile.bio
    ? profile.bio
    : `Pay @${profile.username} through Cash App, Venmo, PayPal, Zelle, Apple Pay, and more — one tap.`

  // Social scrapers (iMessage, Twitter, etc.) can't render data: URLs — only
  // include avatar in OG tags when it's an absolute http(s) URL. Fall back to
  // the branded logo when a real avatar isn't available so previews never show
  // the generic browser icon.
  const usableAvatar =
    profile.avatar_url && /^https?:\/\//i.test(profile.avatar_url)
      ? profile.avatar_url
      : `${baseUrl}/linkpayhub-logo.png`
  const images = [
    { url: usableAvatar, width: 512, height: 512, alt: `@${profile.username}` },
  ]

  return {
    title,
    description,
    openGraph: {
      title: `@${profile.username} on LinkPayHub`,
      description,
      url: pageUrl,
      siteName: "LinkPayHub",
      type: "profile",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: `@${profile.username} on LinkPayHub`,
      description,
      images: images?.map((i) => i.url),
    },
  }
}

export default async function UsernamePage({ params }: Props) {
  const { username } = await params
  return <PublicProfile username={username} />
}
