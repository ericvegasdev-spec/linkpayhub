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

  const title = `Pay @${profile.username} with LinkPayHub`
  const description = profile.bio
    ? profile.bio
    : `Cash App, Venmo, PayPal, Zelle, Apple Pay — one tap. Tap to pay @${profile.username}.`

  return {
    title,
    description,
    // Per-profile manifest so "Add to Home Screen" from a profile page saves
    // the profile URL, not the site root, and labels the icon with the handle.
    manifest: `/${profile.username}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: `@${profile.username}`,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "LinkPayHub",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function UsernamePage({ params }: Props) {
  const { username } = await params
  return <PublicProfile username={username} />
}
