import React, { useMemo, useCallback, useState } from "react";
import Widget from "./Widget";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { CheckCircle2, Clock, Wrench, Package, BoxSelect } from "lucide-react";

const WIDGET_ID = 'MachineStockStatus';

/* -------------------------------------- */
/* 📊 Types & Interfaces                  */
/* -------------------------------------- */

interface MachineStockData {
    part_code: string;
    part_desc: string;
    cost_ctr: string;
    available: number;
    on_hand: number;
    on_hold: number;
}

interface MachineByStatus {
    available: MachineStockData[];
    queueForRepair: MachineStockData[];
    atRepairShop: MachineStockData[];
}

/* -------------------------------------- */
/* 📊 Helper Functions                    */
/* -------------------------------------- */

/**
 * Group machines by their cost center status
 * Cost Center 1: Available & Ready
 * Cost Center 2: Queue for Repair
 * Cost Center 5: At Repair Shop
 */
const groupMachinesByStatus = (data: MachineStockData[]): MachineByStatus => {
    return data.reduce(
        (acc, machine) => {
            const costCenter = machine.cost_ctr;

            if (costCenter === "1") {
                acc.available.push(machine);
            } else if (costCenter === "2") {
                acc.queueForRepair.push(machine);
            } else if (costCenter === "5") {
                acc.atRepairShop.push(machine);
            }
            // Ignore other cost centers

            return acc;
        },
        { available: [], queueForRepair: [], atRepairShop: [] } as MachineByStatus
    );
};

/* -------------------------------------- */
/* 🎨 Status Card Component               */
/* -------------------------------------- */

