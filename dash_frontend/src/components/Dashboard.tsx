"use client";

import { useEffect, useRef, useState } from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.css";
import widgetMap from "./widgets/widgetMap";
import { createRoot } from "react-dom/client";
import { Widget } from "@/types";

// LocalStorage keys
const LOCAL_STORAGE_KEY = "dashboard_layout";

// Function to read layout from localStorage
const readLayoutFromStorage = (): Widget[] => {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    return savedLayout ? JSON.parse(savedLayout) : [];
};

// Function to save layout to localStorage
const saveLayoutToStorage = (layout: Widget[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
};

// Function to validate layout
function validateLayout(layout: Widget[], columnCount: number): Widget[] {
    return layout.map((widget) => ({
        ...widget,
        w: Math.min(widget.w, columnCount), // Ensure widget width fits within the column count
        x: Math.min(widget.x, columnCount - widget.w), // Ensure x position is valid
    }));
}

export default function Dashboard() {
    const gridRef = useRef<HTMLDivElement>(null);
    const columnCount = 11; // Set desired column count here

    const [layout, setLayout] = useState<Widget[]>(() => {
        const savedLayout = readLayoutFromStorage();
        if (savedLayout.length > 0) {
            return validateLayout(savedLayout, columnCount);
        }
        return validateLayout(
            [
                { id: "Overview", x: 0, y: 0, w: 11, h: 2 },
                { id: "SalesByDayBar", x: 0, y: 2, w: 3, h: 3 },
                { id: "SalesByMonthBar", x: 6, y: 2, w: 3, h: 3 },
                { id: "SalesByMonthComparisonBar", x: 6, y: 8, w: 3, h: 3 },
                { id: "ClockWidget", x: 0, y: 14, w: 6, h: 6 },
                { id: "DateWidget", x: 6, y: 14, w: 6, h: 6 },
                { id: "TopCustomersThisYearPie", x: 0, y: 20, w: 12, h: 6 },
            ],
            columnCount
        );
    });

    useEffect(() => {
        if (!gridRef.current) return;

        const grid = GridStack.init(
            {
                cellHeight: 80,
                column: columnCount,
                float: true,
            },
            gridRef.current
        );

        const adjustedLayout = validateLayout(layout, columnCount);

        adjustedLayout.forEach((widget: Widget) => {
            const el = grid.addWidget({
                x: widget.x,
                y: widget.y,
                w: widget.w,
                h: widget.h,
                id: widget.id,
                content: '<div class="grid-stack-item-content"></div>',
            });

            const contentDiv = el.querySelector(".grid-stack-item-content");
            if (contentDiv) {
                const WidgetComponent = widgetMap[widget.id];
                if (WidgetComponent) {
                    const root = createRoot(contentDiv);
                    root.render(<WidgetComponent />);
                }
            }
        });

        // Save layout on change
        grid.on("change", () => {
            const newLayout = (grid.save(false) as GridStackNode[]).map((item: GridStackNode) => ({
                id: item.id as string,
                x: item.x ?? 0, // Fallback to 0 if undefined
                y: item.y ?? 0, // Fallback to 0 if undefined
                w: item.w ?? 1, // Fallback to 1 if undefined
                h: item.h ?? 1, // Fallback to 1 if undefined
            }));
            saveLayoutToStorage(newLayout);
        });

        return () => {
            grid.destroy();
        };
    }, [layout]);

    return <div ref={gridRef} className="grid-stack"></div>;
}