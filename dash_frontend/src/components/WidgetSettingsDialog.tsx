"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, RefreshCw, Globe, Plus, Trash2, ClipboardPaste, X } from "lucide-react";
import {
    getWidgetSettingsSchema,
    SettingField,
    WidgetSettingsSchema,
    AsyncSelectSettingField,
} from "@/constants/widgetSettings";
import { widgetSettingsService } from "@/lib/widgetSettings";
import { authService } from "@/lib/auth";
import { useACInfinityOptional, ACInfinityGlobalSettings } from "@/contexts/ACInfinityContext";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerBody,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

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

    // Get AC Infinity context for global settings (if available)
    const acInfinity = useACInfinityOptional();

    // Load current settings when dialog opens
    useEffect(() => {
        if (isOpen && schema) {
            // Load widget-specific settings
            const widgetSettings = widgetSettingsService.getSettings(widgetId);

            // Merge in global settings from AC Infinity context (if applicable)
            const mergedSettings = { ...widgetSettings };
            if (acInfinity) {
                // Map global settings with "global:" prefix
                mergedSettings['global:refreshInterval'] = String(acInfinity.globalSettings.refreshInterval);
                mergedSettings['global:temperatureUnit'] = acInfinity.globalSettings.temperatureUnit;
                mergedSettings['global:enableAnimations'] = acInfinity.globalSettings.enableAnimations;
                mergedSettings['global:showVPD'] = acInfinity.globalSettings.showVPD;
                mergedSettings['global:showHumidity'] = acInfinity.globalSettings.showHumidity;
                mergedSettings['global:showTemperature'] = acInfinity.globalSettings.showTemperature;
            }

            setSettings(mergedSettings);
            setHasChanges(false);
        }
    }, [isOpen, widgetId, schema, acInfinity]);

    if (!schema) {
        return null;
    }

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        // Separate global settings from widget-specific settings
        const globalSettingsUpdate: Partial<ACInfinityGlobalSettings> = {};
        const widgetSettings: Record<string, any> = {};

        for (const [key, value] of Object.entries(settings)) {
            if (key.startsWith('global:')) {
                // Handle global settings
                const globalKey = key.replace('global:', '') as keyof ACInfinityGlobalSettings;
                if (globalKey === 'refreshInterval') {
                    globalSettingsUpdate.refreshInterval = parseInt(value as string) || 30;
                } else if (globalKey === 'temperatureUnit') {
                    globalSettingsUpdate.temperatureUnit = value as 'C' | 'F';
                } else {
                    (globalSettingsUpdate as any)[globalKey] = value;
                }
            } else {
                widgetSettings[key] = value;
            }
        }

        // Save global settings to AC Infinity context
        if (acInfinity && Object.keys(globalSettingsUpdate).length > 0) {
            acInfinity.updateGlobalSettings(globalSettingsUpdate);
        }

        // Save widget-specific settings
        widgetSettingsService.setSettings(widgetId, widgetSettings);
        setHasChanges(false);
        onClose();
    };

    const handleReset = () => {
        // Reset widget settings
        widgetSettingsService.resetSettings(widgetId);

        // Get fresh widget settings
        const widgetSettings = widgetSettingsService.getSettings(widgetId);

        // If we have AC Infinity context, also reset global settings to defaults
        // (but don't save yet - just show defaults in the form)
        const mergedSettings = { ...widgetSettings };
        // Use default values from schema for global settings
        mergedSettings['global:refreshInterval'] = '30';
        mergedSettings['global:temperatureUnit'] = 'F';
        mergedSettings['global:enableAnimations'] = true;
        mergedSettings['global:showVPD'] = true;
        mergedSettings['global:showHumidity'] = true;
        mergedSettings['global:showTemperature'] = true;

        setSettings(mergedSettings);
        setHasChanges(true); // Mark as changed so user can save the reset
    };

    const handleCancel = () => {
        setHasChanges(false);
        onClose();
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            handleCancel();
        }
    };

    return (
        <Drawer open={isOpen} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
            <DrawerContent
                className="z-[200] max-h-[90vh]"
                showHandle={true}
            >
                <DrawerHeader className="bg-ui-bg-secondary/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-ui-accent-primary/10 rounded-lg">
                            <Settings className="w-5 h-5 text-ui-accent-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DrawerTitle>{schema.title}</DrawerTitle>
                            <DrawerDescription className="truncate">{widgetTitle}</DrawerDescription>
                        </div>
                        <DrawerClose asChild>
                            <button
                                className="p-2 -mr-2 rounded-lg text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-tertiary transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </DrawerClose>
                    </div>
                </DrawerHeader>

                <DrawerBody className="max-h-[50vh]">
                    {schema.description && (
                        <p className="text-sm text-ui-text-secondary mb-4">
                            {schema.description}
                        </p>
                    )}

                    <div className="space-y-6">
                        {schema.sections.map((section, sectionIndex) => {
                            const isGlobalSection = section.title.toLowerCase().includes('global');
                            return (
                                <div
                                    key={sectionIndex}
                                    className={isGlobalSection ? 'p-3 -mx-2 rounded-xl bg-ui-accent-primary/5 border border-ui-accent-primary/20' : ''}
                                >
                                    <h3 className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1 ${isGlobalSection ? 'text-ui-accent-primary' : 'text-ui-text-secondary'
                                        }`}>
                                        {isGlobalSection && <Globe className="w-3.5 h-3.5" />}
                                        {section.title}
                                    </h3>
                                    {section.description && (
                                        <p className="text-xs text-ui-text-muted mb-3">
                                            {section.description}
                                        </p>
                                    )}
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
                            );
                        })}
                    </div>
                </DrawerBody>

                <DrawerFooter className="flex-row justify-between gap-2 safe-bottom">
                    <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="gap-2 text-ui-text-secondary"
                        size="sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                    </Button>
                    <div className="flex gap-2">
                        <DrawerClose asChild>
                            <Button variant="ghost" size="sm">
                                Cancel
                            </Button>
                        </DrawerClose>
                        <Button onClick={handleSave} disabled={!hasChanges} size="sm">
                            Save Changes
                        </Button>
                    </div>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
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
        case 'asyncSelect':
            return <AsyncSelectField field={field as AsyncSelectSettingField} value={value} onChange={onChange} />;
        case 'number':
            return <NumberField field={field} value={value} onChange={onChange} />;
        case 'text':
            return <TextField field={field} value={value} onChange={onChange} />;
        case 'color':
            return <ColorField field={field} value={value} onChange={onChange} />;
        case 'slider':
            return <SliderField field={field} value={value} onChange={onChange} />;
        case 'itemList':
            return <ItemListField field={field} value={value} onChange={onChange} />;
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
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-ui-accent-primary' : 'bg-ui-bg-tertiary'
                    }`}
            >
                <motion.div
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ x: isEnabled ? 20 : 0 }}
                    transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
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

function AsyncSelectField({
    field,
    value,
    onChange,
}: {
    field: AsyncSelectSettingField;
    value: string;
    onChange: (value: string) => void;
}) {
    const [options, setOptions] = useState<{ value: string; label: string; disabled?: boolean }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOptions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await authService.fetchWithAuth(field.optionsEndpoint);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();

            // Navigate to the options array using optionsPath
            let optionsData = data;
            if (field.optionsPath) {
                for (const key of field.optionsPath.split('.')) {
                    optionsData = optionsData?.[key];
                }
            }

            if (!Array.isArray(optionsData)) {
                throw new Error('Invalid options data');
            }

            const mappedOptions = optionsData.map((item: any) => ({
                value: String(item[field.valueField] || ''),
                label: String(item[field.labelField] || ''),
                disabled: field.disabledField ? !item[field.disabledField] : false,
            }));

            setOptions(mappedOptions);
        } catch (err) {
            console.error('Error fetching options:', err);
            setError(err instanceof Error ? err.message : 'Failed to load options');
        } finally {
            setLoading(false);
        }
    }, [field.optionsEndpoint, field.optionsPath, field.valueField, field.labelField, field.disabledField]);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

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
            {loading ? (
                <div className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-secondary text-sm">
                    Loading options...
                </div>
            ) : error ? (
                <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-ui-bg-secondary border border-ui-danger/50 rounded-lg text-ui-danger text-sm">
                        {error}
                    </div>
                    <button
                        onClick={fetchOptions}
                        className="px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-secondary text-sm hover:bg-ui-bg-tertiary"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <select
                    value={currentValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all cursor-pointer"
                >
                    <option value="">{field.placeholder || 'Select an option...'}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}{opt.disabled ? ' (Offline)' : ''}
                        </option>
                    ))}
                </select>
            )}
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

