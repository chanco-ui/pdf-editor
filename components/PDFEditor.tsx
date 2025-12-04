"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import PDFViewer from "./PDFViewer";

interface TextElement {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  width: number;
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
  const [lastSelectedElement, setLastSelectedElement] = useState<string | null>(null);
  const [isTextMode, setIsTextMode] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [scale, setScale] = useState(1.0);
  const [currentPage, setCurrentPage] = useState(1);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [isClick, setIsClick] = useState(true);
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
      // data-element-container がクリックされた場合は何もしない
      const target = event.target as HTMLElement;
      const elementContainer = target.closest('[data-element-container]');
      if (elementContainer) {
        console.log("handlePageClick: element clicked, skipping");
        return;
      }
      
      console.log("handlePageClick called, isTextMode:", isTextMode);

      if (isTextMode && pdfFile && pageContainerRef.current) {
        // テキストモードの場合は新しいテキストを追加
        const rect = pageContainerRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / scale;
        const y = (event.clientY - rect.top) / scale;

        console.log("Adding text at:", x, y);

        const newElement: TextElement = {
          id: `text-${Date.now()}`,
          type: "text",
          text: "テキストを入力",
          x: x,
          y: y,
          fontSize,
          width: 150,
          page: currentPage,
        };

        setElements((prev) => [...prev, newElement]);
        setSelectedElement(newElement.id);
        setLastSelectedElement(newElement.id);
        setIsTextMode(false);
        
        console.log("Text element added:", newElement.id);
      } else {
        // テキストモードでない場合は選択を解除
        console.log("handlePageClick: deselecting");
        setSelectedElement(null);
      }
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
            // 少し遅延させて確実に選択状態を設定
            setTimeout(() => {
              setSelectedElement(newElement.id);
              setLastSelectedElement(newElement.id);
            }, 0);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
        // ファイル入力をリセットして、同じファイルを再度選択できるようにする
        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
      }
    },
    [currentPage]
  );

  const handleElementClick = useCallback(
    (event: React.MouseEvent, elementId: string) => {
      event.stopPropagation();
      event.preventDefault();
      console.log("Element clicked:", elementId);
      setSelectedElement(elementId);
      setLastSelectedElement(elementId);
    },
    []
  );

  const handleElementMouseDown = useCallback(
    (event: React.MouseEvent, elementId: string) => {
      // input要素の場合はドラッグしない
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT") {
        return;
      }
      
      // 左クリックのみ
      if (event.button !== 0) {
        return;
      }
      
      event.stopPropagation();
      
      const element = elements.find((el) => el.id === elementId);
      if (!element || !pageContainerRef.current) return;

      const elementRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const offsetX = event.clientX - elementRect.left;
      const offsetY = event.clientY - elementRect.top;

      setDragStartPos({ x: event.clientX, y: event.clientY });
      setDragging(elementId);
      setDragOffset({ x: offsetX, y: offsetY });
      setIsClick(true);
      
      // 選択状態を即座に設定
      setSelectedElement(elementId);
      setLastSelectedElement(elementId);
    },
    [elements]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragging || !pageContainerRef.current) return;

      // 移動距離を計算
      const moveDistance = Math.sqrt(
        Math.pow(event.clientX - dragStartPos.x, 2) + 
        Math.pow(event.clientY - dragStartPos.y, 2)
      );
      
      // 5px以上移動したらドラッグとして扱う
      if (moveDistance > 5) {
        setIsClick(false);
      }

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
    [dragging, dragOffset, dragStartPos, scale]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      // ドラッグ終了時も選択状態を維持
      setSelectedElement(dragging);
      setLastSelectedElement(dragging);
    }
    setDragging(null);
    setIsClick(true);
  }, [dragging]);

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
    const elementToDelete = selectedElement || lastSelectedElement;
    if (elementToDelete) {
      setElements((prev) => prev.filter((el) => el.id !== elementToDelete));
      setSelectedElement(null);
      setLastSelectedElement(null);
    }
  }, [selectedElement, lastSelectedElement]);

  // DeleteキーとESCキーで削除・選択解除
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESCキーで選択解除
      if (event.key === "Escape") {
        if (document.activeElement?.tagName !== "INPUT") {
          setSelectedElement(null);
        }
        return;
      }
      // Deleteキーで削除
      if (event.key === "Delete" || event.key === "Backspace") {
        if (document.activeElement?.tagName !== "INPUT") {
          const elementToDelete = selectedElement || lastSelectedElement;
          if (elementToDelete) {
            setElements((prev) => prev.filter((el) => el.id !== elementToDelete));
            setSelectedElement(null);
            setLastSelectedElement(null);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElement, lastSelectedElement]);

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

  const handleTextWidthChange = useCallback((id: string, width: number) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id && el.type === "text" ? { ...el, width } : el
      )
    );
  }, []);

  const handleImageSizeChange = useCallback((id: string, width: number, height: number) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id && el.type === "image"
          ? { ...el, width, height }
          : el
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
            color: rgb(0, 0, 0), // 黒色を明示的に指定
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
    <div className="flex flex-col pdf-editor" style={{ height: "100%", overflow: "hidden" }}>
      {/* 上部ツールバー */}
      <div className="bg-white border-b border-gray-300 px-4 py-3 flex flex-wrap items-center justify-center gap-4 flex-shrink-0">
        {/* PDFファイル選択 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[140px] font-medium"
          title="PDFを選択"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-white font-medium">PDFを選択</span>
        </button>

        {/* テキストツール */}
        <button
          onClick={() => setIsTextMode(!isTextMode)}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors min-w-[140px] font-medium ${
            isTextMode
              ? "bg-blue-700 text-white hover:bg-blue-800 ring-2 ring-blue-300"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          title="テキストを追加"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-white font-medium">テキスト</span>
        </button>

        {/* 印鑑ツール */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[140px] font-medium"
          title="印鑑を追加"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-white font-medium">印鑑</span>
        </button>

        <div className="h-6 w-px bg-gray-300"></div>

        <div className="h-6 w-px bg-gray-300"></div>

        {/* ズーム */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
            className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
            title="縮小"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>
          <span className="text-sm text-gray-900 min-w-[60px] text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((prev) => Math.min(2, prev + 0.1))}
            className="px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
            title="拡大"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>
        </div>

        <div className="flex-1"></div>

        {/* 選択中の要素の編集ツール */}
        {selectedElement && (() => {
          const selected = elements.find((el) => el.id === selectedElement);
          if (!selected) return null;

          return (
            <>
              <div className="h-6 w-px bg-gray-300"></div>
              
              {selected.type === "text" && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-900 font-medium">フォント:</label>
                    <input
                      type="number"
                      min="8"
                      max="72"
                      value={selected.fontSize}
                      onChange={(e) =>
                        handleFontSizeChange(selectedElement, Number(e.target.value))
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    />
                    <span className="text-xs text-gray-900">px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-900 font-medium">幅:</label>
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={Math.round(selected.width)}
                      onChange={(e) =>
                        handleTextWidthChange(selectedElement, Number(e.target.value))
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    />
                    <span className="text-xs text-gray-900">px</span>
                  </div>
                </>
              )}

              {selected.type === "image" && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-900 font-medium">幅:</label>
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={Math.round(selected.width)}
                      onChange={(e) =>
                        handleImageSizeChange(
                          selectedElement,
                          Number(e.target.value),
                          selected.height
                        )
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    />
                    <span className="text-xs text-gray-900">px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-900 font-medium">高さ:</label>
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={Math.round(selected.height)}
                      onChange={(e) =>
                        handleImageSizeChange(
                          selectedElement,
                          selected.width,
                          Number(e.target.value)
                        )
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 bg-white"
                    />
                    <span className="text-xs text-gray-900">px</span>
                  </div>
                  <button
                    onClick={() =>
                      handleImageSizeChange(
                        selectedElement,
                        selected.width * 1.1,
                        selected.height * 1.1
                      )
                    }
                    className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                    title="10%拡大"
                  >
                    +
                  </button>
                  <button
                    onClick={() =>
                      handleImageSizeChange(
                        selectedElement,
                        selected.width * 0.9,
                        selected.height * 0.9
                      )
                    }
                    className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                    title="10%縮小"
                  >
                    -
                  </button>
                </>
              )}

              <div className="h-6 w-px bg-gray-300"></div>

              {/* 削除ボタン */}
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium flex items-center gap-2 transition-colors"
                title="削除 (Deleteキー)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="text-white">削除</span>
              </button>
            </>
          );
        })()}

        <div className="h-6 w-px bg-gray-300"></div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={!pdfFile}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px] font-medium"
          title="PDFを保存"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="text-white font-medium">PDFを保存</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0, height: "100%" }}>
        {/* 左側: PDFプレビュー */}
        <div className="flex-1 flex flex-col" style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden"
            style={{ minHeight: 0, height: "100%" }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <PDFViewer
              file={pdfFile}
              scale={scale}
              onPageClick={handlePageClick}
              pageContainerRef={pageContainerRef}
            >
              {/* 要素配置エリア */}
              {currentPageElements.map((element) => (
                <div
                  key={element.id}
                  data-element-container="true"
                  data-element-id={element.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLElement;
                    if (target.tagName === "INPUT") {
                      return;
                    }
                    console.log("Element container clicked:", element.id);
                    handleElementClick(e, element.id);
                  }}
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === "INPUT") {
                      return;
                    }
                    handleElementMouseDown(e, element.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${element.x * scale}px`,
                    top: `${element.y * scale}px`,
                    cursor: dragging === element.id ? "move" : "pointer",
                    border: selectedElement === element.id ? "2px solid #3b82f6" : "2px solid transparent",
                    padding: "2px",
                    zIndex: selectedElement === element.id ? 10 : 2,
                    backgroundColor: selectedElement === element.id ? "rgba(59, 130, 246, 0.05)" : "transparent",
                  }}
                >
                  {element.type === "text" ? (
                    <>
                      <input
                        type="text"
                        value={element.text}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleTextChange(element.id, e.target.value);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSelectedElement(element.id);
                          setLastSelectedElement(element.id);
                          setTimeout(() => {
                            (e.target as HTMLInputElement).focus();
                          }, 0);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement(element.id);
                          setLastSelectedElement(element.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement(element.id);
                          setLastSelectedElement(element.id);
                          setTimeout(() => {
                            (e.target as HTMLInputElement).focus();
                            (e.target as HTMLInputElement).select();
                          }, 0);
                        }}
                        onFocus={(e) => {
                          e.stopPropagation();
                          setSelectedElement(element.id);
                          setLastSelectedElement(element.id);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Escape") {
                            setSelectedElement(null);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        style={{
                          fontSize: `${element.fontSize * scale}px`,
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          width: `${element.width * scale}px`,
                          padding: "2px 4px",
                          borderRadius: "2px",
                          cursor: "text",
                          color: "#000000",
                          WebkitTextFillColor: "#000000",
                          caretColor: "#000000",
                        } as React.CSSProperties}
                        className="text-gray-900"
                        autoFocus={selectedElement === element.id}
                      />
                      {selectedElement === element.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDelete();
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-20"
                          title="削除"
                          style={{ fontSize: "12px" }}
                        >
                          ×
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <img
                        src={element.src}
                        alt="印鑑"
                        style={{
                          width: `${element.width * scale}px`,
                          height: `${element.height * scale}px`,
                          userSelect: "none",
                          pointerEvents: "none",
                          display: "block",
                        }}
                        draggable={false}
                      />
                      {selectedElement === element.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDelete();
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-20"
                          title="削除"
                          style={{ fontSize: "12px" }}
                        >
                          ×
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
}

