
export class ContentPreprocessor {
  static prepareContentForProcessing(source: any): string | null {
    let contentToProcess = source.content;
    
    if (source.source_type === 'qa') {
      const metadata = source.metadata as any;
      if (metadata?.question && metadata?.answer) {
        contentToProcess = `Q: ${metadata.question}\nA: ${metadata.answer}`;
        console.log(`🧩 Q&A content prepared: "${contentToProcess}" (${contentToProcess.length} chars)`);
      }
    }

    return contentToProcess;
  }

  static shouldSkipProcessing(contentToProcess: string | null): boolean {
    return !contentToProcess || contentToProcess.trim().length === 0;
  }
}
