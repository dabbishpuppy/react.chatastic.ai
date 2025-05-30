
import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error, tabName?: string}>;
  tabName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

const DefaultErrorFallback: React.FC<{error: Error, tabName?: string}> = ({ error, tabName }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-red-800 font-medium mb-2">
      {tabName ? `Error loading ${tabName} tab` : 'Something went wrong'}
    </h3>
    <p className="text-red-600 text-sm mb-3">{error.message}</p>
    <button 
      onClick={() => window.location.reload()} 
      className="text-red-700 underline text-sm"
    >
      Try refreshing the page
    </button>
  </div>
);

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`❌ ErrorBoundary caught error in ${this.props.tabName || 'component'}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} tabName={this.props.tabName} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
