"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {Theme} from "react-daisyui";

const ThemeContext = createContext<undefined | {
    theme: string;
    setTheme: (theme: string) => void;
}>(undefined);

export default function ThemeProvider({children}: {
    children: ReactNode;
}) {

    const [theme, setTheme] = useState("retro");

    const customSetTheme = (theme: string) => {
        document.querySelector("html")?.setAttribute("data-theme", theme);
        localStorage.setItem("theme", theme);
        setTheme(theme);
    }

    useEffect(() => {
        const theme = localStorage.getItem("theme");
        if (theme !== null) setTheme(theme);
    }, []);

    return (
        <ThemeContext.Provider value={{theme, setTheme: customSetTheme}}>
            <Theme dataTheme={theme}>
                {children}
            </Theme>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) throw new Error("ThemeContext provider not found.");
    return context;
}