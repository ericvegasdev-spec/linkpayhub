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
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#00e85a] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#00e85a] text-sm">{message}</p>
      </div>
    </div>
  )
}
