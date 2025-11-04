import React, { useMemo, useCallback, useState } from "react";
import Widget from "./Widget";
// import { ScrollArea } from "@/components/ui/scroll-area";

/* -------------------------------------- */
/* 📊 Types & Interfaces                  */
/* -------------------------------------- */

const MACHINE_CODES = [
    "HERA",
    "HERA-2",
    "ELECTRA",
    "ELECTRA-2",
    "ATHENA",
    "ATHENA-2",
    "ZEUS",
    "ZEUS-2",
    "APOLLO",
    "APOLLO-2",
    "TITAN",
    "TITAN-2",
    "SPARTAN",
    "SPARTAN-2",
    "XL-ELECTRICMACHINE",
    "XL-ELECTRICMACHINE 240V USED",
    "XL-ELECTRICMACHINE208V-USED",
    "XL-ELECTRICMACHINE240V",
    "XL-LPMACHINE",
    "XL-LPMACHINE USED",
    "XL-MINIMACHINE",
    "XL-MINIMACHINE USED",
    "XL-NEW 4LG NEW 2K",
    "XL-NEWMACHINE",
    "XL-USED 4LG NAT",
    "XL-USED 4LG NAT 2K"
];

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
    icon: string;
    compact?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, machines, statusColor, icon, compact = false }) => {
    const getColors = () => {
        if (statusColor === 'success') return {
            bg: 'var(--badge-success-text)',
            border: 'var(--badge-success-text)',
            bgLight: 'var(--badge-success-bg)',
        };
        if (statusColor === 'warning') return {
            bg: 'var(--badge-warning-text)',
            border: 'var(--badge-warning-text)',
            bgLight: 'var(--badge-warning-bg)',
        };
        return {
            bg: 'var(--badge-error-text)',
            border: 'var(--badge-error-text)',
            bgLight: 'var(--badge-error-bg)',
        };
    };

    const colors = getColors();

    return (
        <div className="flex flex-col h-full min-h-[200px]">
            <div className="rounded-lg border-2 flex flex-col h-full" style={{
                borderColor: colors.border,
                backgroundColor: 'var(--background-light)'
            }}>
                {/* Header */}
                <div className="px-3 py-2 border-b-2 flex-shrink-0" style={{
                    backgroundColor: colors.bgLight,
                    borderColor: colors.border
                }}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base flex items-center gap-1.5" style={{ color: 'var(--table-text-primary)' }}>
                            <span className="text-xl">{icon}</span>
                            <span className="truncate">{title}</span>
                        </h3>
                        <span className="font-bold px-2 py-0.5 rounded-full text-xs flex-shrink-0" style={{
                            backgroundColor: colors.bg,
                            color: 'var(--background-dark)'
                        }}>
                            {machines.length}
                        </span>
                    </div>
                </div>

                {/* Machine List */}
                <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                    {machines.length === 0 ? (
                        <div className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                            No machines in this status
                        </div>
                    ) : (
                        machines.map((machine) => {
                            // Highlight if in cost center 1 (success status) and has available units
                            const isAvailable = statusColor === 'success' && machine.available > 0;

                            return compact ? (
                                // Compact view for tabbed mode
                                <div
                                    key={machine.part_code}
                                    className="rounded px-2 py-1.5 border transition-colors flex items-center justify-between gap-2"
                                    style={{
                                        backgroundColor: isAvailable ? colors.bgLight : 'var(--background-highlight)',
                                        borderColor: isAvailable ? colors.border : 'var(--border-light)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? 'var(--badge-success-bg)'
                                            : 'var(--ui-bg-tertiary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? colors.bgLight
                                            : 'var(--background-highlight)';
                                    }}
                                >
                                    {/* Machine Code - Bold and prominent */}
                                    <div className="font-bold text-sm truncate flex-1 min-w-0" style={{ color: 'var(--table-text-primary)' }}>
                                        {machine.part_code}
                                    </div>

                                    {/* Compact Metrics */}
                                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                                        <div className="flex items-center gap-1 rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--background-dark)' }}>
                                            <span className="text-[10px]" style={{ color: 'var(--table-text-secondary)' }}>A:</span>
                                            <span className="text-xs font-bold" style={{ color: 'var(--badge-success-text)' }}>{machine.available}</span>
                                        </div>
                                        <div className="flex items-center gap-1 rounded px-1.5 py-0.5" style={{ backgroundColor: 'var(--background-dark)' }}>
                                            <span className="text-[10px]" style={{ color: 'var(--table-text-secondary)' }}>H:</span>
                                            <span className="text-xs font-bold" style={{ color: 'var(--badge-warning-text)' }}>{machine.on_hold}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Full detail view for full-screen mode
                                <div
                                    key={machine.part_code}
                                    className="rounded-md p-2.5 border transition-colors"
                                    style={{
                                        backgroundColor: isAvailable ? colors.bgLight : 'var(--background-highlight)',
                                        borderColor: isAvailable ? colors.border : 'var(--border-light)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? 'var(--badge-success-bg)'
                                            : 'var(--ui-bg-tertiary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isAvailable
                                            ? colors.bgLight
                                            : 'var(--background-highlight)';
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        {/* Machine Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate" style={{ color: 'var(--table-text-primary)' }}>{machine.part_code}</div>
                                            <div className="text-xs truncate mt-0.5" style={{ color: 'var(--table-text-secondary)' }}>{machine.part_desc}</div>
                                        </div>

                                        {/* Metrics with labels */}
                                        <div className="flex gap-2 flex-shrink-0">
                                            <div className="text-center rounded px-2.5 py-1" style={{ backgroundColor: 'var(--background-dark)' }}>
                                                <div className="text-[10px]" style={{ color: 'var(--table-text-secondary)' }}>Avail</div>
                                                <div className="font-bold text-sm" style={{ color: 'var(--badge-success-text)' }}>{machine.available}</div>
                                            </div>
                                            <div className="text-center rounded px-2.5 py-1" style={{ backgroundColor: 'var(--background-dark)' }}>
                                                <div className="text-[10px]" style={{ color: 'var(--table-text-secondary)' }}>Hold</div>
                                                <div className="font-bold text-sm" style={{ color: 'var(--badge-warning-text)' }}>{machine.on_hold}</div>
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
    const [activeTab, setActiveTab] = useState<'cc1' | 'cc2' | 'cc5'>('cc1');

    // Memoize the widget payload
    const widgetPayload = useMemo(
        () => ({
            module: "MachineStockStatus",
            table: "inventory",
            columns: ["part_code", "part_desc", "cost_ctr", "available", "on_hand", "on_hold"],
            filters: `part_code IN (${MACHINE_CODES.map(code => `'${code}'`).join(", ")})`,
            sort: ["part_code ASC"]
        }),
        []
    );

    // Render function for the status cards
    const renderFunction = useCallback((data: MachineStockData[]) => {
        const groupedMachines = groupMachinesByStatus(data);

        // Calculate summary metrics
        const totalAvailable = groupedMachines.available.reduce((sum, m) => sum + m.available, 0);
        const totalInQueue = groupedMachines.queueForRepair.length;
        const totalAtRepair = groupedMachines.atRepairShop.length;

        return (
            <div className="h-full w-full @container p-0">
                {/* 
                    Tabbed View for Small/Medium: < @5xl (1024px)
                    Interactive tabs to switch between cost centers
                */}
                <div className="@5xl:hidden h-full flex flex-col gap-2">
                    {/* Tab Navigation */}
                    <div className="flex gap-1.5">
                        {/* Cost Center 1 Tab */}
                        <button
                            onClick={() => setActiveTab('cc1')}
                            className="flex-1 rounded-lg px-2 py-2 font-bold text-sm transition-all border-2"
                            style={activeTab === 'cc1' ? {
                                backgroundColor: 'var(--badge-success-text)',
                                color: 'var(--background-dark)',
                                borderColor: 'var(--badge-success-text)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            } : {
                                backgroundColor: 'var(--badge-success-bg)',
                                color: 'var(--badge-success-text)',
                                borderColor: 'var(--badge-success-border)',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'cc1') {
                                    e.currentTarget.style.backgroundColor = 'var(--badge-success-bg)';
                                    e.currentTarget.style.opacity = '0.8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'cc1') {
                                    e.currentTarget.style.backgroundColor = 'var(--badge-success-bg)';
                                    e.currentTarget.style.opacity = '1';
                                }
                            }}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>✅</span>
                                <span className="hidden @md:inline">CC1</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={activeTab === 'cc1' ? {
                                    backgroundColor: 'var(--background-dark)',
                                    color: 'var(--badge-success-text)'
                                } : {
                                    backgroundColor: 'var(--badge-success-text)',
                                    color: 'var(--background-dark)'
                                }}>
                                    {totalAvailable}
                                </span>
                            </div>
                        </button>

                        {/* Cost Center 2 Tab */}
                        <button
                            onClick={() => setActiveTab('cc2')}
                            className="flex-1 rounded-lg px-2 py-2 font-bold text-sm transition-all border-2"
                            style={activeTab === 'cc2' ? {
                                backgroundColor: 'var(--badge-warning-text)',
                                color: 'var(--background-dark)',
                                borderColor: 'var(--badge-warning-text)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            } : {
                                backgroundColor: 'var(--badge-warning-bg)',
                                color: 'var(--badge-warning-text)',
                                borderColor: 'var(--badge-warning-border)',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'cc2') {
                                    e.currentTarget.style.backgroundColor = 'var(--badge-warning-bg)';
                                    e.currentTarget.style.opacity = '0.8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'cc2') {
                                    e.currentTarget.style.backgroundColor = 'var(--badge-warning-bg)';
                                    e.currentTarget.style.opacity = '1';
                                }
                            }}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>⏳</span>
                                <span className="hidden @md:inline">CC2</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={activeTab === 'cc2' ? {
                                    backgroundColor: 'var(--background-dark)',
                                    color: 'var(--badge-warning-text)'
                                } : {
                                    backgroundColor: 'var(--badge-warning-text)',
                                    color: 'var(--background-dark)'
                                }}>
                                    {totalInQueue}
                                </span>
                            </div>
                        </button>

                        {/* Cost Center 5 Tab */}
                        <button
                            onClick={() => setActiveTab('cc5')}
                            className="flex-1 rounded-lg px-2 py-2 font-bold text-sm transition-all border-2"
                            style={activeTab === 'cc5' ? {
                                backgroundColor: 'var(--badge-error-text)',
                                color: 'var(--background-dark)',
                                borderColor: 'var(--badge-error-text)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            } : {
                                backgroundColor: 'var(--badge-error-bg)',
                                color: 'var(--badge-error-text)',
                                borderColor: 'var(--badge-error-border)',
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== 'cc5') {
                                    e.currentTarget.style.backgroundColor = 'var(--badge-error-bg)';
                                    e.currentTarget.style.opacity = '0.8';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== 'cc5') {
                                    e.currentTarget.style.backgroundColor = 'var(--badge-error-bg)';
                                    e.currentTarget.style.opacity = '1';
                                }
                            }}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>🔧</span>
                                <span className="hidden @md:inline">CC5</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={activeTab === 'cc5' ? {
                                    backgroundColor: 'var(--background-dark)',
                                    color: 'var(--badge-error-text)'
                                } : {
                                    backgroundColor: 'var(--badge-error-text)',
                                    color: 'var(--background-dark)'
                                }}>
                                    {totalAtRepair}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0">
                        {activeTab === 'cc1' && (
                            <StatusCard
                                title="Cost Center 1"
                                machines={groupedMachines.available}
                                statusColor="success"
                                icon="✅"
                                compact={true}
                            />
                        )}
                        {activeTab === 'cc2' && (
                            <StatusCard
                                title="Cost Center 2"
                                machines={groupedMachines.queueForRepair}
                                statusColor="warning"
                                icon="⏳"
                                compact={true}
                            />
                        )}
                        {activeTab === 'cc5' && (
                            <StatusCard
                                title="Cost Center 5"
                                machines={groupedMachines.atRepairShop}
                                statusColor="error"
                                icon="🔧"
                                compact={true}
                            />
                        )}
                    </div>
                </div>

                {/* 
                    Full View: > @5xl (1024px+)
                    Shows all 3 columns side-by-side
                */}
                <div className="hidden @5xl:grid h-full grid-cols-3 gap-3">
                    <StatusCard
                        title="Cost Center 1"
                        machines={groupedMachines.available}
                        statusColor="success"
                        icon="✅"
                        compact={false}
                    />
                    <StatusCard
                        title="Cost Center 2"
                        machines={groupedMachines.queueForRepair}
                        statusColor="warning"
                        icon="⏳"
                        compact={false}
                    />
                    <StatusCard
                        title="Cost Center 5"
                        machines={groupedMachines.atRepairShop}
                        statusColor="error"
                        icon="🔧"
                        compact={false}
                    />
                </div>
            </div>
        );
    }, [activeTab, setActiveTab]);

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
