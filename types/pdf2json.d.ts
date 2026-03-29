declare module "pdf2json" {
  class PDFParser {
    constructor(context?: any, verbosity?: number)
    on(event: "pdfParser_dataReady", callback: () => void): void
    on(event: "pdfParser_dataError", callback: (err: { parserError: Error }) => void): void
    parseBuffer(buffer: Buffer): void
    getRawTextContent(): string
  }
  export = PDFParser
}