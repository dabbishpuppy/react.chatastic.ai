
import React from 'react';

interface CompressionStats {
  totalContentSize: number;
  avgCompressionRatio: number;
  totalUniqueChunks: number;
  totalDuplicateChunks: number;
}

interface CompressionStatsDisplayProps {
  compressionStats: CompressionStats;
}

const CompressionStatsDisplay: React.FC<CompressionStatsDisplayProps> = ({ compressionStats }) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <h4 className="font-semibold text-blue-900 mb-2">Compression Stats</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-blue-700">Avg Compression:</span>
          <span className="ml-1 font-medium">{(compressionStats.avgCompressionRatio || 0).toFixed(2)}x</span>
        </div>
        <div>
          <span className="text-blue-700">Unique Chunks:</span>
          <span className="ml-1 font-medium">{compressionStats.totalUniqueChunks}</span>
        </div>
        <div>
          <span className="text-blue-700">Duplicates Found:</span>
          <span className="ml-1 font-medium">{compressionStats.totalDuplicateChunks}</span>
        </div>
        <div>
          <span className="text-blue-700">Total Size:</span>
          <span className="ml-1 font-medium">{Math.round(compressionStats.totalContentSize / 1024)}KB</span>
        </div>
      </div>
    </div>
  );
};

export default CompressionStatsDisplay;
