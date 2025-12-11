import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Default to 'light' if nothing in storage
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem("app_theme");
        return (stored === "dark" || stored === "light") ? stored : "light";
    });

    useEffect(() => {
        // Update DOM
        document.documentElement.setAttribute("data-theme", theme);
        // Persist
        localStorage.setItem("app_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
