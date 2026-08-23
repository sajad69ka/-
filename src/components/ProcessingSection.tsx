import React from 'react';
import { 
  Play, 
  Square, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Layers, 
  Sparkles,
  Zap
} from 'lucide-react';
import { ProcessingProgress } from '../types';

interface ProcessingSectionProps {
  isProcessing: boolean;
  progress: ProcessingProgress | null;
  canStart: boolean;
  onStartMerge: () => void;
  onStopMerge: () => void;
  totalFiles: number;
  sourceSheetName: string;
}

export const ProcessingSection: React.FC<ProcessingSectionProps> = ({
  isProcessing,
  progress,
  canStart,
  onStartMerge,
  onStopMerge,
  totalFiles,
  sourceSheetName
}) => {
  return (
    <div id="processing-action-card" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Action Description */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ۳. اجرای عملیات ادغام دسته‌ای شیت
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              افزودن شیت <strong className="text-emerald-700 font-semibold">«{sourceSheetName || 'انتخابی'}»</strong> به {totalFiles} فایل اکسل در پوشه‌ها با یک کلیک
            </p>
          </div>
        </div>

        {/* Start / Cancel Buttons */}
        <div className="flex items-center gap-3">
          {!isProcessing ? (
            <button
              id="btn-start-batch-merge"
              type="button"
              onClick={onStartMerge}
              disabled={!canStart}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl transition-all duration-150 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>شروع ادغام در تمام فایل‌ها ({totalFiles} فایل)</span>
            </button>
          ) : (
            <button
              id="btn-stop-batch-merge"
              type="button"
              onClick={onStopMerge}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold px-5 py-3 rounded-xl transition-colors text-sm shadow-sm"
            >
              <Square className="w-4 h-4 fill-red-600 text-red-600" />
              <span>توقف عملیات</span>
            </button>
          )}
        </div>

      </div>

      {/* Progress & Real-time Metrics Dashboard */}
      {progress && (
        <div className="mt-5 pt-4 border-t border-slate-200 space-y-4">
          
          {/* Progress Bar & Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                در حال پردازش: <span className="text-emerald-700 font-bold truncate max-w-xs">{progress.currentFileName || 'در حال آماده‌سازی...'}</span>
              </span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {progress.percent}% ({progress.completed} از {progress.total})
              </span>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-600 rounded-full transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* Metrics Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                موفق:
              </span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                {progress.successful}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                جایگزین شده:
              </span>
              <span className="text-sm font-bold text-amber-700 font-mono">
                {progress.warnings}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                رد شده:
              </span>
              <span className="text-sm font-bold text-slate-700 font-mono">
                {progress.skipped}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                دارای خطا:
              </span>
              <span className="text-sm font-bold text-red-700 font-mono">
                {progress.errors}
              </span>
            </div>
          </div>

          {/* Time & ETA */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>
              زمان سپری شده: <strong className="text-slate-700 font-mono">{Math.round(progress.elapsedMs / 1000)} ثانیه</strong>
            </span>
            {progress.etaSeconds !== null && isProcessing && (
              <span>
                زمان تخمینی باقی‌مانده: <strong className="text-emerald-700 font-mono">{progress.etaSeconds} ثانیه</strong>
              </span>
            )}
            {!isProcessing && progress.percent === 100 && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                عملیات با موفقیت پایان یافت!
              </span>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
