
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobalDeduplicationService } from '@/services/rag/enhanced/globalDeduplication';

interface CompressionMetricsProps {
  customerId?: string;
}

const CompressionMetrics: React.FC<CompressionMetricsProps> = ({ customerId }) => {
  const [stats, setStats] = useState({
    totalChunks: 0,
    uniqueChunks: 0,
    duplicateReferences: 0,
    compressionRatio: 0,
    spaceSavedGB: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const globalStats = await GlobalDeduplicationService.getGlobalStats();
        setStats(globalStats);
      } catch (error) {
        console.error('Error loading compression stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [customerId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compression Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading compression statistics...</div>
        </CardContent>
      </Card>
    );
  }

  const deduplicationRate = stats.totalChunks > 0 
    ? ((stats.duplicateReferences / stats.totalChunks) * 100).toFixed(1)
    : '0';

  const compressionPercentage = ((1 - stats.compressionRatio) * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🗜️ Global Compression & Deduplication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.uniqueChunks.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Unique Chunks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalChunks.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total References</div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between">
              <span className="text-sm">Deduplication Rate:</span>
              <span className="font-semibold text-green-600">{deduplicationRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Compression Ratio:</span>
              <span className="font-semibold text-blue-600">{compressionPercentage}% smaller</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Space Saved:</span>
              <span className="font-semibold text-purple-600">{stats.spaceSavedGB.toFixed(2)} GB</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          💡 Global deduplication means identical content across all customers is stored only once,
          dramatically reducing storage requirements while maintaining data isolation.
        </div>
      </CardContent>
    </Card>
  );
};

export default CompressionMetrics;