function ItemListField({
    field,
    value,
    onChange,
}: {
    field: SettingField & { placeholder?: string; maxItems?: number; allowDuplicates?: boolean };
    value: string[];
    onChange: (value: string[]) => void;
}) {
    const [inputValue, setInputValue] = useState('');
    const [showPasteMode, setShowPasteMode] = useState(false);
    const [pasteValue, setPasteValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const currentValue: string[] = Array.isArray(value) ? value : (field.default as string[]) || [];

    const addItem = (item: string) => {
        const trimmed = item.trim().toUpperCase();
        if (!trimmed) return;

        // Check for duplicates if not allowed
        if (!field.allowDuplicates && currentValue.includes(trimmed)) {
            return;
        }

        // Check max items
        if (field.maxItems && currentValue.length >= field.maxItems) {
            return;
        }

        onChange([...currentValue, trimmed]);
        setInputValue('');
    };

    const removeItem = (index: number) => {
        const newValue = currentValue.filter((_, i) => i !== index);
        onChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItem(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && currentValue.length > 0) {
            removeItem(currentValue.length - 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData('text');
        // Check if it's a multi-item paste (contains comma, newline, or tab)
        if (/[,\n\t]/.test(pastedText)) {
            e.preventDefault();
            const items = pastedText
                .split(/[,\n\t]+/)
                .map(s => s.trim().toUpperCase())
                .filter(s => s.length > 0);

            let newItems = [...currentValue];
            for (const item of items) {
                if (field.allowDuplicates || !newItems.includes(item)) {
                    if (!field.maxItems || newItems.length < field.maxItems) {
                        newItems.push(item);
                    }
                }
            }
            onChange(newItems);
            setInputValue('');
        }
    };

    const handleBulkPaste = () => {
        const items = pasteValue
            .split(/[,\n\t]+/)
            .map(s => s.trim().toUpperCase())
            .filter(s => s.length > 0);

        let newItems = [...currentValue];
        for (const item of items) {
            if (field.allowDuplicates || !newItems.includes(item)) {
                if (!field.maxItems || newItems.length < field.maxItems) {
                    newItems.push(item);
                }
            }
        }
        onChange(newItems);
        setPasteValue('');
        setShowPasteMode(false);
    };

    const clearAll = () => {
        onChange([]);
    };

    return (
        <div className="py-2">
            <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                    <div className="text-sm font-medium text-ui-text-primary">{field.label}</div>
                    {field.description && (
                        <div className="text-xs text-ui-text-secondary">{field.description}</div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-ui-text-muted">
                        {currentValue.length}{field.maxItems ? `/${field.maxItems}` : ''} items
                    </span>
                </div>
            </div>

            {/* Input area */}
            <div className="flex gap-2 mb-2">
                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={field.placeholder || 'Type and press Enter...'}
                        className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => addItem(inputValue)}
                    disabled={!inputValue.trim()}
                    className="px-3 py-2 bg-ui-accent-primary text-white rounded-lg text-sm font-medium hover:bg-ui-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => setShowPasteMode(!showPasteMode)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${showPasteMode
                        ? 'bg-ui-accent-primary text-white'
                        : 'bg-ui-bg-tertiary text-ui-text-secondary hover:text-ui-text-primary'
                        }`}
                    title="Paste multiple items"
                >
                    <ClipboardPaste className="w-4 h-4" />
                </button>
            </div>

            {/* Bulk paste area */}
            <AnimatePresence>
                {showPasteMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden mb-2"
                    >
                        <div className="p-3 bg-ui-bg-tertiary rounded-lg border border-ui-border-primary">
                            <div className="text-xs text-ui-text-secondary mb-2">
                                Paste a list of codes separated by commas, tabs, or newlines:
                            </div>
                            <textarea
                                value={pasteValue}
                                onChange={(e) => setPasteValue(e.target.value)}
                                placeholder="1130, 1220, 1140, 270..."
                                rows={3}
                                className="w-full px-3 py-2 bg-ui-bg-secondary border border-ui-border-primary rounded-lg text-ui-text-primary text-sm focus:border-ui-accent-primary focus:ring-1 focus:ring-ui-accent-primary transition-all resize-none font-mono"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasteMode(false);
                                        setPasteValue('');
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-ui-text-secondary hover:text-ui-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkPaste}
                                    disabled={!pasteValue.trim()}
                                    className="px-3 py-1.5 bg-ui-accent-primary text-white rounded-md text-xs font-medium hover:bg-ui-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add Items
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Items list */}
            {currentValue.length > 0 && (
                <div className="border border-ui-border-primary rounded-lg bg-ui-bg-secondary overflow-hidden">
                    <div className="max-h-[200px] overflow-y-auto p-2">
                        <div className="flex flex-wrap gap-1.5">
                            {currentValue.map((item, index) => (
                                <motion.div
                                    key={`${item}-${index}`}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-ui-bg-tertiary hover:bg-ui-bg-primary rounded-md text-sm font-mono text-ui-text-primary group transition-colors"
                                >
                                    <span>{item}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="w-4 h-4 flex items-center justify-center rounded-full text-ui-text-muted hover:text-ui-text-primary hover:bg-red-500/20 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    {currentValue.length > 0 && (
                        <div className="px-3 py-2 border-t border-ui-border-primary bg-ui-bg-tertiary/50 flex justify-end">
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-xs text-ui-text-muted hover:text-red-400 flex items-center gap-1 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear All
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {currentValue.length === 0 && (
                <div className="border border-dashed border-ui-border-primary rounded-lg p-4 text-center">
                    <div className="text-xs text-ui-text-muted">
                        No items added yet. Type a code and press Enter, or paste a list.
                    </div>
                </div>
            )}
        </div>
    );
}
