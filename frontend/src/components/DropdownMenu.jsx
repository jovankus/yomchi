import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function DropdownLink({ to, children, onClick }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`block px-4 py-2 text-sm transition-all rounded-md mx-1 ${isActive
                    ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                    : 'text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary'
                }`}
        >
            {children}
        </Link>
    );
}

export default function DropdownMenu({ label, basePath, children }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const timeoutRef = useRef(null);
    const location = useLocation();

    // Check if current route matches any child route
    const isActive = location.pathname.startsWith(basePath);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300);
    };

    const handleLinkClick = () => {
        setIsOpen(false);
    };

    return (
        <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 inline-flex items-center gap-1 relative ${isActive
                        ? 'bg-primary text-[var(--primary-contrast)] shadow-sm shadow-primary/20'
                        : 'text-[var(--text)] hover:bg-[var(--panel-hover)] hover:text-primary'
                    }`}
            >
                {label}
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-[var(--ring)] rounded-full" />
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-[var(--panel)] rounded-lg shadow-2xl border border-[var(--border)] py-1 z-50 animate-fade-in">
                    {children &&
                        (Array.isArray(children)
                            ? children.map((child, index) => (
                                <div key={index}>
                                    {child.type === DropdownLink
                                        ? { ...child, props: { ...child.props, onClick: handleLinkClick } }
                                        : child}
                                </div>
                            ))
                            : children.type === DropdownLink
                                ? { ...children, props: { ...children.props, onClick: handleLinkClick } }
                                : children
                        )
                    }
                </div>
            )}
        </div>
    );
}

export { DropdownLink };
