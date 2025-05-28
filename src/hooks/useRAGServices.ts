
import { useMemo } from 'react';
import {
  AgentSourceService,
  SourceChunkService,
  EmbeddingService,
  TrainingJobService,
  AuditService,
  GDPRService,
  EncryptionService,
  DataRetentionService
} from '@/services/rag';

// Custom hook to provide all RAG services
export const useRAGServices = () => {
  return useMemo(() => ({
    sources: AgentSourceService,
    chunks: SourceChunkService,
    embeddings: EmbeddingService,
    training: TrainingJobService,
    audit: AuditService,
    gdpr: GDPRService,
    encryption: EncryptionService,
    retention: DataRetentionService
  }), []);
};

export default useRAGServices;
