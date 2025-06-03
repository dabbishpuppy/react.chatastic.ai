
export class ChunkingOptionsProvider {
  static getChunkingOptionsForSourceType(sourceType: string) {
    switch (sourceType) {
      case 'qa':
        return {
          targetChunkSize: 200,
          maxChunkSize: 400,
          minChunkSize: 10, // Lowered from 50 to handle very short Q&A pairs
          contentType: sourceType
        };
      case 'text':
        return {
          targetChunkSize: 500,
          maxChunkSize: 1000,
          minChunkSize: 100,
          contentType: sourceType
        };
      case 'file':
        return {
          targetChunkSize: 600,
          maxChunkSize: 1200,
          minChunkSize: 150,
          contentType: sourceType
        };
      case 'website':
        return {
          targetChunkSize: 400,
          maxChunkSize: 800,
          minChunkSize: 100,
          contentType: sourceType
        };
      default:
        return {
          targetChunkSize: 500,
          maxChunkSize: 1000,
          minChunkSize: 100,
          contentType: sourceType
        };
    }
  }
}
