import { Component, type ReactNode } from 'react';
import { strings } from '../strings';

// R-NF-5: the learner never sees a stack. The error is logged for the parent area (M5).
export class ErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error(error);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="home">
        <section className="card step-feedback" role="alert">
          <p className="feedback-title">{strings.errorFallback}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onReset();
            }}
          >
            {strings.practice.next}
          </button>
        </section>
      </main>
    );
  }
}
