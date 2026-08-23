import React, { useRef, useState, useMemo } from 'react';
import { 
  FolderOpen, 
  Upload, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  FolderTree, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Eye, 
  Play, 
  Filter,
  Layers,
  Folder
} from 'lucide-react';
import { TargetFileItem } from '../types';
import { scanFileSystemEntries, extractFilesFromInput, formatBytes } from '../utils/fileScanner';

interface TargetFolderSelectorProps {
  targetItems: TargetFileItem[];
  onAddItems: (items: TargetFileItem[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onInspectItem: (item: TargetFileItem) => void;
  onTestSingleItem?: (item: TargetFileItem) => void;
  isProcessing: boolean;
}

export const TargetFolderSelector: React.FC<TargetFolderSelectorProps> = ({
  targetItems,
  onAddItems,
  onRemoveItem,
  onClearAll,
  onInspectItem,
  onTestSingleItem,
  isProcessing
}) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Handle Drag and Drop for folders & files recursively
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const scanned = await scanFileSystemEntries(e.dataTransfer.items);
      const newItems: TargetFileItem[] = scanned.map(s => ({
        id: `${s.file.name}-${s.file.size}-${s.file.lastModified}-${Math.random().toString(36).substring(2, 7)}`,
        file: s.file,
        name: s.file.name,
        relativePath: s.relativePath,
        size: s.file.size,
        status: 'pending'
      }));

      if (newItems.length > 0) {
        onAddItems(newItems);
      }
    }
  };

  // Handle Directory Input Change
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const extracted = extractFilesFromInput(e.target.files);
      if (extracted.length > 0) {
        onAddItems(extracted);
      }
      // Reset input value so same directory can be re-selected if needed
      e.target.value = '';
    }
  };

  // Handle Multiple Files Input Change
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const extracted = extractFilesFromInput(e.target.files);
      if (extracted.length > 0) {
        onAddItems(extracted);
      }
      e.target.value = '';
    }
  };

  // Statistics
  const totalSize = useMemo(() => targetItems.reduce((acc, curr) => acc + curr.size, 0), [targetItems]);
  const uniqueFolders = useMemo(() => {
    const folders = new Set<string>();
    targetItems.forEach(item => {
      const parts = item.relativePath.split('/');
      if (parts.length > 1) {
        folders.add(parts.slice(0, -1).join('/'));
      }
    });
    return Array.from(folders);
  }, [targetItems]);

  // Filtered target list
  const filteredItems = useMemo(() => {
    return targetItems.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.relativePath.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [targetItems, searchQuery, statusFilter]);

  const getStatusBadge = (status: TargetFileItem['status'], message?: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full" title={message}>
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            ادغام شد
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full" title={message}>
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            جایگزین شد
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full" title={message}>
            <XCircle className="w-3 h-3 text-red-600" />
            خطا
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full" title={message}>
            رد شده
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
            <Clock className="w-3 h-3 animate-spin text-blue-600" />
            در حال پردازش
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
            در انتظار
          </span>
        );
    }
  };

  return (
    <div id="target-folder-card" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm relative">
      {/* Decorative top line */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-t-2xl" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 font-bold">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              ۲. انتخاب پوشه فایل‌های مقصد (فولدرهای تودرتو)
              {targetItems.length > 0 && (
                <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 font-semibold px-2 py-0.5 rounded-full">
                  {targetItems.length} فایل اکسل
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              پوشه اصلی شامل فایل‌های اکسل را انتخاب کنید (تمام زیرپوشه‌ها به طور خودکار اسکن می‌شوند).
            </p>
          </div>
        </div>

        {targetItems.length > 0 && (
          <button
            id="btn-clear-target-files"
            type="button"
            onClick={onClearAll}
            disabled={isProcessing}
            className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 hover:bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-xl transition-colors self-start sm:self-auto shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف تمام فایل‌ها
          </button>
        )}
      </div>

      {/* Dropzone & Selector Buttons */}
      <div
        id="target-folder-dropzone"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 ${
          isDragging 
            ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
            : 'border-slate-300 bg-slate-50/60 hover:border-emerald-500 hover:bg-emerald-50/20'
        }`}
      >
        {/* Hidden File inputs */}
        {/* Directory Input */}
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as any)}
          multiple
          className="hidden"
          onChange={handleFolderSelect}
          disabled={isProcessing}
        />
        {/* Multiple Files Input */}
        <input
          ref={filesInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          multiple
          className="hidden"
          onChange={handleFilesSelect}
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-teal-600">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              پوشه یا چندین فایل اکسل را اینجا بکشید و رها کنید
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              پوشه‌های تودرتو و تمام فایل‌های XLSX / XLS به طور خودکار شناسایی می‌شوند
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-center mt-1">
            <button
              id="btn-select-folder"
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <FolderTree className="w-4 h-4" />
              انتخاب پوشه (شامل تمام زیرپوشه‌ها)
            </button>

            <button
              id="btn-select-files"
              type="button"
              onClick={() => filesInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl transition-colors border border-slate-300 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              انتخاب فایل‌ها به صورت تکی/چندتایی
            </button>
          </div>
        </div>
      </div>

      {/* Target Files List & Management */}
      {targetItems.length > 0 && (
        <div className="mt-4 space-y-3">
          
          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                تعداد کل: {targetItems.length} فایل اکسل
              </span>
              <span>حجم کل: {formatBytes(totalSize)}</span>
              {uniqueFolders.length > 0 && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Folder className="w-3 h-3 text-amber-500" />
                  {uniqueFolders.length} زیرپوشه مجزا
                </span>
              )}
            </div>

            {/* Quick Test on 1 item button */}
            {onTestSingleItem && (
              <button
                id="btn-test-single-item"
                type="button"
                onClick={() => onTestSingleItem(targetItems[0])}
                disabled={isProcessing}
                className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                title="برای اطمینان، ابتدا شیت را روی ۱ فایل ادغام و تست کنید"
              >
                <Play className="w-3 h-3 text-emerald-600" />
                تست و بررسی روی یک فایل نمونه
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-target-files"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام فایل یا مسیر پوشه..."
                className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-900 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-300 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">همه وضعیت‌ها ({targetItems.length})</option>
                <option value="pending">در انتظار</option>
                <option value="success">موفق</option>
                <option value="warning">جایگزین شده</option>
                <option value="error">دارای خطا</option>
                <option value="skipped">رد شده</option>
              </select>
            </div>
          </div>

          {/* Target File Table / List */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 z-10 font-semibold">
                  <tr>
                    <th className="p-2.5 px-3">ردیف</th>
                    <th className="p-2.5 px-3">مسیر فایل در پوشه‌ها</th>
                    <th className="p-2.5 px-3">حجم</th>
                    <th className="p-2.5 px-3">وضعیت</th>
                    <th className="p-2.5 px-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-500">
                        هیچ فایلی با این فیلتر یا عبارت جستجو یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const pathParts = item.relativePath.split('/');
                      const fileName = pathParts.pop();
                      const folderPath = pathParts.join('/');

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 px-3 text-slate-400 text-center w-12">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 px-3 font-medium text-slate-800">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                {fileName}
                              </span>
                              {folderPath && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Folder className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-mono text-slate-600 dir-ltr">{folderPath}</span>
                                </span>
                              )}
                              {item.message && (
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {item.message}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {formatBytes(item.size)}
                          </td>
                          <td className="p-2.5 px-3 whitespace-nowrap">
                            {getStatusBadge(item.status, item.message)}
                          </td>
                          <td className="p-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onInspectItem(item)}
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors"
                                title="مشاهده اطلاعات و شیت‌های این فایل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                disabled={isProcessing}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="حذف از لیست"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
