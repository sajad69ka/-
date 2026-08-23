import React from 'react';
import { Layers, ShieldCheck, Sparkles, RotateCcw, FileSpreadsheet, FolderTree } from 'lucide-react';

interface HeaderProps {
  onLoadDemo: () => void;
  onReset: () => void;
  hasData: boolean;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadDemo,
  onReset,
  hasData,
  isProcessing
}) => {
  return (
    <header id="app-header" className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center text-white">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  ادغامگر هوشمند اکسل
                  <span className="text-xs font-medium text-slate-400">v2.4.0</span>
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>وضعیت: آماده (۱۰۰٪ آفلاین و محلی)</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                افزودن خودکار شیت مدنظر (مثل شیت مرداد) به صدها فایل اکسل در پوشه‌های تودرتو بدون بهم‌ریختگی فرمت
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-load-demo"
              type="button"
              onClick={onLoadDemo}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 px-3.5 py-2 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="بارگذاری فایل‌های نمونه در پوشه‌های تودرتو و شیت مرداد برای تست فوری"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>تست با داده‌های نمونه (شیت مرداد)</span>
            </button>

            {hasData && (
              <button
                id="btn-reset-all"
                type="button"
                onClick={onReset}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-50"
                title="پاکسازی و شروع مجدد"
              >
                <RotateCcw className="w-4 h-4" />
                <span>پاکسازی</span>
              </button>
            )}
          </div>

        </div>

        {/* Feature Highlights Bar */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 overflow-x-auto gap-4 scrollbar-none">
          <div className="flex items-center gap-6 shrink-0">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <FolderTree className="w-3.5 h-3.5 text-emerald-600" />
              حفظ ساختار پوشه‌ها و زیرپوشه‌ها (Recursive)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              حفظ فرمول‌ها، فونت، رنگ و راست‌به‌چپ (RTL)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              پردازش امن داخل مرورگر بدون ارسال به سرور
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
