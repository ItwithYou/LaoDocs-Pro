import React, { useState } from "react";
import { LaoLetterDocument, DocumentStatus } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Search, FileText, Calendar, ArrowRight, Trash2, Edit3, HelpCircle, Eye, RefreshCw, CheckCircle2 } from "lucide-react";

interface DocumentTrackerProps {
  documents: LaoLetterDocument[];
  onSelectDocument: (doc: LaoLetterDocument) => void;
  selectedDocId: string | null;
  onRefresh: () => void;
}

export default function DocumentTracker({ documents, onSelectDocument, selectedDocId, onRefresh }: DocumentTrackerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Status/Stage edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFlowStatus, setEditFlowStatus] = useState("");
  const [editStatus, setEditStatus] = useState<DocumentStatus>("saved");

  const handleDeleteRequest = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(docId);
  };

  const handleConfirmDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeletingId(docId);
    try {
      await deleteDoc(doc(db, "documents", docId));
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
      await updateDoc(docRef, {
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
    const matchesSearch =
      docItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (docItem.sender && docItem.sender.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (docItem.receiver && docItem.receiver.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (docItem.referenceNo && docItem.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || docItem.status === statusFilter;
    const matchesStage = stageFilter === "all" || docItem.flowStatus === stageFilter;

    return matchesSearch && matchesStatus && matchesStage;
  });

  // Extract all unique stages for filters
  const stages = Array.from(new Set(documents.map(d => d.flowStatus).filter(Boolean)));

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
            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 transition cursor-pointer"
            title="Refresh database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Custom filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative col-span-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ຄົ້ນຫາ... (Search letter, ref...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
            >
              <option value="all">ສະຖານະທັງໝົດ (All Statuses)</option>
              <option value="draft">Draft</option>
              <option value="saved">Saved</option>
              <option value="final">Final / Official</option>
            </select>
          </div>

          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
            >
              <option value="all">ຂັ້ນຕອນທັງໝົດ (All Workflow Stages)</option>
              {stages.map((stg) => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table/Grid Scroller */}
      <div className="overflow-auto flex-1 p-4 bg-slate-50/40">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 bg-white border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xxs">
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
                  className={`bg-white rounded-2xl border p-4 transition-all duration-200 text-[11px] sm:text-xs cursor-pointer select-none relative ${
                    matchesSelected
                      ? "border-indigo-500 shadow-sm ring-2 ring-indigo-500/10 bg-indigo-50/5"
                      : "border-slate-150 hover:border-slate-350 hover:shadow-xs"
                  }`}
                  id={`doc-card-${docItem.documentId}`}
                >
                  {/* Top-line info: Title & Actions */}
                  <div className="flex items-start justify-between">
                    <div className="max-w-[80%] pr-4">
                      <span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-2">
                        {docItem.sourceType}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-1 line-clamp-1">{docItem.title}</h4>
                      {docItem.referenceNo && (
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          ເລກທີ: <span className="font-semibold">{docItem.referenceNo}</span> {docItem.referenceDate && `| ວັນທີ: ${docItem.referenceDate}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 self-start" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => startQuickEdit(docItem, e)}
                        className="p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-800 transition"
                        title="Edit stages"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => deleteConfirmId === docItem.documentId ? handleConfirmDelete(docItem.documentId, e) : handleDeleteRequest(docItem.documentId, e)}
                        className={`p-1.5 rounded transition ${deleteConfirmId === docItem.documentId ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'hover:bg-slate-50 text-slate-500 hover:text-red-500'}`}
                        title="Delete Document"
                        disabled={isDeletingId === docItem.documentId}
                      >
                        {isDeletingId === docItem.documentId ? (
                          <div className="w-3.5 h-3.5 border border-slate-300 border-t-red-650 rounded-full animate-spin" />
                        ) : deleteConfirmId === docItem.documentId ? (
                          <span className="text-[10px] font-bold px-1">Confirm</span>
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Sender & Receiver layout info */}
                  {(docItem.sender || docItem.receiver) && (
                    <div className="mt-3 py-1.5 px-2 bg-slate-50/70 border border-slate-100/30 rounded-lg flex items-center justify-between font-medium text-[10px] text-slate-650">
                      <div className="truncate max-w-[45%]">
                        <span className="text-slate-400">ຈາກ:</span> {docItem.sender || "-"}
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mx-1.5" />
                      <div className="truncate max-w-[45%] text-right">
                        <span className="text-slate-400">ເຖິງ:</span> {docItem.receiver || "-"}
                      </div>
                    </div>
                  )}

                  {/* Summary overlay details */}
                  {docItem.summary && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
                      {docItem.summary}
                    </p>
                  )}

                  {/* Bottom metrics */}
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(docItem.createdAt)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xxs px-2 py-0.5 rounded bg-slate-100 text-slate-650 font-medium">
                        {docItem.flowStatus || "Draft"}
                      </span>
                      <span className={`text-xxs px-2 py-0.5 rounded border ${getStatusBadge(docItem.status)}`}>
                        {docItem.status}
                      </span>
                    </div>
                  </div>

                  {/* Quick Edit Popup Drawer */}
                  {isEditingThis && (
                    <div className="absolute inset-0 bg-white/95 rounded-xl p-4 flex flex-col justify-between z-10" onClick={e => e.stopPropagation()}>
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
