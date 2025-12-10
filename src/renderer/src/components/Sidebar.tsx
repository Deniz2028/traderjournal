import React from "react";



import { Link, useLocation } from "wouter";

export const Sidebar: React.FC = () => {
    const [location] = useLocation();

    // Helper to determine if active
    const isActive = (path: string) => {
        if (path === "/" || path === "/dashboard") {
            return location === "/" || location === "/dashboard";
        }
        return location.startsWith(path);
    };

    const [animateNews, setAnimateNews] = React.useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setAnimateNews(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={styles.sidebar}>
            <style>{`
                @keyframes newsPulse {
                    0% { color: var(--text-secondary); transform: scale(1); }
                    50% { color: #EF4444; font-weight: 700; background-color: #FEF2F2; transform: scale(1.02); }
                    100% { color: var(--text-secondary); transform: scale(1); }
                }
            `}</style>
            <div style={styles.logoArea}>
                <h2 style={styles.logoText}>Trade Journal</h2>
            </div>

            {/* Top menu items */}
            <nav style={styles.nav}>
                <Link href="/dashboard" style={{ ...styles.navItem, ...(isActive("/dashboard") ? styles.navItemActive : {}) }}>
                    Dashboard
                </Link>
                <Link href="/morning" style={{ ...styles.navItem, ...(isActive("/morning") ? styles.navItemActive : {}) }}>
                    Morning Analysis
                </Link>
                <Link href="/today" style={{ ...styles.navItem, ...(isActive("/today") ? styles.navItemActive : {}) }}>
                    Today
                </Link>
                <Link href="/calendar" style={{ ...styles.navItem, ...(isActive("/calendar") ? styles.navItemActive : {}) }}>
                    Calendar
                </Link>
                <Link href="/news" style={{
                    ...styles.navItem,
                    ...(isActive("/news") ? styles.navItemActive : {}),
                    ...(animateNews && !isActive("/news") ? { animation: "newsPulse 1s ease-in-out infinite" } : {})
                }}>
                    News
                </Link>
            </nav>

            {/* Spacer pushes Settings to the very bottom */}
            <div style={{ flexGrow: 1 }} />

            {/* Settings at bottom */}
            <nav style={styles.navBottom}>
                <Link href="/settings" style={{ ...styles.navItem, ...(isActive("/settings") ? styles.navItemActive : {}) }}>
                    Settings
                </Link>
            </nav>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: "var(--sidebar-width)",
        height: "100%",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
    },
    logoArea: {
        padding: "24px",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "16px",
    },
    logoText: {
        fontSize: 18,
        fontWeight: 700,
        color: "var(--text-primary)",
    },
    nav: {
        display: "flex",
        flexDirection: "column",
        padding: "0 12px",
        gap: 4,
    },
    navBottom: {
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        borderTop: "1px solid var(--border-subtle)",
    },
    navItem: {
        textAlign: "left",
        padding: "10px 16px",
        borderRadius: 8,
        backgroundColor: "transparent",
        color: "var(--text-secondary)",
        fontSize: 14,
        fontWeight: 500,
        transition: "all 0.2s ease",
    },
    navItemActive: {
        backgroundColor: "#F3F4F6",
        color: "var(--text-primary)",
        fontWeight: 600,
    },
};
