"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-4 text-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,232,90,0.08)_0%,_transparent_60%)] pointer-events-none" />
      <div className="relative z-10 max-w-md space-y-6">
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold px-4 py-1.5 rounded-full">
          Something went sideways
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          We hit a snag.
        </h1>
        <p className="text-white/60 text-base leading-relaxed">
          Your data is safe — nothing was lost. Give it another try, or head back home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#00e85a] text-black font-semibold rounded-full hover:bg-[#00c84e] transition shadow-[0_0_30px_rgba(0,232,90,0.3)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-white/20 text-white font-semibold rounded-full hover:bg-white/5 transition"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  )
}
