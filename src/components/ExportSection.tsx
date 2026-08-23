import React, { useState } from 'react';
import { 
  DownloadCloud, 
  FolderArchive, 
  CheckCircle2, 
  FileSpreadsheet, 
  Download, 
  Clock, 
  FolderTree,
  Share2
} from 'lucide-react';
import saveAs from 'file-saver';
import { TargetFileItem } from '../types';
import { createProcessedZip, formatBytes } from '../utils/fileScanner';

interface ExportSectionProps {
  targetItems: TargetFileItem[];
  sourceSheetName: string;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  targetItems,
  sourceSheetName
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [zipName, setZipName] = useState(`اکسل_ادغام_شده_${new Date().toISOString().slice(0, 10)}.zip`);

  const processedCount = targetItems.filter(i => i.status === 'success' || i.status === 'warning').length;
  const hasProcessedFiles = processedCount > 0;

  const handleDownloadZip = async () => {
    if (targetItems.length === 0) return;
    setIsZipping(true);
    setZipProgress(0);

    try {
      const zipBlob = await createProcessedZip(targetItems, (percent) => {
        setZipProgress(percent);
      });

      saveAs(zipBlob, zipName.endsWith('.zip') ? zipName : `${zipName}.zip`);
    } catch (error) {
      alert('خطا در ایجاد فایل فشرده ZIP: ' + (error instanceof Error ? error.message : 'نامشخص'));
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadSingle = (item: TargetFileItem) => {
    if (item.processedBlob) {
      saveAs(item.processedBlob, item.name);
    } else if (item.file) {
      saveAs(item.file, item.name);
    }
  };

  if (!hasProcessedFiles) return null;

  return (
    <div id="export-action-card" className="bg-white border-2 border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
      <div className="relative z-10 space-y-5">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-600/20">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                ۴. دانلود و ذخیره فایل‌های خروجی
                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {processedCount} فایل آماده دانلود
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                تمام فایل‌ها با شیت «{sourceSheetName}» و حفظ کامل پوشه‌ها و زیرپوشه‌ها آماده دانلود هستند.
              </p>
            </div>
          </div>

          {/* Download Zip Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-download-all-zip"
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-6 py-3.5 rounded-xl transition-all duration-150 shadow-sm disabled:opacity-50 text-sm"
            >
              <DownloadCloud className="w-5 h-5" />
              <span>
                {isZipping ? `در حال ساخت ZIP (${zipProgress}%)...` : 'دانلود یکجای تمام فایل‌ها در قالب ZIP'}
              </span>
            </button>
          </div>
        </div>

        {/* Folder Hierarchy Feature Notice */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl flex items-center justify-between flex-wrap gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-600" />
            <span>
              <strong className="text-slate-900">ساختار پوشه‌ها:</strong> پس از دانلود و Extract کردن فایل ZIP، تمام زیرپوشه‌ها دقیقاً با همان ساختار اصلی پوشه شما قرار می‌گیرند.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 whitespace-nowrap font-medium">نام فایل خروجی ZIP:</label>
            <input
              type="text"
              value={zipName}
              onChange={(e) => setZipName(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Processed Files Grid / Quick Download */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>لیست فایل‌های پردازش شده ({targetItems.length} فایل):</span>
            <span className="text-[11px] font-normal text-slate-500">
              امکان دانلود تک‌تک فایل‌ها یا دریافت یکجای ZIP
            </span>
          </h4>

          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 scrollbar-thin">
            {targetItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 px-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{item.relativePath}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.processingTimeMs && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {item.processingTimeMs}ms
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">{formatBytes(item.size)}</span>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(item)}
                    className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-medium"
                    title="دانلود فقط این فایل"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">دانلود</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
