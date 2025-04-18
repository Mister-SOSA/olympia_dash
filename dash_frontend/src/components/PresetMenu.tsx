"use client";
import React from "react";
import { Widget } from "@/types";

interface PresetMenuProps {
    presets: Array<Widget[] | null>;
    loadPreset: (index: number) => void;
    presetsOpen: boolean;
    setPresetsOpen: (open: boolean) => void;
}

export default function PresetMenu({
    presets,
    loadPreset,
    presetsOpen,
    setPresetsOpen,
}: PresetMenuProps) {
    if (!presetsOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-[--background-light] p-6 rounded-lg shadow-lg w-11/12 md:w-1/3">
                <h2 className="text-xl font-semibold mb-4">Preset Map</h2>
                <p className="mb-4 text-sm text-gray-600">
                    Presets let you save and quickly switch between up to 9 different dashboard
                    layouts. Use <kbd>Shift</kbd>+<kbd>1-9</kbd> to save the current layout, and press{" "}
                    <kbd>1-9</kbd> to load a saved layout.
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {presets.map((preset, i) => (
                        <button
                            key={i}
                            disabled={!preset}
                            onClick={() => {
                                if (preset) {
                                    loadPreset(i);
                                    setPresetsOpen(false);
                                }
                            }}
                            className={`p-2 border rounded h-25 text-3xl font-semibold ${preset
                                ? "hover:bg-[background-primary]"
                                : "bg-[background-secondary] text-gray-500 cursor-not-allowed border-gray-600"
                                }`}
                        >
                            <div className="flex flex-col items-center">
                                <span className="font-semibold text-lg">{i + 1}</span>
                                {preset &&
                                    (() => {
                                        const items = preset.filter((w) => w.enabled).map((w) => w.id);
                                        const preview = items.slice(0, 3);
                                        const moreCount = items.length - preview.length;
                                        return (
                                            <ul className="mt-1 text-xs text-gray-500 text-left">
                                                {preview.map((id) => (
                                                    <li key={id}>{id.replace(/-/g, " ")}</li>
                                                ))}
                                                {moreCount > 0 && <li>+{moreCount} more</li>}
                                            </ul>
                                        );
                                    })()}
                            </div>
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setPresetsOpen(false)}
                    className="mt-4 w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Close
                </button>
            </div>
        </div>
    );
}