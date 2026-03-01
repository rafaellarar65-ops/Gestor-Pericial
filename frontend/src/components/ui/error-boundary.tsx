import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AppRenderError } from '@/components/ui/app-error';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: unknown;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    console.error('Unhandled render error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <AppRenderError error={this.state.error} />;
    }

    return this.props.children;
  }
}
