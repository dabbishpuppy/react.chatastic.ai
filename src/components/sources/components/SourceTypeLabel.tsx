
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SourceType } from '@/types/rag';

interface SourceTypeLabelProps {
  type: SourceType;
}

const SourceTypeLabel: React.FC<SourceTypeLabelProps> = ({ type }) => {
  const getSourceTypeLabel = (type: SourceType) => {
    switch (type) {
      case 'text':
        return 'Text';
      case 'file':
        return 'File';
      case 'website':
        return 'Website';
      case 'qa':
        return 'Q&A';
      default:
        return type;
    }
  };

  return (
    <Badge variant="secondary">
      {getSourceTypeLabel(type)}
    </Badge>
  );
};

export default SourceTypeLabel;
