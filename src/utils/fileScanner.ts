import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { TargetFileItem } from '../types';

/**
 * Checks if a file has an Excel extension (.xlsx, .xls, .xlsm).
 */
export function isExcelFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.xlsm')) &&
    !filename.startsWith('~$') && // Ignore Excel temp/lock files
    !filename.startsWith('._') // Ignore macOS hidden resource fork files
  );
}

/**
 * Recursively scans FileSystemEntries from a Drag & Drop event.
 */
export async function scanFileSystemEntries(items: DataTransferItemList): Promise<{ file: File; relativePath: string }[]> {
  const result: { file: File; relativePath: string }[] = [];

  const traverseEntry = async (entry: FileSystemEntry, currentPath: string = ''): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      await new Promise<void>((resolve) => {
        fileEntry.file((file) => {
          if (isExcelFile(file.name)) {
            const relPath = currentPath ? `${currentPath}/${file.name}` : file.name;
            result.push({ file, relativePath: relPath });
          }
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();
      const nextPath = currentPath ? `${currentPath}/${dirEntry.name}` : dirEntry.name;

      const readEntries = async (): Promise<FileSystemEntry[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries((entries) => resolve(entries), () => resolve([]));
        });
      };

      let entries: FileSystemEntry[];
      do {
        entries = await readEntries();
        for (const childEntry of entries) {
          await traverseEntry(childEntry, nextPath);
        }
      } while (entries.length > 0);
    }
  };

  const queue: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        queue.push(traverseEntry(entry));
      }
    }
  }

  await Promise.all(queue);
  return result;
}

/**
 * Converts FileList from `<input type="file" webkitdirectory>` into structured TargetFileItem array.
 */
export function extractFilesFromInput(fileList: FileList): TargetFileItem[] {
  const items: TargetFileItem[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (!isExcelFile(file.name)) continue;

    // webkitRelativePath contains the full nested path like "MyFolder/Subfolder/report.xlsx"
    const relativePath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;

    items.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      name: file.name,
      relativePath,
      size: file.size,
      status: 'pending'
    });
  }

  return items;
}

/**
 * Packages all processed files into a single ZIP archive preserving relative directory paths.
 */
export async function createProcessedZip(
  items: TargetFileItem[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  let count = 0;
  for (const item of items) {
    if (item.processedBlob) {
      zip.file(item.relativePath, item.processedBlob);
    } else if (item.file) {
      // If skipped or unchanged, include original file
      zip.file(item.relativePath, item.file);
    }
    count++;
    if (onProgress) {
      onProgress(Math.round((count / items.length) * 100));
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Generates sample demo dataset in-memory:
 * - 1 Source Excel file containing a styled "مرداد" sheet with Persian data and formulas.
 * - 4 Target Excel files inside nested folders ("شعبه_شمال", "شعبه_جنوب", "شعبه_مرکز", "بخش_اداری")
 */
export async function generateDemoDataset(): Promise<{
  sourceFile: File;
  sourceSheetName: string;
  targetItems: TargetFileItem[];
}> {
  // 1. Create Source Workbook with "مرداد" sheet
  const sourceWb = new ExcelJS.Workbook();
  const mordadWs = sourceWb.addWorksheet('مرداد', {
    views: [{ rightToLeft: true, state: 'normal' }]
  });

  // Source Columns
  mordadWs.columns = [
    { header: 'کد کالا', key: 'code', width: 14 },
    { header: 'نام کالا / شرح عملکرد', key: 'name', width: 26 },
    { header: 'تعداد فروش (مرداد)', key: 'qty', width: 18 },
    { header: 'مبلغ واحد (تومان)', key: 'price', width: 20 },
    { header: 'مجموع فروش (تومان)', key: 'total', width: 22 }
  ];

  // Header styling
  const headerRow = mordadWs.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Vazirmatn', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } }; // Emerald / Teal
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } }
    };
  });

  // Sample Rows
  const sampleItems = [
    ['PRD-101', 'لپ‌تاپ گیمینگ ایسوس', 14, 48500000],
    ['PRD-102', 'مانیتور ۲۷ اینچ دل', 29, 12800000],
    ['PRD-103', 'ماوس بی‌سیم لاجیتک', 85, 1450000],
    ['PRD-104', 'کیبورد مکانیکال ردراگون', 42, 3200000],
    ['PRD-105', 'هدفون نویزکنسلینگ سونی', 18, 16900000],
    ['PRD-106', 'هارد اکسترنال ۲ ترابایت', 64, 4900000]
  ];

  sampleItems.forEach((item, index) => {
    const rowIdx = index + 2;
    const row = mordadWs.addRow([
      item[0],
      item[1],
      item[2],
      item[3],
      { formula: `C${rowIdx}*D${rowIdx}` } // Formula preserved!
    ]);

    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Vazirmatn', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 ? 'right' : 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (colNumber === 4 || colNumber === 5) {
        cell.numFmt = '#,##0';
      }
      if (rowIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  const sourceBuffer = await sourceWb.xlsx.writeBuffer();
  const sourceFile = new File([sourceBuffer], 'شیت_الگو_مرداد_۱۴۰۳.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // 2. Create Target Files with nested relative paths
  const targetSpecs = [
    { path: 'گزارشات_۱۴۰۳/شعبه_شمال/فروش_فصلی_شعبه_شمال.xlsx', sheets: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر'] },
    { path: 'گزارشات_۱۴۰۳/شعبه_جنوب/گزارش_جامع_فروش_جنوب.xlsx', sheets: ['فصل_بهار', 'تیر'] },
    { path: 'گزارشات_۱۴۰۳/شعبه_مرکز/حسابداری_مرکزی.xlsx', sheets: ['تراز_مالی', 'تیر'] },
    { path: 'گزارشات_۱۴۰۳/بخش_اداری/انبارداری_و_لجستیک.xlsx', sheets: ['موجودی_کالا', 'تیر'] },
    { path: 'گزارشات_۱۴۰۳/شعبه_غرب/گزارش_عملکرد_غرب.xlsx', sheets: ['فروش_بهاره'] }
  ];

  const targetItems: TargetFileItem[] = [];

  for (const spec of targetSpecs) {
    const wb = new ExcelJS.Workbook();
    for (const sName of spec.sheets) {
      const ws = wb.addWorksheet(sName, { views: [{ rightToLeft: true }] });
      ws.addRow(['کد', 'شرح', 'وضعیت', 'تاریخ']);
      ws.addRow(['TRX-001', 'ثبت عملیات دوره گذشته', 'تایید شده', '1403/04/15']);
      ws.addRow(['TRX-002', 'تسویه حساب درون‌سازمانی', 'در انتظار', '1403/04/28']);
    }

    const buf = await wb.xlsx.writeBuffer();
    const fileName = spec.path.split('/').pop() || 'file.xlsx';
    const f = new File([buf], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    targetItems.push({
      id: `demo-${Math.random().toString(36).substring(2, 9)}`,
      file: f,
      name: fileName,
      relativePath: spec.path,
      size: f.size,
      status: 'pending',
      existingSheets: spec.sheets,
      originalSheetCount: spec.sheets.length
    });
  }

  return {
    sourceFile,
    sourceSheetName: 'مرداد',
    targetItems
  };
}

/**
 * Format bytes into human readable format (KB, MB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
