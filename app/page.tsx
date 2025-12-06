"use client";

import PDFEditor from "@/components/PDFEditor";

export default function HomePage() {
  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {/* ロゴアイコン */}
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-slate-900 leading-tight">PDF編集ツール</h1>
              <p className="text-xs text-slate-500 leading-tight">テキスト・印鑑の挿入が簡単に</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
              ゲストモード
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-hidden bg-slate-50">
        <PDFEditor />
      </main>
    </div>
  );
}

