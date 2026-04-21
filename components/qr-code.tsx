"use client"

import { useEffect, useRef } from "react"
import QRCodeStyling from "qr-code-styling"

interface QRCodeProps {
  value: string
  size?: number
}

export function QRCode({ value, size = 200 }: QRCodeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const qrCode = useRef<QRCodeStyling | null>(null)

  useEffect(() => {
    if (!qrCode.current) {
      qrCode.current = new QRCodeStyling({
        width: size,
        height: size,
        data: value,
        margin: 16,
        image: "/linkpayhub-logo.png",
        qrOptions: {
          typeNumber: 0,
          mode: "Byte",
          errorCorrectionLevel: "H",
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.28,
          margin: 6,
          crossOrigin: "anonymous",
        },
        dotsOptions: {
          color: "#ffffff",
          type: "rounded",
        },
        backgroundOptions: {
          color: "#0a0a0a",
        },
        cornersSquareOptions: {
          color: "#00e85a",
          type: "extra-rounded",
        },
        cornersDotOptions: {
          color: "#00e85a",
          type: "dot",
        },
      })
    }

    if (ref.current) {
      ref.current.innerHTML = ""
      qrCode.current.append(ref.current)
    }
  }, [value, size])

  useEffect(() => {
    if (qrCode.current) {
      qrCode.current.update({ data: value })
    }
  }, [value])

  return <div ref={ref} className="flex items-center justify-center" />
}
