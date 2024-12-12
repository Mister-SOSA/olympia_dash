"use client";

import { useEffect } from "react";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.css"; // Ensure Gridstack styles are loaded
import TestWidget from "./widgets/TestWidget";

export default function Dashboard() {
    useEffect(() => {
        const grid = GridStack.init({
            cellHeight: 80,
            float: true,
        });

    }, []);

    return (
        <div className="grid-stack">
            {/* Gridstack items will load here */}
        </div>
    );
}