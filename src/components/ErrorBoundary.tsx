import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    let errorDetails = '';
    try {
      // Check if it's a Firestore JSON error
      if (error.message.startsWith('{') && error.message.endsWith('}')) {
        const parsed = JSON.parse(error.message);
        errorDetails = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Not a JSON error
    }

    this.setState({
      errorInfo: errorDetails || error.stack || null
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
          <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8 border border-red-500/20">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              We encountered an unexpected error. This might be due to a connection issue or a temporary problem with our services.
            </p>

            {this.state.error && (
              <div className="bg-zinc-950 rounded-xl p-6 border border-zinc-800 mb-8 overflow-auto max-h-64">
                <p className="text-red-400 font-mono text-sm mb-2 font-bold">Error Details:</p>
                <pre className="text-zinc-500 font-mono text-xs whitespace-pre-wrap">
                  {this.state.errorInfo || this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-95"
              >
                <RefreshCw size={20} />
                Try Again
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-3 bg-zinc-800 text-white py-4 rounded-2xl font-bold hover:bg-zinc-700 transition-all active:scale-95 border border-zinc-700"
              >
                <Home size={20} />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
