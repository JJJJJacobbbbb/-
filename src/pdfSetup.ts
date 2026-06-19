// Must be imported BEFORE pdfjs-dist to enable fake worker mode in Electron
// @ts-ignore - no type declarations for worker module
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs'
;(globalThis as any).pdfjsWorker = pdfjsWorker
