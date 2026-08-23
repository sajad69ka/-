import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { MergeConfig, SourceSheetInfo, TargetFileItem } from '../types';

/**
 * Reads an Excel file and extracts sheet metadata and a preview of rows.
 */
export async function inspectExcelFile(file: File): Promise<{
  sheets: string[];
  workbook: ExcelJS.Workbook;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  
  try {
    await workbook.xlsx.load(arrayBuffer);
  } catch (error) {
    // If standard xlsx loading fails (e.g. legacy .xls format or unusual encoding),
    // try reading via XLSX library and converting to clean XLSX buffer
    try {
      const xlsxWb = XLSX.read(arrayBuffer, { type: 'array' });
      const xlsxBuffer = XLSX.write(xlsxWb, { type: 'array', bookType: 'xlsx' });
      await workbook.xlsx.load(xlsxBuffer);
    } catch {
      throw new Error(`امکان خواندن فایل اکسل وجود ندارد: ${file.name}`);
    }
  }

  const sheets = workbook.worksheets.map(ws => ws.name);
  return { sheets, workbook };
}

/**
 * Extracts preview information for a specific worksheet.
 */
export async function getSheetPreview(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  file: File,
  maxRows: number = 10,
  maxCols: number = 15
): Promise<SourceSheetInfo> {
  const ws = workbook.getWorksheet(sheetName);
  if (!ws) {
    throw new Error(`شیت ${sheetName} یافت نشد.`);
  }

  const rowCount = ws.actualRowCount || ws.rowCount || 0;
  const columnCount = ws.actualColumnCount || ws.columnCount || 0;
  const isRightToLeft = ws.views?.some(v => v.rightToLeft) ?? false;

  const previewRows: (string | number | boolean | null)[][] = [];
  const previewHeaders: string[] = [];

  // Determine effective column count for preview
  const colLimit = Math.min(columnCount > 0 ? columnCount : 10, maxCols);

  for (let c = 1; c <= colLimit; c++) {
    const colHeader = ws.getColumn(c).letter || `ستون ${c}`;
    previewHeaders.push(colHeader);
  }

  // Iterate preview rows
  let rowsRead = 0;
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowsRead >= maxRows) return;
    const rowValues: (string | number | boolean | null)[] = [];
    
    for (let c = 1; c <= colLimit; c++) {
      const cell = row.getCell(c);
      let val = cell.value;

      if (val !== null && typeof val === 'object') {
        if ('result' in val) {
          val = (val as { result: string | number }).result;
        } else if ('richText' in val) {
          val = (val as { richText: Array<{ text: string }> }).richText.map(t => t.text).join('');
        } else if ('text' in val) {
          val = (val as { text: string }).text;
        } else if (val instanceof Date) {
          val = val.toLocaleDateString('fa-IR');
        } else {
          val = String(val);
        }
      }
      rowValues.push(val as string | number | boolean | null);
    }
    
    previewRows.push(rowValues);
    rowsRead++;
  });

  const sheetIndex = workbook.worksheets.findIndex(s => s.name === sheetName);

  return {
    name: sheetName,
    rowCount,
    columnCount,
    previewHeaders,
    previewRows,
    file,
    sheetIndex,
    isRightToLeft
  };
}

/**
 * Deep clones a source worksheet into a target workbook with rich formatting,
 * column widths, row heights, styles, formulas, and merged cells.
 */
