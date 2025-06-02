
import React from 'react';
import { RAGSystemTestRunner } from '@/components/testing/RAGSystemTestRunner';

export const SystemTestingPage = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Integration Testing</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive testing suite for the refactored RAG orchestration services
        </p>
      </div>
      
      <RAGSystemTestRunner />
    </div>
  );
};

export default SystemTestingPage;
