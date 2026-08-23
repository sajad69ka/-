export interface SourceSheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  previewHeaders: string[];
  previewRows: (string | number | boolean | null)[][];
  file: File;
  sheetIndex: number;
  isRightToLeft?: boolean;
}

export type FileProcessStatus = 'pending' | 'processing' | 'success' | 'warning' | 'error' | 'skipped';

export interface TargetFileItem {
  id: string;
  file: File;
  name: string;
  relativePath: string;
  size: number;
  status: FileProcessStatus;
  existingSheets?: string[];
  originalSheetCount?: number;
  newSheetCount?: number;
  message?: string;
  errorDetail?: string;
  processedBlob?: Blob;
  processingTimeMs?: number;
}

export type CollisionStrategy = 'overwrite' | 'rename' | 'skip';
export type SheetPosition = 'end' | 'start' | 'specific_index';

export interface MergeConfig {
  sourceSheetName: string;
  targetSheetName: string;
  collisionStrategy: CollisionStrategy;
  sheetPosition: SheetPosition;
  positionIndex: number;
  copyFormatting: boolean;
  copyColumnWidths: boolean;
  copyRowHeights: boolean;
  copyMergedCells: boolean;
  preserveRTL: boolean;
  preserveFormulas: boolean;
  outputZipName: string;
}

export interface ProcessingProgress {
  total: number;
  completed: number;
  successful: number;
  warnings: number;
  errors: number;
  skipped: number;
  currentFileName: string;
  percent: number;
  startTime: number;
  elapsedMs: number;
  etaSeconds: number | null;
}
