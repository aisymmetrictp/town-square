"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileSpreadsheet,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Snapshot {
  snapshotDate: string;
  invoiceCount: number;
}

interface UploadResult {
  rowsInserted: number;
  rowsSkipped: number;
  snapshotDate: string;
  errors: string[];
  validationWarnings: string[];
}

interface AuditEntry {
  id: number;
  uploadedBy: string;
  fileName: string;
  rowsTotal: number;
  rowsInserted: number;
  rowsSkipped: number;
  snapshotDate: string;
  validationWarnings: string[];
  errors: string[];
  createdAt: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [expandedAudit, setExpandedAudit] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSnapshots = useCallback(() => {
    fetch("/api/snapshots")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSnapshots(data);
      });
  }, []);

  const fetchAudits = useCallback(() => {
    fetch("/api/upload-audits")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAudits(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSnapshots();
    fetchAudits();
  }, [fetchSnapshots, fetchAudits]);

  function handleFile(f: File | null) {
    if (!f) return;
    const valid = [".csv", ".xls", ".xlsx"];
    if (!valid.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setMessage("Please upload a .csv, .xls, or .xlsx file.");
      return;
    }
    setFile(f);
    setMessage("");
    setLastResult(null);
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
    setMessage("Uploading and validating...");
    setLastResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 85));
    }, 500);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await res.json();
      if (res.ok) {
        setLastResult(data);
        setMessage(
          `Imported ${data.rowsInserted.toLocaleString()} invoices for snapshot ${data.snapshotDate}.`
        );
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        fetchSnapshots();
        fetchAudits();
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Upload Snapshot</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a new monthly aging report to create a data snapshot. Files are
          validated before import.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Upload + Validation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drop zone */}
          <div className="premium-card p-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-blue-500 bg-blue-50/50"
                  : file
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
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
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <FileSpreadsheet
                      size={22}
                      className="text-emerald-600"
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB — Ready to upload
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <Upload size={22} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600">
                    Drag & drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-slate-400">
                    Accepts .csv, .xls, .xlsx
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {progress > 0 && (
              <div className="mt-4">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{progress}%</p>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-4 flex items-center gap-2 bg-slate-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-slate-800 transition-colors"
            >
              <FileUp size={16} />
              {loading ? "Processing..." : "Upload & Validate"}
            </button>

            {/* Status message */}
            {message && !lastResult && (
              <p
                className={`text-sm mt-3 ${
                  message.startsWith("Error") ||
                  message.startsWith("Upload failed")
                    ? "text-red-600"
                    : message.startsWith("Imported")
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {message}
              </p>
            )}
          </div>

          {/* Validation Report */}
          {lastResult && (
            <div className="premium-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">
                  Validation Report
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Snapshot {lastResult.snapshotDate}
                </p>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-xs text-slate-400">Imported</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-600">
                    {lastResult.rowsInserted.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <XCircle size={14} className="text-rose-500" />
                    <span className="text-xs text-slate-400">Skipped</span>
                  </div>
                  <p className="text-xl font-bold text-rose-600">
                    {lastResult.rowsSkipped}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="text-xs text-slate-400">Warnings</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600">
                    {lastResult.validationWarnings.length}
                  </p>
                </div>
              </div>

              {/* Warnings list */}
              {lastResult.validationWarnings.length > 0 && (
                <div className="p-4">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mb-2">
                    Data Quality Warnings
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {lastResult.validationWarnings.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-600 py-1"
                      >
                        <AlertTriangle
                          size={12}
                          className="text-amber-400 mt-0.5 shrink-0"
                        />
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors list */}
              {lastResult.errors.length > 0 && (
                <div className="p-4 border-t border-slate-100">
                  <p className="text-xs font-medium text-rose-700 uppercase tracking-wider mb-2">
                    Errors
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {lastResult.errors.map((e, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-slate-600 py-1"
                      >
                        <XCircle
                          size={12}
                          className="text-rose-400 mt-0.5 shrink-0"
                        />
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lastResult.validationWarnings.length === 0 &&
                lastResult.errors.length === 0 && (
                  <div className="p-6 text-center">
                    <CheckCircle2
                      size={24}
                      className="text-emerald-500 mx-auto mb-2"
                    />
                    <p className="text-sm text-emerald-700 font-medium">
                      Clean import — no warnings or errors
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Audit Log */}
          {audits.length > 0 && (
            <div className="premium-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">
                  Upload History
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Last {audits.length} uploads
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {audits.map((audit) => (
                  <div key={audit.id}>
                    <div
                      className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedAudit(
                          expandedAudit === audit.id ? null : audit.id
                        )
                      }
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <User size={14} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {audit.fileName}
                          </span>
                          {(audit.validationWarnings?.length > 0 ||
                            audit.errors?.length > 0) && (
                            <AlertTriangle
                              size={12}
                              className="text-amber-400 shrink-0"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{audit.uploadedBy}</span>
                          <span>·</span>
                          <span>{audit.snapshotDate}</span>
                          <span>·</span>
                          <span>
                            {audit.rowsInserted.toLocaleString()} rows
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-slate-300">
                        {expandedAudit === audit.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>
                    {expandedAudit === audit.id && (
                      <div className="px-6 pb-4 pl-18 bg-slate-50/50">
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-slate-400">Total Rows</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {audit.rowsTotal.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Inserted</p>
                            <p className="text-sm font-semibold text-emerald-600">
                              {audit.rowsInserted.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Skipped</p>
                            <p className="text-sm font-semibold text-rose-600">
                              {audit.rowsSkipped}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Warnings</p>
                            <p className="text-sm font-semibold text-amber-600">
                              {audit.validationWarnings?.length ?? 0}
                            </p>
                          </div>
                        </div>
                        {audit.validationWarnings?.length > 0 && (
                          <div className="max-h-32 overflow-y-auto space-y-0.5">
                            {audit.validationWarnings.map((w, i) => (
                              <p key={i} className="text-xs text-slate-500">
                                {w}
                              </p>
                            ))}
                          </div>
                        )}
                        {audit.errors?.length > 0 && (
                          <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                            {audit.errors.map((e, i) => (
                              <p key={i} className="text-xs text-rose-500">
                                {e}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-300 mt-2">
                          {new Date(audit.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Recent Snapshots */}
        <div>
          <div className="premium-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">
                Recent Snapshots
              </h2>
            </div>
            {snapshots.length > 0 ? (
              <div className="space-y-3">
                {snapshots.map((s, i) => (
                  <div
                    key={s.snapshotDate}
                    className={`p-3 rounded-lg border ${
                      i === 0
                        ? "border-blue-200 bg-blue-50/30"
                        : "border-slate-100"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {s.snapshotDate}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {s.invoiceCount.toLocaleString()} invoices
                    </p>
                    {i === 0 && (
                      <span className="inline-block mt-1.5 text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        LATEST
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No snapshots yet</p>
            )}
          </div>

          {/* Data Quality Tips */}
          <div className="premium-card p-6 mt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Validation Checks
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={14}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-slate-500">
                  Amount due vs. gross price consistency
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={14}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-slate-500">
                  Negative days overdue detection
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={14}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-slate-500">
                  Email format validation
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  size={14}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <p className="text-xs text-slate-500">
                  Required field completeness
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
