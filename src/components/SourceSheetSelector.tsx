import React, { useRef, useState } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  Settings2, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  HelpCircle,
  FileCheck,
  AlignRight
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { MergeConfig, SourceSheetInfo } from '../types';
import { inspectExcelFile, getSheetPreview } from '../utils/excelEngine';
import { formatBytes } from '../utils/fileScanner';

interface SourceSheetSelectorProps {
  sourceFile: File | null;
  availableSheets: string[];
  selectedSheetInfo: SourceSheetInfo | null;
  sourceWorkbook: ExcelJS.Workbook | null;
  config: MergeConfig;
  onSourceLoaded: (file: File, sheets: string[], wb: ExcelJS.Workbook, info: SourceSheetInfo) => void;
  onSheetChange: (sheetName: string) => void;
  onConfigChange: (updater: (prev: MergeConfig) => MergeConfig) => void;
  onOpenPreviewModal: (title: string, info: SourceSheetInfo) => void;
  isProcessing: boolean;
}

export const SourceSheetSelector: React.FC<SourceSheetSelectorProps> = ({
  sourceFile,
  availableSheets,
  selectedSheetInfo,
  sourceWorkbook,
  config,
  onSourceLoaded,
  onSheetChange,
  onConfigChange,
  onOpenPreviewModal,
  isProcessing
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { sheets, workbook } = await inspectExcelFile(file);
      if (sheets.length === 0) {
        throw new Error('فایل انتخاب شده فاقد شیت معتبر است.');
      }

      // Default to first sheet or look for sheet with name like 'مرداد'
      const initialSheet = sheets.find(s => s.includes('مرداد')) || sheets[0];
      const preview = await getSheetPreview(workbook, initialSheet, file);

      onSourceLoaded(file, sheets, workbook, preview);
      onConfigChange(prev => ({
        ...prev,
        sourceSheetName: initialSheet,
        targetSheetName: initialSheet
      }));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'خطا در بارگذاری فایل اکسل الگو');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
        handleFile(file);
      } else {
        setErrorMessage('لطفاً یک فایل معتبر با فرمت xlsx یا xls انتخاب کنید.');
      }
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    if (!sourceWorkbook || !sourceFile) return;
    try {
      setIsLoading(true);
      const preview = await getSheetPreview(sourceWorkbook, sheetName, sourceFile);
      onSheetChange(sheetName);
      onConfigChange(prev => ({
        ...prev,
        sourceSheetName: sheetName,
        targetSheetName: sheetName
      }));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'خطا در تغییر شیت');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="source-sheet-card" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm relative">
      {/* Decorative top accent */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-2xl" />

      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 font-bold">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              ۱. انتخاب شیت الگو (منبع)
              {sourceFile && (
                <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  بارگذاری شد
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              فایل اکسل حاوی شیتی که قصد دارید به همه فایل‌ها اضافه شود را انتخاب کنید.
            </p>
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <span className="font-bold">خطا:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* File Upload Zone */}
      {!sourceFile ? (
        <div
          id="source-file-dropzone"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging 
              ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
              : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={isProcessing}
          />
          
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-emerald-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                فایل اکسل الگو را اینجا بکشید یا برای انتخاب کلیک کنید
              </p>
              <p className="text-xs text-slate-500 mt-1">
                پشتیبانی از فرمت‌های XLSX و XLS (مثال: فایلی که شیت "مرداد" داخل آن است)
              </p>
            </div>
            <button
              type="button"
              className="mt-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
            >
              انتخاب فایل اکسل الگو
            </button>
          </div>
        </div>
      ) : (
        /* Source File Loaded State */
        <div className="space-y-4">
          
          {/* File summary bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate" title={sourceFile.name}>
                  {sourceFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>حجم: {formatBytes(sourceFile.size)}</span>
                  <span>•</span>
                  <span>{availableSheets.length} شیت موجود</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-change-source-file"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                تغییر فایل
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </div>

          {/* Sheet Selector Pills / Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                انتخاب شیتی که باید ادغام شود:
              </span>
              <span className="text-[11px] text-slate-500">
                شیت انتخابی: <strong className="text-emerald-700 font-bold">{config.sourceSheetName}</strong>
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              {availableSheets.map((sheet) => {
                const isSelected = sheet === config.sourceSheetName;
                return (
                  <button
                    key={sheet}
                    id={`sheet-pill-${sheet}`}
                    type="button"
                    onClick={() => handleSheetSelect(sheet)}
                    disabled={isProcessing}
                    className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all duration-150 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{sheet}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Sheet Summary & Mini Preview Card */}
          {selectedSheetInfo && (
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-700 flex-wrap">
                  <span className="font-semibold text-slate-900">مشخصات شیت «{selectedSheetInfo.name}»:</span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-medium">
                    {selectedSheetInfo.rowCount} ردیف داده
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 font-medium">
                    {selectedSheetInfo.columnCount} ستون
                  </span>
                  {selectedSheetInfo.isRightToLeft && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                      <AlignRight className="w-3 h-3" />
                      راست‌به‌چپ (RTL)
                    </span>
                  )}
                </div>

                <button
                  id="btn-inspect-source-sheet"
                  type="button"
                  onClick={() => onOpenPreviewModal(`پیش‌نمایش شیت «${selectedSheetInfo.name}»`, selectedSheetInfo)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  مشاهده کامل داده‌ها
                </button>
              </div>

              {/* Quick 3-row data sample */}
              {selectedSheetInfo.previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-36 scrollbar-thin">
                  <table className="w-full text-[11px] text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        {selectedSheetInfo.previewHeaders.slice(0, 5).map((h, i) => (
                          <th key={i} className="p-1.5 px-2.5 font-semibold text-slate-700 border-l border-slate-200 last:border-l-0">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSheetInfo.previewRows.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-100 hover:bg-slate-50">
                          {row.slice(0, 5).map((cell, cIdx) => (
                            <td key={cIdx} className="p-1.5 px-2.5 text-slate-700 border-l border-slate-100 last:border-l-0 truncate max-w-[120px]">
                              {cell !== null && cell !== undefined ? String(cell) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Merge Customization Controls */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            
            {/* Target Sheet Name in destination files */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  نام شیت در فایل‌های مقصد:
                </label>
                <input
                  id="input-target-sheet-name"
                  type="text"
                  value={config.targetSheetName}
                  onChange={(e) => onConfigChange(prev => ({ ...prev, targetSheetName: e.target.value }))}
                  disabled={isProcessing}
                  placeholder="مثال: مرداد یا مرداد ۱۴۰۳"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  پیش‌فرض: همان نام شیت مبدا ({config.sourceSheetName})
                </p>
              </div>

              {/* Collision Strategy */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  اگر فایل مقصد از قبل شیتی با این نام داشت:
                </label>
                <select
                  id="select-collision-strategy"
                  value={config.collisionStrategy}
                  onChange={(e) => onConfigChange(prev => ({ ...prev, collisionStrategy: e.target.value as any }))}
                  disabled={isProcessing}
                  className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none transition-colors"
                >
                  <option value="overwrite">جایگزینی شیت قدیمی با شیت جدید (پیشنهادی)</option>
                  <option value="rename">افزودن شیت جدید با تغییر نام خودکار (مانند مرداد_۱)</option>
                  <option value="skip">رد کردن این فایل و عدم تغییر آن</option>
                </select>
              </div>
            </div>

            {/* Insertion Position */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  محل قرارگیری شیت جدید در فایل مقصد:
                </label>
                <select
                  id="select-sheet-position"
                  value={config.sheetPosition}
                  onChange={(e) => onConfigChange(prev => ({ ...prev, sheetPosition: e.target.value as any }))}
                  disabled={isProcessing}
                  className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none transition-colors"
                >
                  <option value="end">در انتهای لیست شیت‌ها (شیت آخر)</option>
                  <option value="start">در ابتدای لیست شیت‌ها (شیت اول)</option>
                </select>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors w-full justify-between border border-slate-200 bg-slate-50"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
                    تنظیمات پیشرفته کپی فرمت و استایل
                  </span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Advanced Options Accordion */}
            {showAdvanced && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.copyFormatting}
                    onChange={(e) => onConfigChange(prev => ({ ...prev, copyFormatting: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>کپی استایل سلول‌ها (رنگ، فونت، حاشیه)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.copyColumnWidths}
                    onChange={(e) => onConfigChange(prev => ({ ...prev, copyColumnWidths: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>حفظ عرض ستون‌ها (Column Widths)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.copyRowHeights}
                    onChange={(e) => onConfigChange(prev => ({ ...prev, copyRowHeights: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>حفظ ارتفاع ردیف‌ها (Row Heights)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.copyMergedCells}
                    onChange={(e) => onConfigChange(prev => ({ ...prev, copyMergedCells: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>حفظ سلول‌های ادغام شده (Merged Cells)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.preserveRTL}
                    onChange={(e) => onConfigChange(prev => ({ ...prev, preserveRTL: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>حفظ چیدمان راست‌به‌چپ (RTL View)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.preserveFormulas}
                    onChange={(e) => onConfigChange(prev => ({ ...prev, preserveFormulas: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>کپی فرمول‌های محاسباتی اکسل</span>
                </label>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};
