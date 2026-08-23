import React, { useState, useRef, useCallback } from 'react';
import ExcelJS from 'exceljs';
import { Header } from './components/Header';
import { SourceSheetSelector } from './components/SourceSheetSelector';
import { TargetFolderSelector } from './components/TargetFolderSelector';
import { ProcessingSection } from './components/ProcessingSection';
import { ExportSection } from './components/ExportSection';
import { DataPreviewModal } from './components/DataPreviewModal';
import { 
  MergeConfig, 
  ProcessingProgress, 
  SourceSheetInfo, 
  TargetFileItem 
} from './types';
import { processSingleFile } from './utils/excelEngine';
import { generateDemoDataset } from './utils/fileScanner';
import { inspectExcelFile, getSheetPreview } from './utils/excelEngine';
import { 
  Info, 
  ShieldCheck, 
  FolderTree, 
  Sparkles, 
  CheckCircle2, 
  FileSpreadsheet, 
  HelpCircle,
  HelpCircle as QuestionIcon
} from 'lucide-react';

export default function App() {
  // Source template state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheetInfo, setSelectedSheetInfo] = useState<SourceSheetInfo | null>(null);
  const [sourceWorkbook, setSourceWorkbook] = useState<ExcelJS.Workbook | null>(null);

  // Target files state
  const [targetItems, setTargetItems] = useState<TargetFileItem[]>([]);

  // Configuration state
  const [config, setConfig] = useState<MergeConfig>({
    sourceSheetName: '',
    targetSheetName: '',
    collisionStrategy: 'overwrite',
    sheetPosition: 'end',
    positionIndex: 1,
    copyFormatting: true,
    copyColumnWidths: true,
    copyRowHeights: true,
    copyMergedCells: true,
    preserveRTL: true,
    preserveFormulas: true,
    outputZipName: 'فایل‌های_اکسل_ادغام_شده.zip'
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const abortControllerRef = useRef<boolean>(false);

  // Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    sheetInfo?: SourceSheetInfo | null;
    targetItem?: TargetFileItem | null;
  }>({
    isOpen: false,
    title: ''
  });

  // Handlers for Source File
  const handleSourceLoaded = useCallback((
    file: File,
    sheets: string[],
    wb: ExcelJS.Workbook,
    info: SourceSheetInfo
  ) => {
    setSourceFile(file);
    setAvailableSheets(sheets);
    setSourceWorkbook(wb);
    setSelectedSheetInfo(info);
    setConfig(prev => ({
      ...prev,
      sourceSheetName: info.name,
      targetSheetName: info.name
    }));
  }, []);

  const handleSheetChange = useCallback((sheetName: string) => {
    setConfig(prev => ({
      ...prev,
      sourceSheetName: sheetName,
      targetSheetName: sheetName
    }));
  }, []);

  // Handlers for Target Items
  const handleAddTargetItems = useCallback((newItems: TargetFileItem[]) => {
    setTargetItems(prev => {
      // De-duplicate by relative path and size
      const existingPaths = new Set(prev.map(i => `${i.relativePath}-${i.size}`));
      const filteredNew = newItems.filter(i => !existingPaths.has(`${i.relativePath}-${i.size}`));
      return [...prev, ...filteredNew];
    });
  }, []);

  const handleRemoveTargetItem = useCallback((id: string) => {
    setTargetItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleClearAllTargets = useCallback(() => {
    setTargetItems([]);
    setProgress(null);
  }, []);

  // Load Demo Data (Mordad sheet with 5 branch files)
  const handleLoadDemo = async () => {
    setIsProcessing(true);
    try {
      const demo = await generateDemoDataset();
      const { sheets, workbook } = await inspectExcelFile(demo.sourceFile);
      const preview = await getSheetPreview(workbook, demo.sourceSheetName, demo.sourceFile);

      setSourceFile(demo.sourceFile);
      setAvailableSheets(sheets);
      setSourceWorkbook(workbook);
      setSelectedSheetInfo(preview);
      setTargetItems(demo.targetItems);
      setProgress(null);
      setConfig(prev => ({
        ...prev,
        sourceSheetName: demo.sourceSheetName,
        targetSheetName: demo.sourceSheetName
      }));
    } catch (err) {
      alert('خطا در بارگذاری نمونه آزمایشی: ' + (err instanceof Error ? err.message : 'نامشخص'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset entire state
  const handleReset = () => {
    if (isProcessing) return;
    setSourceFile(null);
    setAvailableSheets([]);
    setSelectedSheetInfo(null);
    setSourceWorkbook(null);
    setTargetItems([]);
    setProgress(null);
    setConfig({
      sourceSheetName: '',
      targetSheetName: '',
      collisionStrategy: 'overwrite',
      sheetPosition: 'end',
      positionIndex: 1,
      copyFormatting: true,
      copyColumnWidths: true,
      copyRowHeights: true,
      copyMergedCells: true,
      preserveRTL: true,
      preserveFormulas: true,
      outputZipName: 'فایل‌های_اکسل_ادغام_شده.zip'
    });
  };

  // Test Single Item
  const handleTestSingleItem = async (item: TargetFileItem) => {
    if (!sourceWorkbook || !config.sourceSheetName) {
      alert('لطفاً ابتدا فایل الگو و شیت منبع را انتخاب کنید.');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await processSingleFile(
        item,
        sourceWorkbook,
        config.sourceSheetName,
        config
      );

      setTargetItems(prev => prev.map(i => i.id === item.id ? updated : i));

      // Open inspection modal to see the result
      setPreviewModal({
        isOpen: true,
        title: `نتیجه تست فایل: ${item.name}`,
        targetItem: updated
      });
    } catch (err) {
      alert('خطا در تست فایل: ' + (err instanceof Error ? err.message : 'نامشخص'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Batch Merge Execution
  const handleStartMerge = async () => {
    if (!sourceWorkbook || !config.sourceSheetName) {
      alert('لطفاً ابتدا فایل و شیت الگو را انتخاب کنید.');
      return;
    }
    if (targetItems.length === 0) {
      alert('لطفاً حداقل یک فایل یا پوشه مقصد انتخاب کنید.');
      return;
    }

    setIsProcessing(true);
    abortControllerRef.current = false;

    const total = targetItems.length;
    const startTime = performance.now();

    let completed = 0;
    let successful = 0;
    let warnings = 0;
    let errors = 0;
    let skipped = 0;

    const initialProgress: ProcessingProgress = {
      total,
      completed: 0,
      successful: 0,
      warnings: 0,
      errors: 0,
      skipped: 0,
      currentFileName: targetItems[0].name,
      percent: 0,
      startTime,
      elapsedMs: 0,
      etaSeconds: null
    };
    setProgress(initialProgress);

    const updatedTargetList = [...targetItems];
    const concurrency = 4; // Process in small concurrent batches for speed & low memory footprint

    for (let i = 0; i < total; i += concurrency) {
      if (abortControllerRef.current) break;

      const chunkIndices = Array.from(
        { length: Math.min(concurrency, total - i) },
        (_, offset) => i + offset
      );

      const promises = chunkIndices.map(async (idx) => {
        const item = updatedTargetList[idx];
        const processed = await processSingleFile(
          item,
          sourceWorkbook,
          config.sourceSheetName,
          config
        );
        updatedTargetList[idx] = processed;

        // Tally results
        if (processed.status === 'success') successful++;
        else if (processed.status === 'warning') warnings++;
        else if (processed.status === 'skipped') skipped++;
        else if (processed.status === 'error') errors++;

        completed++;

        const elapsed = performance.now() - startTime;
        const avgTimePerFile = elapsed / completed;
        const remainingFiles = total - completed;
        const eta = Math.round((avgTimePerFile * remainingFiles) / 1000);

        setProgress({
          total,
          completed,
          successful,
          warnings,
          errors,
          skipped,
          currentFileName: item.name,
          percent: Math.round((completed / total) * 100),
          startTime,
          elapsedMs: elapsed,
          etaSeconds: eta > 0 ? eta : 0
        });
      });

      await Promise.all(promises);
      // Update state incrementally to reflect statuses
      setTargetItems([...updatedTargetList]);
    }

    setIsProcessing(false);
  };

  const handleStopMerge = () => {
    abortControllerRef.current = true;
    setIsProcessing(false);
  };

  const canStart = Boolean(
    sourceFile &&
    config.sourceSheetName &&
    targetItems.length > 0 &&
    !isProcessing
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-['Vazirmatn',sans-serif]">
      
      {/* Top Header */}
      <Header
        onLoadDemo={handleLoadDemo}
        onReset={handleReset}
        hasData={Boolean(sourceFile || targetItems.length > 0)}
        isProcessing={isProcessing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Quick Intro Banner if empty state */}
        {!sourceFile && targetItems.length === 0 && (
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  راهنمای سریع: ادغام شیت در تمام فایل‌های اکسل
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  ۱. فایل اکسل الگو (مثلاً فایل حاوی شیت «مرداد») را انتخاب کنید.<br />
                  ۲. پوشه اصلی شامل صدها فایل اکسل را انتخاب کنید (تمام زیرپوشه‌ها خودکار اسکن می‌شوند).<br />
                  ۳. دکمه ادغام را بزنید و در پایان فایل فشرده ZIP را با همان ساختار پوشه‌ها دانلود کنید.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>مشاهده و تست با داده‌های نمونه (شیت مرداد)</span>
            </button>
          </div>
        )}

        {/* 2-Column Grid for Source & Target Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Source Sheet Selector (5 cols) */}
          <div className="lg:col-span-5">
            <SourceSheetSelector
              sourceFile={sourceFile}
              availableSheets={availableSheets}
              selectedSheetInfo={selectedSheetInfo}
              sourceWorkbook={sourceWorkbook}
              config={config}
              onSourceLoaded={handleSourceLoaded}
              onSheetChange={handleSheetChange}
              onConfigChange={setConfig}
              onOpenPreviewModal={(title, info) => setPreviewModal({
                isOpen: true,
                title,
                sheetInfo: info
              })}
              isProcessing={isProcessing}
            />
          </div>

          {/* Column 2: Target Folder & Files Selector (7 cols) */}
          <div className="lg:col-span-7">
            <TargetFolderSelector
              targetItems={targetItems}
              onAddItems={handleAddTargetItems}
              onRemoveItem={handleRemoveTargetItem}
              onClearAll={handleClearAllTargets}
              onInspectItem={(item) => setPreviewModal({
                isOpen: true,
                title: `مشاهده فایل: ${item.relativePath}`,
                targetItem: item
              })}
              onTestSingleItem={sourceWorkbook ? handleTestSingleItem : undefined}
              isProcessing={isProcessing}
            />
          </div>

        </div>

        {/* Step 3: Processing Action Dashboard */}
        <ProcessingSection
          isProcessing={isProcessing}
          progress={progress}
          canStart={canStart}
          onStartMerge={handleStartMerge}
          onStopMerge={handleStopMerge}
          totalFiles={targetItems.length}
          sourceSheetName={config.targetSheetName || config.sourceSheetName}
        />

        {/* Step 4: Export & Download Section */}
        <ExportSection
          targetItems={targetItems}
          sourceSheetName={config.targetSheetName || config.sourceSheetName}
        />

        {/* Offline & Privacy Assurance Banner */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong className="text-slate-900">حفظ کامل حریم خصوصی و امنیت داده‌ها:</strong> تمام فایل‌های اکسل و محاسبات به صورت ۱۰۰٪ محلی داخل مرورگر سیستم شما انجام می‌شوند و هیچ داده‌ای به هیچ سروری ارسال نمی‌شود.
            </span>
          </div>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            پشتیبانی کامل از زبان فارسی و راست‌به‌چپ (RTL)
          </span>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        ابزار پردازش دسته‌ای فایل‌های اکسل • کاملاً آفلاین و ایمن
      </footer>

      {/* Data Inspection Preview Modal */}
      <DataPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        sheetInfo={previewModal.sheetInfo}
        targetItem={previewModal.targetItem}
      />

    </div>
  );
}
