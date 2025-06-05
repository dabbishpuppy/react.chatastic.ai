
import { SequentialProcessingService } from '../enhanced/sequentialProcessingService';
import { DatabaseSource } from '../types/retrainingTypes';

export class SourceProcessor {
  static async processSource(source: DatabaseSource): Promise<boolean> {
    console.log(`🔄 Processing source: ${source.title} (${source.source_type})`);

    try {
      // Determine content to process
      let content = '';
      
      if (source.source_type === 'qa') {
        const metadata = source.metadata as any;
        if (metadata?.question && metadata?.answer) {
          content = `Question: ${metadata.question}\n\nAnswer: ${metadata.answer}`;
        } else if (source.content) {
          content = source.content;
        } else {
          throw new Error('Q&A source has no question/answer or content');
        }
      } else {
        content = source.content || '';
      }

      if (!content || content.trim().length === 0) {
        throw new Error('Source has no content to process');
      }

      // Use sequential processing to avoid race conditions
      const result = await SequentialProcessingService.processSourceSequentially(
        source.id,
        content,
        {
          source_type: source.source_type,
          source_title: source.title,
          processing_method: 'retraining_sequential',
          ...source.metadata
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Sequential processing failed');
      }

      console.log(`✅ Successfully processed source ${source.title}: ${result.chunksCreated} chunks, ${result.embeddingsGenerated} embeddings`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to process source ${source.title}:`, error);
      throw error;
    }
  }
}
