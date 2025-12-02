"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { useState, useCallback, useEffect } from "react";

// PDF.js workerの設定（useEffect内で設定）
useEffect(() => {
  // ローカルのworkerファイルを使用
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;
}, []);

interface PDFViewerProps {
  file: File | null;
  scale?: number;
  onPageClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

export default function PDFViewer({
  file,
  scale = 1.0,
  onPageClick,
  children,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

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
    setError(`PDFの読み込みに失敗しました: ${error.message}`);
    setLoading(false);
  }, []);

  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            PDFファイルをドラッグ&ドロップ
          </p>
          <p className="text-xs text-gray-500">またはクリックして選択</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            次へ
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          <div
            className="relative"
            onClick={onPageClick}
            style={{ position: "relative" }}
          >
            {error ? (
              <div className="flex flex-col items-center justify-center h-96 p-4">
                <p className="text-red-600 font-medium mb-2">エラー</p>
                <p className="text-sm text-gray-600 text-center">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setFileUrl(url);
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                    <p className="text-gray-600">読み込み中...</p>
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
                <p className="text-gray-600">ファイルを準備中...</p>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

