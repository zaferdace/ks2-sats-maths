import { Component, type ErrorInfo, type ReactNode } from 'react';
import { saveBackupFile } from './backup';

interface Props {
  children: ReactNode;
  /** A change (e.g. the screen) clears the error and tries again. */
  resetKey?: unknown;
  /** Leaves the broken screen. Without it the page is reloaded. */
  onHome?: () => void;
  /** The whole store as JSON, so a backup can still be saved. */
  backup?: () => string;
}

interface State {
  error: Error | null;
  resetKey: unknown;
}

/** Catches a screen that fails to draw, so the app never stays blank and results can still be saved. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Screen failed to draw', error, info.componentStack);
  }

  private home = () => {
    this.setState({ error: null });
    if (this.props.onHome) this.props.onHome();
    else window.location.reload();
  };

  private save = () => {
    const json = this.props.backup?.();
    if (json) void saveBackupFile(json);
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="page narrow" role="alert">
        <section className="card">
          <h1>Something went wrong</h1>
          <p>This screen could not be shown. Your saved answers are safe.</p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={this.home}>
              {this.props.onHome ? 'Go to Home' : 'Start again'}
            </button>
            {this.props.backup && (
              <button type="button" className="btn" onClick={this.save}>
                Save a backup
              </button>
            )}
          </div>
          <details>
            <summary className="muted small">Details for a grown-up</summary>
            <pre className="error-details">{String(error.stack ?? error)}</pre>
          </details>
        </section>
      </div>
    );
  }
}
