
import React from 'react';
import { FileText, Link, MessageCircleQuestion, File } from 'lucide-react';
import { SourceType } from '@/types/rag';

interface SourceIconProps {
  type: SourceType;
}

const SourceIcon: React.FC<SourceIconProps> = ({ type }) => {
  switch (type) {
    case 'text':
      return <FileText size={16} className="text-blue-600" />;
    case 'file':
      return <File size={16} className="text-green-600" />;
    case 'website':
      return <Link size={16} className="text-purple-600" />;
    case 'qa':
      return <MessageCircleQuestion size={16} className="text-orange-600" />;
    default:
      return <FileText size={16} className="text-gray-600" />;
  }
};

export default SourceIcon;
