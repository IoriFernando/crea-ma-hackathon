declare module 'pdf-parse-fork' {
  interface PDFData {
    text: string
    numpages: number
    info: Record<string, any>
    metadata: Record<string, any>
    version: string
  }

  function pdf(buffer: Buffer, options?: Record<string, any>): Promise<PDFData>
  export default pdf
}