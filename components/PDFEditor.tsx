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
  const [resizing, setResizing] = useState<{ elementId: string; handle: string; startX: number; startY: number; startWidth: number; startHeight: number; startElementX: number; startElementY: number; aspectRatio?: number } | null>(null);
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
      const target = event.target as HTMLElement;
      const elementContainer = target.closest('[data-element-container]');
      if (elementContainer) {
        return;
      }

      if (isTextMode && pdfFile && pageContainerRef.current) {
        const rect = pageContainerRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left) / scale;
        const y = (event.clientY - rect.top) / scale;

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
      } else {
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
            setTimeout(() => {
              setSelectedElement(newElement.id);
              setLastSelectedElement(newElement.id);
            }, 0);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
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
      setSelectedElement(elementId);
      setLastSelectedElement(elementId);
    },
    []
  );

  const handleResizeStart = useCallback(
    (event: React.MouseEvent, elementId: string, handle: string) => {
      event.stopPropagation();
      event.preventDefault();
      
      const element = elements.find((el) => el.id === elementId);
      if (!element || !pageContainerRef.current) return;

      const startWidth = element.width;
      const startHeight = element.type === "image" ? element.height : element.fontSize;
      const aspectRatio = element.type === "image" ? startWidth / startHeight : undefined;

      setResizing({
        elementId,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startWidth,
        startHeight,
        startElementX: element.x,
        startElementY: element.y,
        aspectRatio,
      });
    },
    [elements]
  );

  const handleElementMouseDown = useCallback(
    (event: React.MouseEvent, elementId: string) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.classList.contains("resize-handle")) {
        return;
      }
      
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
      
      setSelectedElement(elementId);
      setLastSelectedElement(elementId);
    },
    [elements]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (resizing && pageContainerRef.current) {
        const element = elements.find((el) => el.id === resizing.elementId);
        if (!element) return;

        const deltaX = (event.clientX - resizing.startX) / scale;
        const deltaY = (event.clientY - resizing.startY) / scale;

        let newWidth = resizing.startWidth;
        let newHeight = resizing.startHeight;
        let newX = resizing.startElementX;
        let newY = resizing.startElementY;

        const minSize = element.type === "image" ? 20 : 8; // 画像は20px、テキストは8px（フォントサイズ）

        if (element.type === "image" && resizing.aspectRatio) {
          // 画像要素の場合、アスペクト比を保持
          const isCorner = (resizing.handle.includes("top") || resizing.handle.includes("bottom")) && 
                          (resizing.handle.includes("left") || resizing.handle.includes("right"));
          
          if (isCorner) {
            // 四隅のリサイズ: マウスの移動距離の大きい方を使用してアスペクト比を保持
            // 各コーナーでの拡大方向を判定
            let scaleDelta = 0;
            if (resizing.handle === "bottom-right") {
              // 右下: 右または下にドラッグで拡大
              scaleDelta = Math.max(deltaX, deltaY);
            } else if (resizing.handle === "bottom-left") {
              // 左下: 左または下にドラッグで拡大
              scaleDelta = Math.max(-deltaX, deltaY);
            } else if (resizing.handle === "top-right") {
              // 右上: 右または上にドラッグで拡大
              scaleDelta = Math.max(deltaX, -deltaY);
            } else if (resizing.handle === "top-left") {
              // 左上: 左または上にドラッグで拡大
              scaleDelta = Math.max(-deltaX, -deltaY);
            }
            
            newWidth = Math.max(minSize, resizing.startWidth + scaleDelta);
            newHeight = newWidth / resizing.aspectRatio;
            
            // 位置を調整
            if (resizing.handle.includes("left")) {
              newX = resizing.startElementX + (resizing.startWidth - newWidth);
            }
            if (resizing.handle.includes("top")) {
              newY = resizing.startElementY + (resizing.startHeight - newHeight);
            }
          } else {
            // 上下左右のリサイズ: アスペクト比を保持
            if (resizing.handle.includes("right") || resizing.handle.includes("left")) {
              newWidth = Math.max(minSize, resizing.startWidth + (resizing.handle.includes("right") ? deltaX : -deltaX));
              newHeight = newWidth / resizing.aspectRatio;
              if (resizing.handle.includes("left")) {
                newX = resizing.startElementX + (resizing.startWidth - newWidth);
              }
            } else if (resizing.handle.includes("top") || resizing.handle.includes("bottom")) {
              newHeight = Math.max(minSize, resizing.startHeight + (resizing.handle.includes("bottom") ? deltaY : -deltaY));
              newWidth = newHeight * resizing.aspectRatio;
              if (resizing.handle.includes("top")) {
                newY = resizing.startElementY + (resizing.startHeight - newHeight);
              }
            }
          }
        } else {
          // テキスト要素の場合、従来通り
          if (resizing.handle.includes("right")) {
            newWidth = Math.max(minSize, resizing.startWidth + deltaX);
          }
          if (resizing.handle.includes("left")) {
            newWidth = Math.max(minSize, resizing.startWidth - deltaX);
            newX = resizing.startElementX + (resizing.startWidth - newWidth);
          }
          if (resizing.handle.includes("bottom")) {
            newHeight = Math.max(minSize, resizing.startHeight + deltaY);
          }
          if (resizing.handle.includes("top")) {
            newHeight = Math.max(minSize, resizing.startHeight - deltaY);
            newY = resizing.startElementY + (resizing.startHeight - newHeight);
          }
        }

        setElements((prev) =>
          prev.map((el) => {
            if (el.id === resizing.elementId) {
              if (el.type === "text") {
                // テキスト要素は幅とフォントサイズ（高さ）を変更
                return { 
                  ...el, 
                  width: newWidth, 
                  fontSize: newHeight, // フォントサイズとして使用
                  x: newX,
                  y: newY 
                };
              } else if (el.type === "image") {
                return { ...el, width: newWidth, height: newHeight, x: newX, y: newY };
              }
            }
            return el;
          })
        );
        return;
      }

      if (!dragging || !pageContainerRef.current) return;

      const moveDistance = Math.sqrt(
        Math.pow(event.clientX - dragStartPos.x, 2) + 
        Math.pow(event.clientY - dragStartPos.y, 2)
      );
      
      if (moveDistance > 5) {
        setIsClick(false);
      }

      const pageRect = pageContainerRef.current.getBoundingClientRect();
      const x = (event.clientX - pageRect.left - dragOffset.x) / scale;
      const y = (event.clientY - pageRect.top - dragOffset.y) / scale;

      setElements((prev) =>
        prev.map((el) =>
          el.id === dragging ? { ...el, x: Math.max(0, x), y: Math.max(0, y) } : el
        )
      );
    },
    [dragging, dragOffset, dragStartPos, scale, resizing, elements]
  );

  const handleMouseUp = useCallback(() => {
    if (resizing) {
      setResizing(null);
    }
    if (dragging) {
      const elementId = dragging;
      setSelectedElement(elementId);
      setLastSelectedElement(elementId);
    }
    setDragging(null);
    setIsClick(true);
  }, [dragging, resizing]);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  const handleDelete = useCallback(() => {
    const elementToDelete = selectedElement || lastSelectedElement;
    if (elementToDelete) {
      setElements((prev) => prev.filter((el) => el.id !== elementToDelete));
      setSelectedElement(null);
      setLastSelectedElement(null);
    }
  }, [selectedElement, lastSelectedElement]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.activeElement?.tagName !== "INPUT") {
          setSelectedElement(null);
        }
        return;
      }
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
    if (!pdfFile) {
      alert("PDFファイルが選択されていません");
      return;
    }

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // fontkitを動的インポート（ブラウザ環境で動作するように）
      try {
        const fontkitModule = await import("@pdf-lib/fontkit");
        // fontkitの正しいインポート方法
        const fontkit = fontkitModule.default;
        if (!fontkit || typeof fontkit !== 'object') {
          throw new Error("fontkitの読み込みに失敗しました");
        }
        pdfDoc.registerFontkit(fontkit);
      } catch (fontkitError) {
        console.error("fontkitの読み込みに失敗:", fontkitError);
        throw new Error(`フォント処理ライブラリの読み込みに失敗しました: ${fontkitError instanceof Error ? fontkitError.message : String(fontkitError)}`);
      }
      
      const pages = pdfDoc.getPages();

      let japaneseFont = null;
      const hasJapaneseText = elements.some(
        (el) => el.type === "text" && /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(el.text)
      );
      
      if (hasJapaneseText) {
        // まずローカルファイルから読み込み、失敗した場合はCDNから読み込む
        // TTF形式のみを使用（pdf-libはWOFF2をサポートしていない）
        const fontUrls = [
          // ローカルファイル（最も確実）
          "/fonts/NotoSansJP-Regular.ttf",
          // jsDelivr CDN（バックアップ）
          "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Regular.ttf",
          // GitHub Raw（バックアップ）
          "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Regular.ttf",
          // Google Fonts CDN（バックアップ）
          "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf",
        ];
        
        let fontLoaded = false;
        const timeout = 10000; // 10秒のタイムアウト（長めに設定）
        let lastError: Error | null = null;
        
        for (const fontUrl of fontUrls) {
          try {
            console.log(`フォントの読み込みを試行中: ${fontUrl}`);
            // タイムアウト付きでfetch
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(fontUrl, {
              mode: fontUrl.startsWith('/') ? 'same-origin' : 'cors', // ローカルファイルはsame-origin
              cache: 'default', // キャッシュを有効化
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              console.warn(`フォントURL ${fontUrl} のダウンロードに失敗: ${response.status} ${response.statusText}`);
              lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
              continue;
            }
            const fontBytes = await response.arrayBuffer();
            if (fontBytes.byteLength === 0) {
              console.warn(`フォントURL ${fontUrl} のファイルが空です`);
              lastError = new Error("フォントファイルが空です");
              continue;
            }
            console.log(`フォントファイルのサイズ: ${fontBytes.byteLength} bytes`);
            
            japaneseFont = await pdfDoc.embedFont(fontBytes, { subset: true });
            console.log(`日本語フォントの読み込みに成功しました: ${fontUrl}`);
            fontLoaded = true;
            break;
          } catch (fontError) {
            if (fontError instanceof Error && fontError.name === 'AbortError') {
              console.warn(`フォントURL ${fontUrl} の読み込みがタイムアウトしました`);
              lastError = new Error("タイムアウト");
            } else {
              console.warn(`フォントURL ${fontUrl} の読み込みエラー:`, fontError);
              lastError = fontError instanceof Error ? fontError : new Error(String(fontError));
            }
            continue;
          }
        }
        
        if (!fontLoaded) {
          console.error("すべてのフォントソースからの読み込みに失敗しました", lastError);
          const errorMessage = lastError ? `\n\nエラー詳細: ${lastError.message}` : '';
          alert(`日本語フォントの読み込みに失敗しました。日本語テキストを保存するにはフォントが必要です。${errorMessage}\n\nネットワーク接続を確認するか、ページをリロードして再度お試しください。`);
          return; // 保存処理を中止
        }
      }

      for (const element of elements) {
        const page = pages[element.page - 1];
        if (!page) continue;

        if (element.type === "text") {
          const containsJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff00-\uffef]/.test(element.text);
          
          try {
            page.drawText(element.text, {
              x: element.x,
              y: page.getHeight() - element.y - element.fontSize,
              size: element.fontSize,
              color: rgb(0, 0, 0),
              font: containsJapanese && japaneseFont ? japaneseFont : undefined,
              maxWidth: element.width, // テキストの幅を指定
            });
          } catch (textError) {
            console.error(`テキスト "${element.text}" の描画に失敗:`, textError);
            throw new Error(`テキスト "${element.text}" の保存に失敗しました: ${textError instanceof Error ? textError.message : String(textError)}`);
          }
        } else if (element.type === "image") {
          const imageBytes = await fetch(element.src).then((res) => res.arrayBuffer());
          const isPng = element.src.startsWith("data:image/png");
          const isJpeg = element.src.startsWith("data:image/jpeg") || element.src.startsWith("data:image/jpg");
          
          let image;
          if (isPng) {
            image = await pdfDoc.embedPng(imageBytes);
          } else if (isJpeg) {
            image = await pdfDoc.embedJpg(imageBytes);
          } else {
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
      alert("PDFを保存しました");
    } catch (error) {
      console.error("PDF保存エラー:", error);
      alert(`PDFの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [pdfFile, elements]);

  const currentPageElements = elements.filter((el) => el.page === currentPage);
  return (
    <div className="flex flex-col pdf-editor" style={{ height: "100%", overflow: "hidden" }}>
      {/* 上部ツールバー */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 shadow-sm overflow-x-auto flex-shrink-0">

        {/*<h1 className="text-white text-2xl">TEST - 新しいコードです</h1>*/}

        <div className="flex items-center gap-2 min-w-max">
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
            className="group flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all duration-200 font-medium whitespace-nowrap"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>PDF選択</span>
          </button>

          <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>

          {/* テキストツール */}
          <button
            onClick={() => setIsTextMode(!isTextMode)}
            className={`group flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
              isTextMode
                ? "bg-indigo-50 border-2 border-indigo-200 text-indigo-700 shadow-md"
                : "bg-white border-2 border-slate-300 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md"
            }`}
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>テキスト</span>
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
            className="group flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 rounded-lg hover:border-indigo-500 hover:text-indigo-600 hover:shadow-md transition-all duration-200 font-medium whitespace-nowrap"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>印鑑</span>
          </button>

          <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>

          {/* ズーム */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 whitespace-nowrap">
            <button
              onClick={() => setScale((prev) => Math.max(0.5, prev - 0.1))}
              className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[50px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((prev) => Math.min(2, prev + 0.1))}
              className="p-1.5 hover:bg-white rounded transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </button>
          </div>

          {/* 選択中の要素の編集ツール */}
          {selectedElement && (() => {
            const selected = elements.find((el) => el.id === selectedElement);
            if (!selected) return null;

            return (
              <>
                <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>
                
                {selected.type === "text" && (
                  <>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <label className="text-xs text-slate-700 font-medium">フォント:</label>
                      <input
                        type="number"
                        min="8"
                        max="72"
                        value={selected.fontSize}
                        onChange={(e) => handleFontSizeChange(selectedElement, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600">px</span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <label className="text-xs text-slate-700 font-medium">幅:</label>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        value={Math.round(selected.width)}
                        onChange={(e) => handleTextWidthChange(selectedElement, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600">px</span>
                    </div>
                  </>
                )}

                {selected.type === "image" && (
                  <>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <label className="text-xs text-slate-700 font-medium">幅:</label>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        value={Math.round(selected.width)}
                        onChange={(e) => handleImageSizeChange(selectedElement, Number(e.target.value), selected.height)}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600">px</span>
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <label className="text-xs text-slate-700 font-medium">高さ:</label>
                      <input
                        type="number"
                        min="50"
                        max="500"
                        value={Math.round(selected.height)}
                        onChange={(e) => handleImageSizeChange(selectedElement, selected.width, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                      />
                      <span className="text-xs text-slate-600">px</span>
                    </div>
                  </>
                )}

                <div className="w-px h-8 bg-slate-200 flex-shrink-0"></div>

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-200 text-red-700 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all duration-200 font-medium whitespace-nowrap"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>削除</span>
                </button>
              </>
            );
          })()}

          <div className="flex-1"></div>

          <button
            onClick={handleSave}
            disabled={!pdfFile}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 font-medium whitespace-nowrap"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>PDFを保存</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-slate-50" style={{ minHeight: 0, height: "100%" }}>
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
              onFileSelect={() => fileInputRef.current?.click()}
              onPageChange={setCurrentPage}
            >
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
                    border: selectedElement === element.id ? "2px solid #4F46E5" : "2px solid transparent",
                    padding: "2px",
                    zIndex: selectedElement === element.id ? 10 : 2,
                    backgroundColor: selectedElement === element.id ? "rgba(79, 70, 229, 0.05)" : "transparent",
                    borderRadius: "4px",
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
                        <>
                          {/* リサイズハンドル - 四隅（テキストは幅とフォントサイズを変更可能） */}
                          <div
                            className="resize-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "top-left")}
                          />
                          <div
                            className="resize-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "top-right")}
                          />
                          <div
                            className="resize-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "bottom-left")}
                          />
                          <div
                            className="resize-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "bottom-right")}
                          />
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
                        </>
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
                        <>
                          {/* リサイズハンドル - 四隅 */}
                          <div
                            className="resize-handle absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "top-left")}
                          />
                          <div
                            className="resize-handle absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "top-right")}
                          />
                          <div
                            className="resize-handle absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nesw-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "bottom-left")}
                          />
                          <div
                            className="resize-handle absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full cursor-nwse-resize z-30"
                            onMouseDown={(e) => handleResizeStart(e, element.id, "bottom-right")}
                          />
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
                        </>
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

