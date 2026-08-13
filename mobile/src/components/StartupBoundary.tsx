import React from 'react';
import { StartupErrorScreen } from './StartupErrorScreen';
import { describeRuntimeError, type StartupIssue } from '@/lib/startup-checks';
import { captureStartupError } from '@/lib/monitoring';

interface Props {
  children: React.ReactNode;
}

interface State {
  issue: StartupIssue | null;
}

// Attrape toute erreur de rendu au démarrage et affiche une cause lisible
// au lieu d'un flash blanc suivi d'un crash natif.
export class StartupBoundary extends React.Component<Props, State> {
  override state: State = { issue: null };

  static getDerivedStateFromError(error: unknown): State {
    return { issue: describeRuntimeError(error) };
  }

  override componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[startup]', error);
    captureStartupError(error, 'react-startup-boundary', {
      componentStack: info.componentStack ?? 'unavailable',
    });
  }

  override render() {
    if (this.state.issue) {
      return (
        <StartupErrorScreen
          issue={this.state.issue}
          onRetry={() => this.setState({ issue: null })}
        />
      );
    }
    return this.props.children;
  }
}
