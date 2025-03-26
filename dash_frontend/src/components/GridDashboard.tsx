"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.css";
import { createRoot, Root } from "react-dom/client";
import { Widget } from "@/types";
import { COLUMN_COUNT, CELL_HEIGHT } from "@/constants/dashboard";
import { saveLayoutToStorage } from "@/utils/layoutUtils";
import widgetMap from "@/components/widgets/widgetMap";

export interface GridDashboardProps {
    // The current serialized layout (list of widgets)
    layout: Widget[];
    // Callback to notify parent of layout changes
    onExternalLayoutChange?: (layout: Widget[]) => void;
}

export interface GridDashboardHandle {
    compact: () => void;
}

const GridDashboard = forwardRef<GridDashboardHandle, GridDashboardProps>(
    ({ layout, onExternalLayoutChange }, ref) => {
        const gridRef = useRef<HTMLDivElement>(null);
        const gridInstance = useRef<GridStack | null>(null);
        // Keep track of React roots for proper unmounting of widget components.
        const widgetRoots = useRef<Map<string, Root>>(new Map());

        // Expose the "compact" method to parent components.
        useImperativeHandle(ref, () => ({
            compact: () => {
                if (gridInstance.current) {
                    gridInstance.current.compact();
                    const updatedNodes = gridInstance.current.save() as GridStackNode[];
                    const updatedLayout = updatedNodes.map((node) => ({
                        id: node.id as string,
                        x: node.x || 0,
                        y: node.y || 0,
                        w: node.w || 1,
                        h: node.h || 1,
                        enabled: true,
                    }));
                    if (onExternalLayoutChange) {
                        onExternalLayoutChange(updatedLayout);
                    }
                    saveLayoutToStorage(updatedLayout);
                }
            },
        }));

        useEffect(() => {
            if (!gridRef.current) return;
            if (gridInstance.current) return; // Prevent reinitialization

            // Initialize GridStack with production-friendly options.
            gridInstance.current = GridStack.init(
                {
                    cellHeight: CELL_HEIGHT,
                    column: COLUMN_COUNT,
                    float: false,
                    // Other production options can be added here
                },
                gridRef.current
            );

            // Set the render callback – each time a widget is added/loaded,
            // this function will mount the corresponding React component.
            GridStack.renderCB = (el, node) => {
                const widgetId = node.id as string;
                // Clean up any previous content.
                el.innerHTML = "";
                const WidgetComponent = widgetMap[widgetId];
                if (WidgetComponent) {
                    const root = createRoot(el);
                    root.render(<WidgetComponent />);
                    widgetRoots.current.set(widgetId, root);
                } else {
                    // Fallback: if no React component is mapped, render provided content.
                    el.innerHTML = node.content || "";
                }
            };

            // Load the initial layout using GridStack’s built‑in load method.
            gridInstance.current.load(layout);

            // Listen to layout changes – on any change, grab the new state
            // and propagate it to the parent and local storage.
            gridInstance.current.on("change", () => {
                if (gridInstance.current) {
                    const nodes = gridInstance.current.save() as GridStackNode[];
                    const updatedLayout = nodes.map((node) => ({
                        id: node.id as string,
                        x: node.x || 0,
                        y: node.y || 0,
                        w: node.w || 1,
                        h: node.h || 1,
                        enabled: true,
                    }));
                    if (onExternalLayoutChange) {
                        onExternalLayoutChange(updatedLayout);
                    }
                    saveLayoutToStorage(updatedLayout);
                }
            });

            return () => {
                // Clean up React roots and destroy the grid instance.
                widgetRoots.current.forEach((root) => root.unmount());
                widgetRoots.current.clear();
                gridInstance.current!.destroy(false);
                gridInstance.current = null;
            };
        }, []);

        // Reload the grid if the external layout prop changes (e.g. via presets or widget menu).
        useEffect(() => {
            if (gridInstance.current) {
                gridInstance.current.load(layout);
            }
        }, [layout]);

        return <div ref={gridRef} className="grid-stack"></div>;
    }
);

GridDashboard.displayName = "GridDashboard";
export default GridDashboard;