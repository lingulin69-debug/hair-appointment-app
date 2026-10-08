import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React render error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="force-serif flex min-h-screen items-center justify-center bg-[#EBE6DC] p-6 text-[#4A3B32]">
          <div className="w-full max-w-lg rounded-[32px] border border-[#D8C9B5] bg-[#FCFAF5] p-8 text-center shadow-[0_20px_46px_rgba(74,59,50,0.08)]">
            <div className="text-xs font-bold tracking-[0.34em] text-[#8C7A6B]">
              系統保護
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">
              畫面發生錯誤，請重新整理
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#7A6B5D]">
              系統在渲染畫面時發生例外，重新整理後通常可以恢復；如果問題持續發生，請再檢查 Firebase
              與資料格式。
            </p>
            {this.state.errorMessage && (
              <details className="mt-4 text-left text-xs text-[#7A6B5D]">
                <summary className="cursor-pointer font-bold">錯誤資訊</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[#F8F2E8] p-3 font-mono">
                  {this.state.errorMessage}
                </pre>
              </details>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[#4A3B32] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#5D4A3F]"
            >
              重新整理
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
