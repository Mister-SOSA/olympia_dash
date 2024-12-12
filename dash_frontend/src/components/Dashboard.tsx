"use client";

import { useEffect, useRef, useState } from "react";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.css";
import widgetMap from "./widgets/widgetMap";
import { createRoot } from "react-dom/client";

export default function Dashboard() {
    const gridRef = useRef<HTMLDivElement>(null);

    const [layout, setLayout] = useState([
        { id: "TestWidget", x: 0, y: 0, w: 4, h: 2 },
    ]);

    useEffect(() => {
        if (!gridRef.current) return;

        const grid = GridStack.init(
            {
                cellHeight: 80,
                column: 12,
                float: true,
            },
            gridRef.current
        );

        layout.forEach((widget) => {
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