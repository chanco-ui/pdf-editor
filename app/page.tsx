"use client";

// 認証機能は後で実装するため、一時的に無効化
// import { useSession, signOut } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { useEffect } from "react";
import PDFEditor from "@/components/PDFEditor";

export default function HomePage() {
  // 認証チェックを一時的に無効化
  // const { data: session, status } = useSession();
  // const router = useRouter();

  // useEffect(() => {
  //   if (status === "unauthenticated") {
  //     router.push("/login");
  //   }
  // }, [status, router]);

  // if (status === "loading") {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <p className="text-gray-600">読み込み中...</p>
  //     </div>
  //   );
  // }

  // if (!session) {
  //   return null;
  // }

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-300 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-black">PDF編集ツール</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-black">（認証機能は後で実装予定）</span>
          {/* <span className="text-sm text-gray-600">{session.user?.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ログアウト
          </button> */}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden">
        <PDFEditor />
      </main>
    </div>
  );
}