export function cloneWorksheet(
  sourceWs: ExcelJS.Worksheet,
  targetWb: ExcelJS.Workbook,
  targetSheetName: string,
  config: MergeConfig
): ExcelJS.Worksheet {
  // Create new worksheet in target workbook
  const targetWs = targetWb.addWorksheet(targetSheetName);

  // 1. Copy sheet-level properties and views (RTL, gridlines, zoom)
  if (config.preserveRTL && sourceWs.views && sourceWs.views.length > 0) {
    targetWs.views = JSON.parse(JSON.stringify(sourceWs.views));
  } else if (config.preserveRTL) {
    targetWs.views = [{ rightToLeft: true }];
  }

  if (sourceWs.properties) {
    targetWs.properties = {
      ...JSON.parse(JSON.stringify(sourceWs.properties))
    };
  }

  if (sourceWs.pageSetup) {
    targetWs.pageSetup = JSON.parse(JSON.stringify(sourceWs.pageSetup));
  }

  // 2. Copy Column Properties & Widths
  if (config.copyColumnWidths && sourceWs.columns) {
    sourceWs.columns.forEach((col, idx) => {
      if (!col) return;
      const targetCol = targetWs.getColumn(idx + 1);
      if (col.width !== undefined) {
        targetCol.width = col.width;
      }
      if (col.hidden !== undefined) {
        targetCol.hidden = col.hidden;
      }
      if (config.copyFormatting && col.style) {
        try {
          targetCol.style = JSON.parse(JSON.stringify(col.style));
        } catch {
          // ignore styling serialization fallback
        }
      }
    });
  }

  // 3. Copy Rows and Cells
  sourceWs.eachRow({ includeEmpty: true }, (sourceRow, rowNumber) => {
    const targetRow = targetWs.getRow(rowNumber);

    if (config.copyRowHeights && sourceRow.height !== undefined) {
      targetRow.height = sourceRow.height;
    }
    if (sourceRow.hidden !== undefined) {
      targetRow.hidden = sourceRow.hidden;
    }

    sourceRow.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);

      // Copy Value / Formula
      if (sourceCell.type === ExcelJS.ValueType.Formula && config.preserveFormulas) {
        targetCell.value = {
          formula: sourceCell.formula,
          result: sourceCell.result
        };
      } else if (sourceCell.type === ExcelJS.ValueType.SharedString || sourceCell.type === ExcelJS.ValueType.String) {
        targetCell.value = sourceCell.text || sourceCell.value;
      } else {
        targetCell.value = sourceCell.value;
      }

      // Copy Styles (Fonts, Fills, Borders, Alignment, Number Formats)
      if (config.copyFormatting) {
        if (sourceCell.font) {
          targetCell.font = JSON.parse(JSON.stringify(sourceCell.font));
        }
        if (sourceCell.fill) {
          targetCell.fill = JSON.parse(JSON.stringify(sourceCell.fill));
        }
        if (sourceCell.border) {
          targetCell.border = JSON.parse(JSON.stringify(sourceCell.border));
        }
        if (sourceCell.alignment) {
          targetCell.alignment = JSON.parse(JSON.stringify(sourceCell.alignment));
        }
        if (sourceCell.numFmt) {
          targetCell.numFmt = sourceCell.numFmt;
        }
        if (sourceCell.protection) {
          targetCell.protection = JSON.parse(JSON.stringify(sourceCell.protection));
        }
      }
    });

    targetRow.commit();
  });

  // 4. Copy Merged Cells
  if (config.copyMergedCells) {
    // Model merges extraction
    // ExcelJS stores merges in worksheet.model.merges or internally
    const merges = (sourceWs.model as { merges?: string[] })?.merges || [];
    for (const mergeRange of merges) {
      try {
        targetWs.mergeCells(mergeRange);
      } catch {
        // Skip invalid or overlapping merges safely
      }
    }
  }

  // 5. Position Management (start, end, specific_index)
  if (config.sheetPosition === 'start') {
    // Reorder worksheets so the new sheet is first
    const wsArray = targetWb.worksheets;
    const newWsIndex = wsArray.findIndex(w => w.id === targetWs.id);
    if (newWsIndex > 0) {
      wsArray.splice(newWsIndex, 1);
      wsArray.unshift(targetWs);
    }
  } else if (config.sheetPosition === 'specific_index' && config.positionIndex >= 1) {
    const wsArray = targetWb.worksheets;
    const newWsIndex = wsArray.findIndex(w => w.id === targetWs.id);
    if (newWsIndex !== -1) {
      wsArray.splice(newWsIndex, 1);
      const insertAt = Math.max(0, Math.min(config.positionIndex - 1, wsArray.length));
      wsArray.splice(insertAt, 0, targetWs);
    }
  }

  return targetWs;
}

/**
 * Resolves sheet name collision according to chosen strategy.
 */
