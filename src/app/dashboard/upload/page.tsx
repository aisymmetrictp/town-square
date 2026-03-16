"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Snapshot {
  snapshotDate: string;
  invoiceCount: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSnapshots = useCallback(() => {
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSnapshots(data);
      });
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  function handleFile(f: File | null) {
    if (!f) return;
    const valid = [".csv", ".xls", ".xlsx"];
    if (!valid.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setMessage("Please upload a .csv, .xls, or .xlsx file.");
      return;
    }
    setFile(f);
    setMessage("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f ?? null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    setProgress(10);
    setMessage("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    // Simulate progress steps while waiting for response
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 500);

    try {
      const res = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();
      if (res.ok) {
        setMessage(
          `Successfully imported ${data.count.toLocaleString()} invoices for snapshot ${data.snapshotDate}.`
        );
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        fetchSnapshots();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      clearInterval(progressInterval);
      setMessage("Upload failed. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Upload Snapshot</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a new monthly aging report (.csv or .xls) to create a new
        snapshot.
      </p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`max-w-lg border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : file
              ? "border-green-400 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file ? (
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-sm">
              Drag & drop your file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Accepts .csv, .xls, .xlsx
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="max-w-lg mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress}%</p>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="mt-4 bg-black text-white rounded px-5 py-2 text-sm disabled:opacity-50 hover:bg-gray-800 transition-colors"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {/* Status message */}
      {message && (
        <p
          className={`text-sm mt-3 ${
            message.startsWith("Error") || message.startsWith("Upload failed")
              ? "text-red-600"
              : message.startsWith("Successfully")
                ? "text-green-600"
                : "text-gray-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* Recent snapshots */}
      {snapshots.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-3">Recent Snapshots</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
            {snapshots.map((s) => (
              <div key={s.snapshotDate} className="rounded border p-3">
                <p className="text-sm font-medium">{s.snapshotDate}</p>
                <p className="text-xs text-gray-500">
                  {s.invoiceCount.toLocaleString()} invoices
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
