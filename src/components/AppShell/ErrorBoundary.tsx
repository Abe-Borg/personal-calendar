import { Component, type PropsWithChildren } from 'react';
import styles from './AppShell.module.css';

interface State {
  error: Error | null;
}

/**
 * A render throw unmounts the whole React root, leaving a blank page that
 * navigating away does not recover. This keeps a bad view from taking the app
 * down permanently.
 */
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private recover = () => {
    window.location.hash = '#/calendar';
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className={styles.fatal} role="alert">
        <h1>That view could not be displayed</h1>
        <p>Your data is fine — this is a display problem, nothing was changed or lost.</p>
        <p className={styles.fatalDetail}>{error.message}</p>
        <button type="button" className={styles.recoverBtn} onClick={this.recover}>
          Back to this month
        </button>
      </div>
    );
  }
}
