"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PublicProfile } from "@/components/public-profile"

function PContent() {
  const params = useSearchParams()
  const username = params.get("u") || ""
  return <PublicProfile username={username} />
}

export default function PPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#d2f77f]">
          <p className="text-xl text-gray-900">Loading...</p>
        </div>
      }
    >
      <PContent />
    </Suspense>
  )
}
