"use client"

import { useEffect, useRef, useState } from "react"
import { X, Camera, AlertCircle } from "lucide-react"

type Props = {
  open: boolean
  platformLabel: string
  onClose: () => void
  onDecoded: (value: string) => void
}

export function QrScanModal({ open, platformLabel, onClose, onDecoded }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setStarting(true)

    const start = async () => {
      try {
        const mod = await import("qr-scanner")
        if (cancelled) return
        const QrScanner = mod.default
        const video = videoRef.current
        if (!video) return

        const scanner = new QrScanner(
          video,
          (result: { data: string }) => {
            if (!result?.data) return
            scanner.stop()
            onDecoded(result.data)
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: "environment",
            maxScansPerSecond: 5,
          },
        )
        scannerRef.current = scanner
        await scanner.start()
      } catch (err: any) {
        if (cancelled) return
        const msg = err?.message || String(err)
        if (/NotAllowed|Permission/i.test(msg)) {
          setError("Camera access blocked. Tap the camera icon in your address bar and allow it, then try again.")
        } else if (/NotFound/i.test(msg)) {
          setError("No camera found on this device.")
        } else {
          setError(msg)
        }
      } finally {
        if (!cancelled) setStarting(false)
      }
    }

    start()
    return () => {
      cancelled = true
      try {
        scannerRef.current?.stop()
        scannerRef.current?.destroy()
      } catch {}
      scannerRef.current = null
    }
  }, [open, onDecoded])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#00e85a] font-semibold">Scan QR code</p>
          <p className="text-base font-bold text-white mt-0.5">{platformLabel}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Overlay frame */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-[70vw] max-w-[320px] aspect-square">
            <div className="absolute -inset-2 rounded-[32px] ring-2 ring-[#00e85a]/60 shadow-[0_0_60px_rgba(0,232,90,0.45)]" />
            <div className="absolute top-0 left-0 w-10 h-10 border-l-4 border-t-4 border-[#00e85a] rounded-tl-[20px]" />
            <div className="absolute top-0 right-0 w-10 h-10 border-r-4 border-t-4 border-[#00e85a] rounded-tr-[20px]" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-l-4 border-b-4 border-[#00e85a] rounded-bl-[20px]" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-r-4 border-b-4 border-[#00e85a] rounded-br-[20px]" />
          </div>
        </div>

        {starting && !error && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <Camera className="w-8 h-8 text-[#00e85a] animate-pulse" />
            <p className="text-white/80 text-sm">Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
            <div className="max-w-sm bg-[#0a0a0a] border border-red-500/30 rounded-2xl p-5 space-y-3 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm text-white/80 leading-relaxed">{error}</p>
              <button
                onClick={onClose}
                className="text-sm font-semibold text-[#00e85a] hover:underline"
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="relative z-10 px-5 py-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/60 leading-relaxed">
          Open your {platformLabel} app → go to your profile → tap your QR code, then point your camera at it.
        </p>
      </div>
    </div>
  )
}
