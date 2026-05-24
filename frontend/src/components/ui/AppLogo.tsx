"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GraduationCap } from "lucide-react";

type AppLogoProps = {
  href?: string;
  showText?: boolean;
  size?: number;
  textSize?: number;
  className?: string;
};

export default function AppLogo({
  href = "/",
  showText = true,
  size = 34,
  textSize = 24,
  className,
}: AppLogoProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Link href={href} className={className} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          overflow: "hidden",
          background: "linear-gradient(135deg, #e8632a 0%, #f2845a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {logoFailed ? (
          <GraduationCap size={Math.max(16, Math.floor(size * 0.55))} color="#fff" />
        ) : (
          <Image
            src="/favicon.png"
            alt="VedaAI logo"
            width={size}
            height={size}
            onError={() => setLogoFailed(true)}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            priority
          />
        )}
      </div>
      {showText && (
        <span
          style={{
            color: "#000000",
            fontFamily: "var(--font-body)",
            fontSize: textSize,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          VedaAI
        </span>
      )}
    </Link>
  );
}