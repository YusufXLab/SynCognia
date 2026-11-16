"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, Camera, FileText, AlertCircle, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { ExtractedReceiptData, ReceiptUploadResult, IngestExtractApiResponse } from "@/lib/types/receipt";

interface ReceiptDropzoneProps {
  onExtractionComplete: (file: ReceiptUploadResult, extracted: ExtractedReceiptData) => void;
  className?: string;
}

export function ReceiptDropzone({ onExtractionComplete, className = "" }: ReceiptDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    // 1. Validation
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    const isAllowed = allowedTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|webp|heic|pdf)$/i);

    if (!isAllowed) {
      setErrorMessage("Please upload an image (JPEG, PNG, WebP) or PDF receipt.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Receipt file size exceeds the 10MB limit.");
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadStep("Uploading receipt to secure vault...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Status progression simulation for pleasant UX
      const statusTimer = setTimeout(() => {
        setUploadStep("Gemini 2.5 Flash parsing multi-modal image...");
      }, 1200);

      const statusTimer2 = setTimeout(() => {
        setUploadStep("Extracting items, warranty, and return policies...");
      }, 2500);

      const response = await fetch("/api/ingest/extract", {
        method: "POST",
        body: formData,
      });

      clearTimeout(statusTimer);
      clearTimeout(statusTimer2);

      const data: IngestExtractApiResponse = await response.json();

      if (!response.ok || !data.success || !data.file || !data.extracted) {
        throw new Error(data.error || "Failed to extract receipt data.");
      }

      setUploadStep("Extraction complete!");
      setTimeout(() => {
        onExtractionComplete(data.file!, data.extracted!);
        setIsUploading(false);
      }, 400);
    } catch (err) {
      console.error("Receipt upload error:", err);
      setErrorMessage((err as Error).message || "An error occurred during extraction.");
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 md:p-12 transition-all cursor-pointer ${
          isDragging
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 scale-[1.01]"
            : "border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/20 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-600"
        } ${isUploading ? "pointer-events-none opacity-90" : ""}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              AI Ingestion in Progress
            </h3>
            <p className="mt-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
              {uploadStep}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Powered by Google Gemini 2.5 Flash structured multi-modal extraction.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100/80 text-indigo-600 shadow-sm transition-transform group-hover:scale-105 dark:bg-indigo-950/60 dark:text-indigo-400">
              <UploadCloud className="h-8 w-8" />
            </div>

            <div className="mt-4">
              <span className="text-base font-semibold text-slate-900 dark:text-white">
                Drag and drop your receipt here, or{" "}
                <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400 underline-offset-2">
                  browse files
                </span>
              </span>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Supports JPEG, PNG, WebP, HEIC, and PDF (up to 10MB)
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <FileText className="h-4 w-4" />
                Select File
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition"
              >
                <Camera className="h-4 w-4 text-slate-500" />
                Capture with Camera
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>Auto-detects items, warranty periods, and return windows</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Extraction Failed</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
