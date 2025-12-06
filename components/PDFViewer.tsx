"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { useState, useCallback, useEffect } from "react";

interface PDFViewerProps {
  file: File | null;
  scale?: number;
  onPageClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  pageContainerRef?: React.RefObject<HTMLDivElement | null>;
  onFileSelect?: () => void;
}

export default function PDFViewer({
  file,
  scale = 1.0,
  onPageClick,
  children,
  pageContainerRef,
  onFileSelect,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // PDF.js workerの設定
  useEffect(() => {
    // CDNから正しいバージョン（4.8.69）のworkerを読み込む
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;
    }
  }, []);

  // FileオブジェクトをURLに変換
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setError(null);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setFileUrl(null);
    }
  }, [file]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setPageNumber(1);
      setLoading(false);
      setError(null);
    },
    []
  );

  const onDocumentLoadStart = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("PDF読み込みエラー:", error);
    console.error("エラー詳細:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    setError(`PDFの読み込みに失敗しました: ${error.message || '不明なエラー'}`);
    setLoading(false);
  }, []);

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">PDFファイルを選択</h3>
            <p className="text-sm text-slate-500 mb-4">ドラッグ&ドロップ または ボタンからファイルを選択</p>
            {onFileSelect && (
              <button
                onClick={onFileSelect}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                PDFファイルを選択
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ height: "100%", overflow: "hidden" }}>
      <div className="flex items-center justify-between mb-4 px-4 flex-shrink-0" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="px-3 py-2 bg-slate-100 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors font-medium"
          >
            前へ
          </button>
          <span className="text-sm text-slate-900 font-medium">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            className="px-3 py-2 bg-slate-100 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors font-medium"
          >
            次へ
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-100 p-6" style={{ minHeight: 0, flex: "1 1 auto", overflowY: "auto", overflowX: "hidden" }}>
        <div className="flex justify-center" style={{ minHeight: "100%" }}>
          <div
            ref={pageContainerRef}
            className="relative"
            onClick={onPageClick}
            style={{ position: "relative" }}
          >
            {error ? (
              <div className="flex flex-col items-center justify-center h-96 p-4">
                <p className="text-red-600 font-medium mb-2">エラー</p>
                <p className="text-sm text-gray-700 text-center">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setFileUrl(url);
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                >
                  再試行
                </button>
              </div>
            ) : fileUrl ? (
              <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadStart={onDocumentLoadStart}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center justify-center h-96">
                    <p className="text-gray-900">読み込み中...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-gray-900">ファイルを準備中...</p>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