interface StatusCardProps {
    title: string;
    machines: MachineStockData[];
    statusColor: 'success' | 'warning' | 'error';
    icon: React.ReactNode;
    compact?: boolean;
    showDescriptions?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, machines, statusColor, icon, compact = false, showDescriptions = true }) => {
    const getColors = () => {
        if (statusColor === 'success') return {
            bg: 'var(--badge-success-text)',
            border: 'var(--badge-success-text)',
            bgLight: 'var(--badge-success-bg)',
            borderLight: 'var(--badge-success-border)',
        };
        if (statusColor === 'warning') return {
            bg: 'var(--badge-warning-text)',
            border: 'var(--badge-warning-text)',
            bgLight: 'var(--badge-warning-bg)',
            borderLight: 'var(--badge-warning-border)',
        };
        return {
            bg: 'var(--badge-error-text)',
            border: 'var(--badge-error-text)',
            bgLight: 'var(--badge-error-bg)',
            borderLight: 'var(--badge-error-border)',
        };
    };

    const colors = getColors();

    return (
        <div className="flex flex-col h-full min-h-[200px]">
            <div className="rounded-xl border flex flex-col h-full overflow-hidden" style={{
                borderColor: colors.borderLight,
                backgroundColor: 'var(--background-light)',
            }}>
                {/* Header */}
                <div className="px-3 py-2.5 border-b flex-shrink-0" style={{
                    backgroundColor: colors.bgLight,
                    borderColor: colors.borderLight,
                }}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--table-text-primary)' }}>
                            <span className="flex items-center justify-center w-6 h-6 rounded-md" style={{ backgroundColor: colors.bg, color: 'var(--background-dark)' }}>
                                {icon}
                            </span>
                            <span className="truncate">{title}</span>
                        </h3>
                        <span className="font-bold tabular-nums px-2.5 py-0.5 rounded-full text-xs flex-shrink-0" style={{
                            backgroundColor: colors.bg,
                            color: 'var(--background-dark)',
                        }}>
                            {machines.length}
                        </span>
                    </div>
                </div>

                {/* Machine List */}
                <div className="p-2 space-y-1 overflow-y-auto flex-1">
                    {machines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 gap-2" style={{ color: 'var(--text-muted)' }}>
                            <BoxSelect size={24} strokeWidth={1.5} />
                            <span className="text-xs">No machines</span>
                        </div>
                    ) : (
                        machines.map((machine) => {
                            const isAvailable = statusColor === 'success' && machine.available > 0;

                            return compact ? (
                                <div
                                    key={machine.part_code}
                                    className="group rounded-lg px-2.5 py-1.5 border transition-all duration-150 flex items-center justify-between gap-2"
                                    style={{
                                        backgroundColor: isAvailable ? colors.bgLight : 'var(--background-highlight)',
                                        borderColor: isAvailable ? colors.borderLight : 'var(--border-light)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? 'var(--badge-success-bg)'
                                            : 'var(--ui-bg-tertiary)';
                                        e.currentTarget.style.borderColor = isAvailable
                                            ? colors.border
                                            : 'var(--border-light)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? colors.bgLight
                                            : 'var(--background-highlight)';
                                        e.currentTarget.style.borderColor = isAvailable
                                            ? colors.borderLight
                                            : 'var(--border-light)';
                                    }}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Package size={13} style={{ color: 'var(--table-text-secondary)', flexShrink: 0 }} />
                                        <span className="font-semibold text-sm truncate" style={{ color: 'var(--table-text-primary)' }}>
                                            {machine.part_code}
                                        </span>
                                    </div>

                                    <div className="flex gap-1 flex-shrink-0 items-center">
                                        <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: 'var(--background-dark)' }}>
                                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--table-text-secondary)' }}>Avl</span>
                                            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--badge-success-text)' }}>{machine.available}</span>
                                        </div>
                                        <div className="flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: 'var(--background-dark)' }}>
                                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--table-text-secondary)' }}>Hld</span>
                                            <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--badge-warning-text)' }}>{machine.on_hold}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    key={machine.part_code}
                                    className="group rounded-lg p-2.5 border transition-all duration-150"
                                    style={{
                                        backgroundColor: isAvailable ? colors.bgLight : 'var(--background-highlight)',
                                        borderColor: isAvailable ? colors.borderLight : 'var(--border-light)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? 'var(--badge-success-bg)'
                                            : 'var(--ui-bg-tertiary)';
                                        e.currentTarget.style.borderColor = isAvailable
                                            ? colors.border
                                            : 'var(--border-light)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? colors.bgLight
                                            : 'var(--background-highlight)';
                                        e.currentTarget.style.borderColor = isAvailable
                                            ? colors.borderLight
                                            : 'var(--border-light)';
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Package size={14} style={{ color: 'var(--table-text-secondary)', flexShrink: 0 }} />
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm truncate" style={{ color: 'var(--table-text-primary)' }}>{machine.part_code}</div>
                                                {showDescriptions && (
                                                    <div className="text-xs truncate mt-0.5" style={{ color: 'var(--table-text-secondary)' }}>{machine.part_desc}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-1.5 flex-shrink-0">
                                            <div className="text-center rounded-md px-2.5 py-1" style={{ backgroundColor: 'var(--background-dark)' }}>
                                                <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--table-text-secondary)' }}>Avail</div>
                                                <div className="font-bold text-sm tabular-nums" style={{ color: 'var(--badge-success-text)' }}>{machine.available}</div>
                                            </div>
                                            <div className="text-center rounded-md px-2.5 py-1" style={{ backgroundColor: 'var(--background-dark)' }}>
                                                <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--table-text-secondary)' }}>Hold</div>
                                                <div className="font-bold text-sm tabular-nums" style={{ color: 'var(--badge-warning-text)' }}>{machine.on_hold}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 MachineStockStatus Component        */
/* -------------------------------------- */

export default function MachineStockStatus() {
    // Widget-specific settings
    const { settings } = useWidgetSettings(WIDGET_ID);
    const defaultTab = settings.defaultTab as 'cc1' | 'cc2' | 'cc5';
    const showMachineDescriptions = settings.showMachineDescriptions as boolean;

    const [activeTab, setActiveTab] = useState<'cc1' | 'cc2' | 'cc5'>(defaultTab);

    // Memoize the widget payload
    const widgetPayload = useMemo(
        () => ({
            module: "MachineStockStatus",
            queryId: "MachineStockStatus"
        }),
        []
    );

    // Render function for the status cards
    const renderFunction = useCallback((data: MachineStockData[]) => {
        const groupedMachines = groupMachinesByStatus(data);

        const totalAvailable = groupedMachines.available.reduce((sum, m) => sum + m.available, 0);
        const totalInQueue = groupedMachines.queueForRepair.length;
        const totalAtRepair = groupedMachines.atRepairShop.length;

        const tabs = [
            { key: 'cc1' as const, label: 'Available', shortLabel: 'CC1', icon: <CheckCircle2 size={14} />, count: totalAvailable, color: 'success' },
            { key: 'cc2' as const, label: 'Queue', shortLabel: 'CC2', icon: <Clock size={14} />, count: totalInQueue, color: 'warning' },
            { key: 'cc5' as const, label: 'Repair', shortLabel: 'CC5', icon: <Wrench size={14} />, count: totalAtRepair, color: 'error' },
        ] as const;

        const getTabColors = (color: string, active: boolean) => {
            const map: Record<string, { activeBg: string; activeBorder: string; inactiveBg: string; inactiveBorder: string; text: string; badgeBg: string; badgeText: string }> = {
                success: {
                    activeBg: 'var(--badge-success-text)', activeBorder: 'var(--badge-success-text)',
                    inactiveBg: 'var(--badge-success-bg)', inactiveBorder: 'var(--badge-success-border)',
                    text: 'var(--badge-success-text)', badgeBg: 'var(--badge-success-text)', badgeText: 'var(--background-dark)',
                },
                warning: {
                    activeBg: 'var(--badge-warning-text)', activeBorder: 'var(--badge-warning-text)',
                    inactiveBg: 'var(--badge-warning-bg)', inactiveBorder: 'var(--badge-warning-border)',
                    text: 'var(--badge-warning-text)', badgeBg: 'var(--badge-warning-text)', badgeText: 'var(--background-dark)',
                },
                error: {
                    activeBg: 'var(--badge-error-text)', activeBorder: 'var(--badge-error-text)',
                    inactiveBg: 'var(--badge-error-bg)', inactiveBorder: 'var(--badge-error-border)',
                    text: 'var(--badge-error-text)', badgeBg: 'var(--badge-error-text)', badgeText: 'var(--background-dark)',
                },
            };
            return map[color] || map.success;
        };

        return (
            <div className="h-full w-full @container p-0">
                {/* Tabbed View: < @5xl */}
                <div className="@5xl:hidden h-full flex flex-col gap-2">
                    <div className="flex gap-1.5">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.key;
                            const c = getTabColors(tab.color, isActive);
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className="flex-1 rounded-lg px-2 py-2 font-semibold text-sm transition-all border"
                                    style={isActive ? {
                                        backgroundColor: c.activeBg,
                                        color: 'var(--background-dark)',
                                        borderColor: c.activeBorder,
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    } : {
                                        backgroundColor: c.inactiveBg,
                                        color: c.text,
                                        borderColor: c.inactiveBorder,
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        {tab.icon}
                                        <span className="hidden @md:inline">{tab.shortLabel}</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold tabular-nums" style={isActive ? {
                                            backgroundColor: 'var(--background-dark)',
                                            color: c.text,
                                        } : {
                                            backgroundColor: c.badgeBg,
                                            color: c.badgeText,
                                        }}>
                                            {tab.count}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0">
                        {activeTab === 'cc1' && (
                            <StatusCard
                                title="Available & Ready"
                                machines={groupedMachines.available}
                                statusColor="success"
                                icon={<CheckCircle2 size={14} />}
                                compact={true}
                                showDescriptions={showMachineDescriptions}
                            />
                        )}
                        {activeTab === 'cc2' && (
                            <StatusCard
                                title="Queue for Repair"
                                machines={groupedMachines.queueForRepair}
                                statusColor="warning"
                                icon={<Clock size={14} />}
                                compact={true}
                                showDescriptions={showMachineDescriptions}
                            />
                        )}
                        {activeTab === 'cc5' && (
                            <StatusCard
                                title="At Repair Shop"
                                machines={groupedMachines.atRepairShop}
                                statusColor="error"
                                icon={<Wrench size={14} />}
                                compact={true}
                                showDescriptions={showMachineDescriptions}
                            />
                        )}
                    </div>
                </div>

                {/* Full View: @5xl+ */}
                <div className="hidden @5xl:grid h-full grid-cols-3 gap-3">
                    <StatusCard
                        title="Available & Ready"
                        machines={groupedMachines.available}
                        statusColor="success"
                        icon={<CheckCircle2 size={14} />}
                        compact={false}
                        showDescriptions={showMachineDescriptions}
                    />
                    <StatusCard
                        title="Queue for Repair"
                        machines={groupedMachines.queueForRepair}
                        statusColor="warning"
                        icon={<Clock size={14} />}
                        compact={false}
                        showDescriptions={showMachineDescriptions}
                    />
                    <StatusCard
                        title="At Repair Shop"
                        machines={groupedMachines.atRepairShop}
                        statusColor="error"
                        icon={<Wrench size={14} />}
                        compact={false}
                        showDescriptions={showMachineDescriptions}
                    />
                </div>
            </div>
        );
    }, [activeTab, setActiveTab, showMachineDescriptions]);

    return (
        <Widget
            endpoint="/api/widgets"
            payload={widgetPayload}
            title="Machine Stock Status"
            refreshInterval={10000}
        >
            {(data, loading) => {
                if (!data || data.length === 0) {
                    return <div className="widget-empty">No machine data available</div>;
                }

                return renderFunction(data);
            }}
        </Widget>
    );
}
