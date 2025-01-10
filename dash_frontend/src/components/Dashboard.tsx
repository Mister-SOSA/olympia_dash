"use client";

import { useEffect, useRef, useState } from "react";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.css";
import widgetMap from "./widgets/widgetMap";
import { createRoot } from "react-dom/client";

export default function Dashboard() {
    const gridRef = useRef<HTMLDivElement>(null);
    const columnCount = 11; // Set desired column count here

    const [layout, setLayout] = useState(() =>
        validateLayout(
            [
                { id: "Overview", x: 0, y: 0, w: 12, h: 2 },
                // Add more widgets here
                // { id: "SalesByMonthComparisonBar", x: 0, y: 2, w: 4, h: 4 },
                // { id: "SalesByMonthBar", x: 4, y: 2, w: 4, h: 4 },
                // { id: "TopCustomersThisYearPie", x: 8, y: 2, w: 3, h: 7 },
                // { id: "SalesByDayBar", x: 0, y: 6, w: 4, h: 4 },
                // { id: "ClockWidget", x: 5, y: 9, w: 4, h: 1 },
                // { id: "DateWidget", x: 5, y: 10, w: 4, h: 1 },
            ],
            columnCount
        )
    );

    // Utility to validate layout against column count
    const validateLayout = (layout, columnCount) => {
        return layout.map((widget) => ({
            ...widget,
            w: Math.min(widget.w, columnCount), // Ensure widget width fits within the column count
            x: Math.min(widget.x, columnCount - widget.w), // Ensure x position is valid
        }));
    };

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

        adjustedLayout.forEach((widget) => {
            const el = grid.addWidget({
                x: widget.x,
                y: widget.y,
                w: widget.w,
                h: widget.h,
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

        return () => {
            grid.destroy();
        };
    }, [layout]);

    return <div ref={gridRef} className="grid-stack"></div>;
}