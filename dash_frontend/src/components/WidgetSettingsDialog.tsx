"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdClose, MdRefresh, MdSettings } from "react-icons/md";
import { 
    getWidgetSettingsSchema, 
    SettingField,
    WidgetSettingsSchema 
} from "@/constants/widgetSettings";
import { widgetSettingsService } from "@/lib/widgetSettings";

interface WidgetSettingsDialogProps {
    widgetId: string;
    widgetTitle: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function WidgetSettingsDialog({
    widgetId,
    widgetTitle,
    isOpen,
    onClose,
}: WidgetSettingsDialogProps) {
    const schema = getWidgetSettingsSchema(widgetId);
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Load current settings when dialog opens
    useEffect(() => {
        if (isOpen && schema) {
            setSettings(widgetSettingsService.getSettings(widgetId));
            setHasChanges(false);
        }
    }, [isOpen, widgetId, schema]);

    if (!schema) {
        return null;
    }

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        widgetSettingsService.setSettings(widgetId, settings);
        setHasChanges(false);
        onClose();
    };

    const handleReset = () => {
        widgetSettingsService.resetSettings(widgetId);
        setSettings(widgetSettingsService.getSettings(widgetId));
        setHasChanges(false);
    };

    const handleCancel = () => {
        setHasChanges(false);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={handleCancel}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-ui-bg-primary rounded-2xl shadow-2xl border border-ui-border-primary overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-ui-border-primary bg-ui-bg-secondary/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-ui-accent-primary/10 rounded-lg">
                                    <MdSettings className="w-5 h-5 text-ui-accent-primary" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-ui-text-primary">
                                        {schema.title}
                                    </h2>
                                    <p className="text-xs text-ui-text-secondary">{widgetTitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="p-2 hover:bg-ui-bg-tertiary rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
                            >
                                <MdClose className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            {schema.description && (
                                <p className="text-sm text-ui-text-secondary mb-4">
                                    {schema.description}
                                </p>
                            )}

                            <div className="space-y-6">
                                {schema.sections.map((section, sectionIndex) => (
                                    <div key={sectionIndex}>
                                        <h3 className="text-xs font-semibold text-ui-text-secondary uppercase tracking-wider mb-3">
                                            {section.title}
                                        </h3>
                                        <div className="space-y-3">
                                            {section.fields.map((field) => (
                                                <SettingFieldRenderer
                                                    key={field.key}
                                                    field={field}
                                                    value={settings[field.key]}
                                                    onChange={(value) => handleSettingChange(field.key, value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-5 py-4 border-t border-ui-border-primary bg-ui-bg-secondary/30">
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary rounded-lg transition-colors"
                            >
                                <MdRefresh className="w-4 h-4" />
                                Reset to Defaults
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!hasChanges}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        hasChanges
                                            ? 'bg-ui-accent-primary text-white hover:bg-ui-accent-primary-hover'
                                            : 'bg-ui-bg-tertiary text-ui-text-muted cursor-not-allowed'
                                    }`}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================
// SETTING FIELD RENDERERS
// ============================================

function SettingFieldRenderer({
    field,
    value,
    onChange,
}: {
    field: SettingField;
    value: any;
    onChange: (value: any) => void;
}) {
    switch (field.type) {
        case 'toggle':
            return <ToggleField field={field} value={value} onChange={onChange} />;
        case 'select':
            return <SelectField field={field} value={value} onChange={onChange} />;
        case 'number':
            return <NumberField field={field} value={value} onChange={onChange} />;
        case 'text':
            return <TextField field={field} value={value} onChange={onChange} />;
        case 'color':
            return <ColorField field={field} value={value} onChange={onChange} />;
        case 'slider':
            return <SliderField field={field} value={value} onChange={onChange} />;
        default:
            return null;
    }
}

function ToggleField({
    field,
    value,
    onChange,
}: {
    field: SettingField;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    const isEnabled = value ?? field.default;
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                {field.description && (
                    <div className="text-xs text-ui-text-secondary">{field.description}</div>
                )}
            </div>
            <button
                onClick={() => onChange(!isEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    isEnabled ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                }`}
            >
                <motion.div
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ x: isEnabled ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </button>
        </div>
    );
}

function SelectField({
    field,
    value,
    onChange,
}: {
    field: SettingField & { options: { value: string; label: string }[] };
    value: string;
    onChange: (value: string) => void;
}) {
    const currentValue = value ?? field.default;
    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                    {field.description && (
                        <div className="text-xs text-ui-text-secondary">{field.description}</div>
                    )}
                </div>
            </div>
            <select
                value={currentValue}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all cursor-pointer"
            >
                {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

function NumberField({
    field,
    value,
    onChange,
}: {
    field: SettingField & { min?: number; max?: number; step?: number };
    value: number;
    onChange: (value: number) => void;
}) {
    const currentValue = value ?? field.default;
    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                    {field.description && (
                        <div className="text-xs text-ui-text-secondary">{field.description}</div>
                    )}
                </div>
            </div>
            <input
                type="number"
                value={currentValue}
                onChange={(e) => onChange(Number(e.target.value))}
                min={field.min}
                max={field.max}
                step={field.step}
                className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all"
            />
        </div>
    );
}

function TextField({
    field,
    value,
    onChange,
}: {
    field: SettingField & { placeholder?: string; maxLength?: number };
    value: string;
    onChange: (value: string) => void;
}) {
    const currentValue = value ?? field.default;
    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                    {field.description && (
                        <div className="text-xs text-ui-text-secondary">{field.description}</div>
                    )}
                </div>
            </div>
            <input
                type="text"
                value={currentValue}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all"
            />
        </div>
    );
}

function ColorField({
    field,
    value,
    onChange,
}: {
    field: SettingField;
    value: string;
    onChange: (value: string) => void;
}) {
    const currentValue = value ?? field.default;
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                {field.description && (
                    <div className="text-xs text-ui-text-secondary">{field.description}</div>
                )}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={currentValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-ui-border-primary cursor-pointer overflow-hidden"
                />
                <span className="text-xs text-ui-text-secondary font-mono">{currentValue}</span>
            </div>
        </div>
    );
}

function SliderField({
    field,
    value,
    onChange,
}: {
    field: SettingField & { min: number; max: number; step?: number; unit?: string };
    value: number;
    onChange: (value: number) => void;
}) {
    const currentValue = value ?? field.default;
    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                    {field.description && (
                        <div className="text-xs text-ui-text-secondary">{field.description}</div>
                    )}
                </div>
                <span className="text-sm font-medium text-ui-text-primary">
                    {currentValue}{field.unit || ''}
                </span>
            </div>
            <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step || 1}
                value={currentValue}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-ui-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-ui-accent-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
            />
        </div>
    );
}
