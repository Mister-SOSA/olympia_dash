"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import GridDashboard, { GridDashboardHandle } from "./GridDashboard";
import Menu from "./WidgetMenu";
import { Widget } from "@/types";
import { readLayoutFromStorage, validateLayout, saveLayoutToStorage } from "@/utils/layoutUtils";
import { COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";

export default function Dashboard() {
    const [layout, setLayout] = useState<Widget[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [tempLayout, setTempLayout] = useState<Widget[]>([]);
    const gridDashboardRef = useRef<GridDashboardHandle>(null);

    // Initialize layout on mount
    useEffect(() => {
        const storedLayout = readLayoutFromStorage();
        setLayout(validateLayout(storedLayout, COLUMN_COUNT));
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "f") {
                setMenuOpen((prev) => !prev);
                setTempLayout(layout);
            } else if (e.key.toLowerCase() === "x" && gridDashboardRef.current) {
                gridDashboardRef.current.compact();
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [layout]);

    const handleSave = useCallback(() => {
        saveLayoutToStorage(tempLayout);
        setMenuOpen(false);
        setLayout(tempLayout);
    }, [tempLayout]);

    const handleCancel = useCallback(() => {
        setMenuOpen(false);
    }, []);

    return (
        <div>
            {menuOpen && (
                <Menu
                    masterWidgetList={masterWidgetList}
                    tempLayout={tempLayout}
                    setTempLayout={setTempLayout}
                    handleSave={handleSave}
                    handleCancel={handleCancel}
                />
            )}
            <GridDashboard
                ref={gridDashboardRef}
                layout={layout}
                onExternalLayoutChange={setLayout}
            />
        </div>
    );
}