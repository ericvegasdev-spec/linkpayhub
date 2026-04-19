"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Confirming your account...")

  useEffect(() => {
    const handle = async () => {
      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get("code")
        const isClaim = url.searchParams.get("claim") === "1"

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (isClaim && session?.user?.email) {
          setMessage("Claiming your page...")

          const email = session.user.email.toLowerCase()

          // Find the unclaimed profile we reserved during onboarding
          const { data: profile, error: fetchErr } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("pending_email", email)
            .is("auth_user_id", null)
            .maybeSingle()

          if (!fetchErr && profile?.id) {
            await supabase
              .from("profiles")
              .update({ auth_user_id: session.user.id, pending_email: null })
              .eq("id", profile.id)

            try {
              localStorage.removeItem("linkpayhub_claim_username")
            } catch {}

            router.replace(`/dashboard?welcome=${encodeURIComponent(profile.username)}`)
            return
          }
        }

        router.replace("/dashboard")
      } catch (err: any) {
        setMessage(`Sign-in failed: ${err.message || "please try logging in."}`)
        setTimeout(() => router.replace("/login"), 2500)
      }
    }
    handle()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#001a0a] to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.1)_0%,_transparent_60%)] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#00e85a] border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(0,232,90,0.4)]" />
        <p className="text-[#00e85a] text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}
