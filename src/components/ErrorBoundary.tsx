import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

/** Catches render errors so users see a friendly recovery screen, never a stack trace. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('APBites error', err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft"><AlertCircle className="h-12 w-12" /></div>
        <h1 className="mt-5 font-display text-[23px] font-bold">Something went wrong</h1>
        <p className="mt-1.5 max-w-xs text-[14px] text-ink-muted">This screen hit an unexpected problem. Your cart and orders are saved.</p>
        <button className="mt-6 h-[54px] rounded-btn bg-brand px-8 font-display font-semibold" onClick={() => { this.setState({ failed: false }); window.location.assign('/home'); }}>
          Back to Home
        </button>
      </div>
    );
  }
}
