import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Layers, 
  AlignRight, 
  Table, 
  Info,
  Maximize2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { SourceSheetInfo, TargetFileItem } from '../types';
import { inspectExcelFile, getSheetPreview } from '../utils/excelEngine';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sheetInfo?: SourceSheetInfo | null;
  targetItem?: TargetFileItem | null;
}

export const DataPreviewModal: React.FC<DataPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  sheetInfo: initialSheetInfo,
  targetItem
}) => {
  const [currentSheetInfo, setCurrentSheetInfo] = useState<SourceSheetInfo | null>(initialSheetInfo || null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialSheetInfo) {
      setCurrentSheetInfo(initialSheetInfo);
      setActiveSheetName(initialSheetInfo.name);
    } else if (targetItem) {
      loadFile(targetItem.file);
    }
  }, [isOpen, initialSheetInfo, targetItem]);

  const loadFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const { sheets, workbook: wb } = await inspectExcelFile(file);
      setAvailableSheets(sheets);
      setWorkbook(wb);

      if (sheets.length > 0) {
        const firstSheet = sheets[0];
        setActiveSheetName(firstSheet);
        const info = await getSheetPreview(wb, firstSheet, file, 30, 20);
        setCurrentSheetInfo(info);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری پیش‌نمایش فایل اکسل');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSelect = async (sName: string) => {
    if (!workbook || !targetItem) return;
    setLoading(true);
    try {
      setActiveSheetName(sName);
      const info = await getSheetPreview(workbook, sName, targetItem.file, 30, 20);
      setCurrentSheetInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تغییر شیت');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        id="data-preview-modal"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                مشاهده جدول داده‌ها و ساختار سلول‌های شیت
              </p>
            </div>
          </div>

          <button
            id="btn-close-preview-modal"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Target File multiple sheet picker if inspecting a target file */}
          {availableSheets.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                شیت‌های موجود در این فایل:
              </span>
              {availableSheets.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSheetSelect(s)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                    s === activeSheetName
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Stats Bar */}
          {currentSheetInfo && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-semibold text-slate-900">
                  نام شیت: <span className="text-emerald-700 font-bold">{currentSheetInfo.name}</span>
                </span>
                <span>تعداد ردیف‌ها: <strong>{currentSheetInfo.rowCount}</strong></span>
                <span>تعداد ستون‌ها: <strong>{currentSheetInfo.columnCount}</strong></span>
                {currentSheetInfo.isRightToLeft && (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-medium">
                    <AlignRight className="w-3.5 h-3.5" />
                    چیدمان راست‌به‌چپ (RTL)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500">
                (نمایش تا ۳۰ ردیف اول)
              </span>
            </div>
          )}

          {/* Table View */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              در حال خواندن اطلاعات فایل اکسل...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-700 text-xs bg-red-50 rounded-xl border border-red-200">
              {error}
            </div>
          ) : currentSheetInfo && currentSheetInfo.previewRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-[50vh] scrollbar-thin">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-2 px-3 border-l border-slate-200 text-center w-12 text-slate-500">#</th>
                    {currentSheetInfo.previewHeaders.map((h, i) => (
                      <th key={i} className="p-2 px-3 border-l border-slate-200 font-semibold text-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSheetInfo.previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 px-3 border-l border-slate-100 text-center text-slate-400 font-mono">
                        {rIdx + 1}
                      </td>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2 px-3 border-l border-slate-100 text-slate-700 whitespace-nowrap">
                          {cell !== null && cell !== undefined ? String(cell) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500 text-xs">
              ردیف داده‌ای در این شیت وجود ندارد یا خالی است.
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
