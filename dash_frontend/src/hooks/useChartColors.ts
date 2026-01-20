import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Hook to get chart colors from CSS variables.
 * Re-reads variables when theme changes.
 */
export function useChartColors() {
    const { theme } = useTheme();
    const [colors, setColors] = useState<string[]>([]);

    useEffect(() => {
        // Small delay to ensure CSS variables are applied after theme change
        const timer = setTimeout(() => {
            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);

            const chartColors = [
                computedStyle.getPropertyValue("--chart-1").trim() || "#4CAF50",
                computedStyle.getPropertyValue("--chart-2").trim() || "#2196F3",
                computedStyle.getPropertyValue("--chart-3").trim() || "#FFC107",
                computedStyle.getPropertyValue("--chart-4").trim() || "#FF5722",
                computedStyle.getPropertyValue("--chart-5").trim() || "#9C27B0",
                computedStyle.getPropertyValue("--chart-6").trim() || "#E91E63",
                computedStyle.getPropertyValue("--chart-7").trim() || "#00BCD4",
            ];

            setColors(chartColors);
        }, 50);

        return () => clearTimeout(timer);
    }, [theme]);

    // Return fallback colors if not yet loaded
    if (colors.length === 0) {
        return [
            "#4CAF50",
            "#2196F3",
            "#FFC107",
            "#FF5722",
            "#9C27B0",
            "#E91E63",
            "#00BCD4",
        ];
    }

    return colors;
}

/**
 * Get a single CSS variable value
 */
export function useCSSVariable(variableName: string, fallback: string = ""): string {
    const { theme } = useTheme();
    const [value, setValue] = useState(fallback);

    useEffect(() => {
        const timer = setTimeout(() => {
            const root = document.documentElement;
            const computedStyle = getComputedStyle(root);
            const cssValue = computedStyle.getPropertyValue(variableName).trim();
            setValue(cssValue || fallback);
        }, 50);

        return () => clearTimeout(timer);
    }, [theme, variableName, fallback]);

    return value;
}