function resolveSheetName(
  existingSheets: string[],
  desiredName: string,
  strategy: 'overwrite' | 'rename' | 'skip'
): { finalName: string; shouldSkip: boolean; shouldDeleteExisting: boolean } {
  const exists = existingSheets.some(s => s.toLowerCase() === desiredName.toLowerCase());

  if (!exists) {
    return { finalName: desiredName, shouldSkip: false, shouldDeleteExisting: false };
  }

  if (strategy === 'skip') {
    return { finalName: desiredName, shouldSkip: true, shouldDeleteExisting: false };
  }

  if (strategy === 'overwrite') {
    return { finalName: desiredName, shouldSkip: false, shouldDeleteExisting: true };
  }

  // Strategy: 'rename'
  let counter = 1;
  let candidate = `${desiredName}_${counter}`;
  while (existingSheets.some(s => s.toLowerCase() === candidate.toLowerCase())) {
    counter++;
    candidate = `${desiredName}_${counter}`;
  }

  return { finalName: candidate, shouldSkip: false, shouldDeleteExisting: false };
}

/**
 * Processes a single target Excel file: loads workbook, injects source sheet, exports modified blob.
 */
export async function processSingleFile(
  item: TargetFileItem,
  sourceWorkbook: ExcelJS.Workbook,
  sourceSheetName: string,
  config: MergeConfig
): Promise<TargetFileItem> {
  const startTime = performance.now();
  const updatedItem: TargetFileItem = { ...item, status: 'processing' };

  try {
    const sourceWs = sourceWorkbook.getWorksheet(sourceSheetName);
    if (!sourceWs) {
      throw new Error(`شیت مبدا "${sourceSheetName}" در فایل مبدا یافت نشد.`);
    }

    const arrayBuffer = await item.file.arrayBuffer();
    const targetWb = new ExcelJS.Workbook();

    try {
      await targetWb.xlsx.load(arrayBuffer);
    } catch {
      // Fallback for .xls
      const xlsxWb = XLSX.read(arrayBuffer, { type: 'array' });
      const xlsxBuffer = XLSX.write(xlsxWb, { type: 'array', bookType: 'xlsx' });
      await targetWb.xlsx.load(xlsxBuffer);
    }

    const existingSheetNames = targetWb.worksheets.map(ws => ws.name);
    updatedItem.existingSheets = existingSheetNames;
    updatedItem.originalSheetCount = existingSheetNames.length;

    const targetSheetTitle = (config.targetSheetName && config.targetSheetName.trim()) 
      ? config.targetSheetName.trim() 
      : sourceSheetName;

    const { finalName, shouldSkip, shouldDeleteExisting } = resolveSheetName(
      existingSheetNames,
      targetSheetTitle,
      config.collisionStrategy
    );

    if (shouldSkip) {
      updatedItem.status = 'skipped';
      updatedItem.message = `فایل حاوی شیت "${targetSheetTitle}" بود و طبق تنظیمات رد شد.`;
      updatedItem.processingTimeMs = Math.round(performance.now() - startTime);
      return updatedItem;
    }

    if (shouldDeleteExisting) {
      // Delete existing sheet first
      const existingWs = targetWb.getWorksheet(targetSheetTitle);
      if (existingWs) {
        targetWb.removeWorksheet(existingWs.id);
      }
    }

    // Deep clone source sheet to target workbook
    cloneWorksheet(sourceWs, targetWb, finalName, config);

    // Generate output XLSX buffer
    const outputBuffer = await targetWb.xlsx.writeBuffer();
    const processedBlob = new Blob([outputBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    updatedItem.status = shouldDeleteExisting ? 'warning' : 'success';
    updatedItem.newSheetCount = targetWb.worksheets.length;
    updatedItem.processedBlob = processedBlob;
    updatedItem.processingTimeMs = Math.round(performance.now() - startTime);
    updatedItem.message = shouldDeleteExisting
      ? `شیت "${finalName}" جایگزین شیت قبلی شد (${updatedItem.newSheetCount} شیت).`
      : `شیت "${finalName}" با موفقیت اضافه شد (${updatedItem.newSheetCount} شیت).`;

    return updatedItem;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'خطای نامشخص در پردازش فایل';
    updatedItem.status = 'error';
    updatedItem.errorDetail = errMessage;
    updatedItem.message = `خطا: ${errMessage}`;
    updatedItem.processingTimeMs = Math.round(performance.now() - startTime);
    return updatedItem;
  }
}
