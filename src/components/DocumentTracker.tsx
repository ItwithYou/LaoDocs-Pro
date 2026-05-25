import React, { useState } from "react";
import { LaoLetterDocument, DocumentStatus } from "../types";
import { db, handleFirestoreError, OperationType, safeDeleteDoc, safeUpdateDoc } from "../firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Search, FileText, Calendar, ArrowRight, Trash2, Edit3, HelpCircle, Eye, RefreshCw, CheckCircle2 } from "lucide-react";

interface DocumentTrackerProps {
  documents: LaoLetterDocument[];
  onSelectDocument: (doc: LaoLetterDocument) => void;
  selectedDocId: string | null;
  onRefresh: () => void;
}

export default function DocumentTracker({ documents, onSelectDocument, selectedDocId, onRefresh }: DocumentTrackerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Status/Stage edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFlowStatus, setEditFlowStatus] = useState("");
  const [editStatus, setEditStatus] = useState<DocumentStatus>("saved");

  // Inline Title Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const handleSaveRename = async (docId: string) => {
    if (!renameTitle.trim()) return;
    try {
      const docRef = doc(db, "documents", docId);
      await safeUpdateDoc(docRef, {
        title: renameTitle.trim(),
        updatedAt: serverTimestamp(),
      });
      setRenamingId(null);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${docId}`);
    }
  };

  const handleDeleteRequest = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(docId);
  };

  const handleConfirmDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeletingId(docId);
    try {
      await safeDeleteDoc(doc(db, "documents", docId));
      setIsDeletingId(null);
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err) {
      setIsDeletingId(null);
      setDeleteConfirmId(null);
      handleFirestoreError(err, OperationType.DELETE, `documents/${docId}`);
    }
  };

  const startQuickEdit = (docItem: LaoLetterDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(docItem.documentId);
    setEditFlowStatus(docItem.flowStatus || "Draft");
    setEditStatus(docItem.status);
  };

  const handleSaveQuickEdit = async (docId: string, e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = doc(db, "documents", docId);
      await safeUpdateDoc(docRef, {
        status: editStatus,
        flowStatus: editFlowStatus,
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `documents/${docId}`);
    }
  };

  const filteredDocs = documents.filter((docItem) => {
    const term = searchTerm.toLowerCase();
    return (
      docItem.title.toLowerCase().includes(term) ||
      (docItem.sender && docItem.sender.toLowerCase().includes(term)) ||
      (docItem.receiver && docItem.receiver.toLowerCase().includes(term)) ||
      (docItem.referenceNo && docItem.referenceNo.toLowerCase().includes(term)) ||
      (docItem.convertedText && docItem.convertedText.toLowerCase().includes(term)) ||
      (docItem.originalText && docItem.originalText.toLowerCase().includes(term)) ||
      (docItem.summary && docItem.summary.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "final":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "saved":
        return "bg-indigo-50 text-indigo-800 border-indigo-300";
      default:
        return "bg-amber-50 text-amber-800 border-amber-300";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden transition-colors" id="doc-tracker-cabinet">
      {/* Header Controls */}
      <div className="p-5 border-b border-slate-150 dark:border-slate-800 space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-tiffany-500" />
              <span>ຕູ້ເກັບເອກະສານ / Document Cabinet</span>
            </h3>
            <p className="text-[11px] text-slate-500">Search, filter, edit workflow, and view secure letters</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Custom filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາ... (Search letter, ref...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-tiffany-500/50 focus:border-tiffany-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Table/Grid Scroller */}
      <div className="overflow-auto flex-1 p-4 bg-slate-50/40 dark:bg-slate-800/10">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xxs">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">ບໍ່ມີເອກະສານ / No Documents Founded</p>
            <p className="text-[11px] text-slate-405 mt-1 max-w-[250px] mx-auto">Upload a PDF/Image or convert text directly above to persist documents.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map((docItem) => {
              const matchesSelected = selectedDocId === docItem.documentId;
              const isEditingThis = editingId === docItem.documentId;
              
              return (
                <div
                  key={docItem.documentId}
                  onClick={() => onSelectDocument(docItem)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 transition-all duration-200 text-[11px] sm:text-xs cursor-pointer select-none relative ${
                    matchesSelected
                      ? "border-tiffany-500 shadow-sm ring-2 ring-tiffany-500/10 bg-tiffany-50/5 dark:bg-tiffany-500/10 dark:border-tiffany-500"
                      : "border-slate-150 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-600 hover:shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  id={`doc-card-${docItem.documentId}`}
                >
                  {/* Top-line info: Title & Actions */}
                  <div className="flex items-start justify-between">
                    {renamingId === docItem.documentId ? (
                      <div className="flex-1 flex items-center gap-1.5 mr-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-indigo-400 dark:border-indigo-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-550 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveRename(docItem.documentId);
                            } else if (e.key === "Escape") {
                              setRenamingId(null);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(docItem.documentId)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition cursor-pointer"
                          title="Save title"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                          title="Cancel"
                        >
                          <span className="text-[10px] font-bold px-1 text-slate-500">X</span>
                        </button>
                      </div>
                    ) : (
                      <div className="max-w-[70%]">
                        <h4 className="font-bold text-slate-850 dark:text-slate-100 text-[11px] line-clamp-2 leading-snug pr-1 break-words">{docItem.title}</h4>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">{formatDate(docItem.createdAt)} &bull; {docItem.status}</p>
                      </div>
                    )}

                    {/* Action Buttons: Rename Title & Delete Document */}
                    {renamingId !== docItem.documentId && (
                      <div className="flex items-center space-x-1 shrink-0 self-start mt-0.5" onClick={e => e.stopPropagation()}>
                        {deleteConfirmId === docItem.documentId ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 p-0.5 rounded-lg">
                            <span className="text-[9px] text-red-650 dark:text-red-450 font-extrabold px-1">Delete?</span>
                            <button
                              onClick={(e) => handleConfirmDelete(docItem.documentId, e)}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-[9px] cursor-pointer transition shadow-xxs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                              className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 rounded font-bold text-[9px] hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Rename File Name option */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(docItem.documentId);
                                setRenameTitle(docItem.title);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition cursor-pointer"
                              title="Rename Document"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Symbol */}
                            <button
                              onClick={(e) => handleDeleteRequest(docItem.documentId, e)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                              title="Delete Document"
                              disabled={isDeletingId === docItem.documentId}
                            >
                              {isDeletingId === docItem.documentId ? (
                                <div className="w-3 h-3 border border-slate-300 border-t-red-650 rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Edit Popup Drawer */}
                  {isEditingThis && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-xl p-4 flex flex-col justify-between z-10 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                      <form onSubmit={(e) => handleSaveQuickEdit(docItem.documentId, e)} className="space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="font-bold text-slate-900 mb-2">ປ່ຽນແປງຂັ້ນຕອນ / Edit Stages</h5>
                          
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xxs text-slate-500 font-bold mb-0.5">WORKFLOW STAGE</label>
                              <input
                                type="text"
                                value={editFlowStatus}
                                onChange={(e) => setEditFlowStatus(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs"
                                placeholder="e.g. Received, Archiving, Finalise"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xxs text-slate-500 font-bold mb-0.5">STATUS TYPE</label>
                              <div className="grid grid-cols-3 gap-2">
                                {(["draft", "saved", "final"] as DocumentStatus[]).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setEditStatus(st)}
                                    className={`py-1 text-[10px] rounded font-semibold capitalize border ${
                                      editStatus === st
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="flex-1 bg-slate-100 hover:bg-slate-202 text-slate-705 py-1.5 rounded font-semibold text-[10px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded font-semibold text-[10px]"
                          >
                            Save changes
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
