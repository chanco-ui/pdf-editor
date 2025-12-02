"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import PDFViewer from "./PDFViewer";

interface TextElement {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  page: number;
}

interface ImageElement {
  id: string;
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

type Element = TextElement | ImageElement;

export default function PDFEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
        setElements([]);
        setSelectedElement(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
        setElements([]);
        setSelectedElement(null);
      }
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handlePageClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isTextMode || !pdfFile) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newElement: TextElement = {
        id: `text-${Date.now()}`,
        type: "text",
        text: "テキストを入力",
        x: x / scale,
        y: y / scale,
        fontSize,
        page: currentPage,
      };

      setElements((prev) => [...prev, newElement]);
      setSelectedElement(newElement.id);
      setIsTextMode(false);
    },
    [isTextMode, pdfFile, scale, fontSize, currentPage]
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const newElement: ImageElement = {
              id: `image-${Date.now()}`,
              type: "image",
              src: e.target?.result as string,
              x: 100,
              y: 100,
              width: Math.min(img.width, 200),
              height: Math.min(img.height, 200),
              page: currentPage,
            };
            setElements((prev) => [...prev, newElement]);
            setSelectedElement(newElement.id);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    },
    [currentPage]
  );

  const handleElementClick = useCallback(
    (event: React.MouseEvent, elementId: string) => {
      event.stopPropagation();
      setSelectedElement(elementId);
    },
    []
  );

  const handleElementMouseDown = useCallback(
    (event: React.MouseEvent, elementId: string) => {
      // input要素の場合はドラッグしない
      if ((event.target as HTMLElement).tagName === "INPUT") {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const element = elements.find((el) => el.id === elementId);
      if (!element || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const elementRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      
      // マウス位置と要素位置のオフセットを計算
      const offsetX = event.clientX - elementRect.left;
      const offsetY = event.clientY - elementRect.top;

      setDragging(elementId);
      setDragOffset({ x: offsetX, y: offsetY });
      setSelectedElement(elementId);
    },
    [elements]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragging || !pageContainerRef.current) return;

      const pageRect = pageContainerRef.current.getBoundingClientRect();
      
      // PDFページ内の相対位置を計算
      const x = (event.clientX - pageRect.left - dragOffset.x) / scale;
      const y = (event.clientY - pageRect.top - dragOffset.y) / scale;

      setElements((prev) =>
        prev.map((el) =>
          el.id === dragging ? { ...el, x: Math.max(0, x), y: Math.max(0, y) } : el
        )
      );
    },
    [dragging, dragOffset, scale]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleDelete = useCallback(() => {
    if (selectedElement) {
      setElements((prev) => prev.filter((el) => el.id !== selectedElement));
      setSelectedElement(null);
    }
  }, [selectedElement]);

  const handleTextChange = useCallback(
    (id: string, text: string) => {
      setElements((prev) =>
        prev.map((el) => (el.id === id && el.type === "text" ? { ...el, text } : el))
      );
    },
    []
  );

  const handleFontSizeChange = useCallback((id: string, size: number) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id && el.type === "text" ? { ...el, fontSize: size } : el
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!pdfFile) return;

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      for (const element of elements) {
        const page = pages[element.page - 1];
        if (!page) continue;

        if (element.type === "text") {
          page.drawText(element.text, {
            x: element.x,
            y: page.getHeight() - element.y,
            size: element.fontSize,
          });
        } else if (element.type === "image") {
          const imageBytes = await fetch(element.src).then((res) =>
            res.arrayBuffer()
          );
          // 画像形式を判定（data URLから）
          const isPng = element.src.startsWith("data:image/png");
          const isJpeg = element.src.startsWith("data:image/jpeg") || 
                         element.src.startsWith("data:image/jpg");
          
          let image;
          if (isPng) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (isJpeg) {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
            // デフォルトはPNGとして処理
            image = await pdfDoc.embedPng(imageBytes);
          }
          
          page.drawImage(image, {
            x: element.x,
            y: page.getHeight() - element.y - element.height,
            width: element.width,
            height: element.height,
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited-${pdfFile.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF保存エラー:", error);
      alert("PDFの保存に失敗しました");
    }
  }, [pdfFile, elements]);

  const currentPageElements = elements.filter((el) => el.page === currentPage);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* 左側: PDFプレビュー */}
        <div className="flex-1 flex flex-col border-r border-gray-300">
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <PDFViewer
              file={pdfFile}
              scale={scale}
              onPageClick={handlePageClick}
              pageContainerRef={pageContainerRef}
            >
              {currentPageElements.map((element) => (
                <div
                  key={element.id}
                  onClick={(e) => handleElementClick(e, element.id)}
                  onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                  style={{
                    position: "absolute",
                    left: `${element.x * scale}px`,
                    top: `${element.y * scale}px`,
                    cursor: "move",
                    border:
                      selectedElement === element.id
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                    padding: "2px",
                  }}
                >
                  {element.type === "text" ? (
                    <input
                      type="text"
                      value={element.text}
                      onChange={(e) => handleTextChange(element.id, e.target.value)}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedElement(element.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement(element.id);
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        setSelectedElement(element.id);
                      }}
                      style={{
                        fontSize: `${element.fontSize * scale}px`,
                        border: "none",
                        outline: "none",
                        background: "rgba(255, 255, 255, 0.8)",
                        minWidth: "100px",
                        padding: "2px 4px",
                        borderRadius: "2px",
                      }}
                      autoFocus={selectedElement === element.id}
                    />
                  ) : (
                    <img
                      src={element.src}
                      alt="印鑑"
                      style={{
                        width: `${element.width * scale}px`,
                        height: `${element.height * scale}px`,
                      }}
                    />
                  )}
                </div>
              ))}
            </PDFViewer>
          </div>
        </div>

        {/* 右側: ツールパネル */}
        <div className="w-80 bg-white border-l border-gray-300 p-4 flex flex-col">
          <h2 className="text-lg font-bold mb-4">ツール</h2>

          <div className="space-y-4 flex-1">
            {/* ファイルアップロード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PDFファイル
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                PDFを選択
              </button>
            </div>

            {/* テキスト入力モード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                テキスト入力
              </label>
              <button
                onClick={() => setIsTextMode(!isTextMode)}
                className={`w-full px-4 py-2 rounded ${
                  isTextMode
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isTextMode ? "テキストモード ON" : "テキストモード OFF"}
              </button>
              {isTextMode && (
                <p className="mt-2 text-xs text-gray-500">
                  PDF上をクリックしてテキストを追加
                </p>
              )}
            </div>

            {/* フォントサイズ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                フォントサイズ: {fontSize}px
              </label>
              <input
                type="range"
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
              {selectedElement && (
                <button
                  onClick={() =>
                    handleFontSizeChange(selectedElement, fontSize)
                  }
                  className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                >
                  選択中のテキストに適用
                </button>
              )}
            </div>

            {/* 印鑑画像アップロード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                電子印鑑
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => imageInputRef.current?.click()}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                印鑑画像を追加
              </button>
            </div>

            {/* 削除ボタン */}
            {selectedElement && (
              <div>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  選択中の要素を削除
                </button>
              </div>
            )}

            {/* ズーム */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ズーム: {Math.round(scale * 100)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="mt-auto pt-4 border-t border-gray-300">
            <button
              onClick={handleSave}
              disabled={!pdfFile}
              className="w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              PDFを保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

