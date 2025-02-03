"use client";

import React from "react";
import { Widget } from "@/types";

interface WidgetMenuProps {
    masterWidgetList: Widget[];
    tempLayout: Widget[];
    setTempLayout: (layout: Widget[]) => void;
    handleSave: () => void;
    handleCancel: () => void;
}

export default function WidgetMenu({
    masterWidgetList,
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
}: WidgetMenuProps) {
    // Your menu implementation here...
    return (
        <div className="widget-menu">
            {/* Render menu items based on masterWidgetList and tempLayout */}
            <button onClick={handleSave}>Save</button>
            <button onClick={handleCancel}>Cancel</button>
        </div>
    );
}