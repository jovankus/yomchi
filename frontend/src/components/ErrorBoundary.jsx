import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        <span style={{ fontSize: '2rem' }}>⚠️</span>
                    </div>

                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: '#991b1b',
                        marginBottom: '0.5rem'
                    }}>
                        Something went wrong
                    </h2>

                    <p style={{
                        color: 'var(--text-secondary)',
                        marginBottom: '1.5rem',
                        maxWidth: '400px'
                    }}>
                        An error occurred while loading this page. Please try again or navigate to a different page.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={this.handleRetry}
                            className="btn-primary"
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            🔄 Try Again
                        </button>
                        <button
                            onClick={() => window.history.back()}
                            className="btn-secondary"
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            ← Go Back
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="btn-secondary"
                            style={{ padding: '0.75rem 1.5rem' }}
                        >
                            🏠 Dashboard
                        </button>
                    </div>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{
                            marginTop: '2rem',
                            textAlign: 'left',
                            width: '100%',
                            maxWidth: '600px'
                        }}>
                            <summary style={{
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                fontSize: '0.875rem',
                                marginBottom: '0.5rem'
                            }}>
                                Error Details (Development Only)
                            </summary>
                            <pre style={{
                                backgroundColor: '#1f2937',
                                color: '#f3f4f6',
                                padding: '1rem',
                                borderRadius: '8px',
                                overflow: 'auto',
                                fontSize: '0.75rem',
                                lineHeight: '1.4'
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
