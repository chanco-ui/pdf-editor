"use client";

// 認証機能は後で実装するため、一時的に無効化
// import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // 認証なしでそのままchildrenを返す
  return <>{children}</>;
  // return <SessionProvider>{children}</SessionProvider>;
}

