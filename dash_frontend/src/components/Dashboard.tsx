"use client";

import { useEffect, useRef, useState } from "react";
import { GridStack, GridStackNode } from "gridstack";
import "gridstack/dist/gridstack.css";
import widgetMap from "./widgets/widgetMap";
import { createRoot } from "react-dom/client";
import { Widget } from "@/types";

// LocalStorage keys
const LOCAL_STORAGE_KEY = "dashboard_layout";

// Master list of all possible widgets
const masterWidgetList: Widget[] = [
    { id: "Overview", x: 0, y: 0, w: 11, h: 2, enabled: true },
    { id: "SalesByDayBar", x: 0, y: 0, w: 5, h: 4, enabled: true },
    { id: "SalesByMonthBar", x: 0, y: 0, w: 5, h: 4, enabled: true },
    { id: "SalesByMonthComparisonBar", x: 0, y: 0, w: 5, h: 4, enabled: false },
    { id: "ClockWidget", x: 0, y: 0, w: 4, h: 2, enabled: true },
    { id: "DateWidget", x: 0, y: 0, w: 6, h: 2, enabled: true },
    { id: "TopCustomersThisYearPie", x: 0, y: 0, w: 3, h: 7, enabled: true },
];

// Function to read layout from localStorage
const readLayoutFromStorage = (): Widget[] => {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLayout) {
        const parsedLayout: Widget[] = JSON.parse(savedLayout);

        // Merge the master widget list with the saved layout
        return masterWidgetList.map((masterWidget) => {
            const savedWidget = parsedLayout.find((w) => w.id === masterWidget.id);
            return savedWidget ? { ...masterWidget, ...savedWidget } : masterWidget;
        });
    }
    return masterWidgetList;
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
    const gridInstance = useRef<GridStack | null>(null); // Store GridStack instance
    const columnCount = 11; // Set desired column count here

    const [layout, setLayout] = useState<Widget[]>(() => {
        const savedLayout = readLayoutFromStorage();
        return validateLayout(savedLayout, columnCount);
    });

    const [menuOpen, setMenuOpen] = useState(false);
    const [tempLayout, setTempLayout] = useState<Widget[]>(layout); // Temporary state for the menu

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "f" || e.key === "F") {
                setMenuOpen((prev) => !prev);
                setTempLayout(layout); // Copy current layout into temporary state
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [layout]);

    useEffect(() => {
        if (!gridRef.current) return;

        // Initialize GridStack instance if it doesn't already exist
        if (!gridInstance.current) {
            gridInstance.current = GridStack.init(
                {
                    cellHeight: 80,
                    column: columnCount,
                    float: true,
                },
                gridRef.current
            );
        }

        const grid = gridInstance.current;

        // Render the widgets
        const renderWidgets = (widgets: Widget[]) => {
            // Clear all widgets from the grid
            grid.removeAll();

            const enabledWidgets = widgets.filter((widget) => widget.enabled);
            const adjustedLayout = validateLayout(enabledWidgets, columnCount);

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
        };

        renderWidgets(layout);

        // Save layout on change
        grid.on("change", () => {
            const newLayout = (grid.save(false) as GridStackNode[]).map((item: GridStackNode) => ({
                id: item.id as string,
                x: item.x ?? 0,
                y: item.y ?? 0,
                w: item.w ?? 1,
                h: item.h ?? 1,
                enabled: layout.find((w) => w.id === item.id)?.enabled ?? true,
            }));
            saveLayoutToStorage(newLayout);
        });

        return () => {
            grid.destroy(false); // Retain DOM nodes
        };
    }, [layout]);

    const handleSave = () => {
        saveLayoutToStorage(tempLayout);
        setMenuOpen(false); // Close the menu
        window.location.reload();
    };

    const handleCancel = () => {
        setMenuOpen(false); // Close the menu without saving
    };

    const toggleWidgetEnabled = (id: string) => {
        setTempLayout((prev) =>
            prev.map((widget) =>
                widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
            )
        );
    };

    return (
        <div>
            {menuOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: "20%",
                        left: "20%",
                        width: "60%",
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "16px",
                        zIndex: 1000,
                        color: "black"
                    }}
                >
                    <h3>Select Widgets</h3>
                    {masterWidgetList.map((widget) => (
                        <div key={widget.id}>
                            <input
                                type="checkbox"
                                checked={tempLayout.find((w) => w.id === widget.id)?.enabled ?? false}
                                onChange={() => toggleWidgetEnabled(widget.id)}
                            />
                            <label>{widget.id}</label>
                        </div>
                    ))}
                    <div style={{ marginTop: "16px" }}>
                        <button onClick={handleSave} style={{ marginRight: "8px" }}>
                            Save
                        </button>
                        <button onClick={handleCancel}>Cancel</button>
                    </div>
                </div>
            )}
            <div ref={gridRef} className="grid-stack"></div>
        </div>
    );
}