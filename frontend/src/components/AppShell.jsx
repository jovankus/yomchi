import NavBar from './NavBar';

export default function AppShell({ children }) {
    return (
        <div className="min-h-screen bg-[var(--bg)]">
            <NavBar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
