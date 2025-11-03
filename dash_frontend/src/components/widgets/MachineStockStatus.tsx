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
}

const StatusCard: React.FC<StatusCardProps> = ({ title, machines, statusColor, icon }) => {
    const bgColorClass = statusColor === 'success' ? 'bg-[#4CAF50]' :
        statusColor === 'warning' ? 'bg-[#ff8307]' :
            'bg-[#F44336]';
    const borderColorClass = statusColor === 'success' ? 'border-[#4CAF50]' :
        statusColor === 'warning' ? 'border-[#ff8307]' :
            'border-[#F44336]';
    const bgLightClass = statusColor === 'success' ? 'bg-[#4CAF50]/10' :
        statusColor === 'warning' ? 'bg-[#ff8307]/10' :
            'bg-[#F44336]/10';

    return (
        <div className="flex flex-col h-full min-h-[200px]">
            <div className={`rounded-lg border-2 ${borderColorClass} flex flex-col h-full bg-[#161e28]`}>
                {/* Header */}
                <div className={`${bgLightClass} px-4 py-3 border-b-2 ${borderColorClass} flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                            <span className="text-2xl">{icon}</span>
                            {title}
                        </h3>
                        <span className={`${bgColorClass} text-white font-bold px-3 py-1 rounded-full text-sm`}>
                            {machines.length}
                        </span>
                    </div>
                </div>

                {/* Machine List */}
                <div className="p-3 space-y-2 overflow-y-auto flex-1">
                    {machines.length === 0 ? (
                        <div className="text-center py-8 text-[#757575]">
                            No machines in this status
                        </div>
                    ) : (
                        machines.map((machine) => {
                            // Highlight green if in cost center 1 (success status) and has available units
                            const isAvailable = statusColor === 'success' && machine.available > 0;
                            const bgClass = isAvailable
                                ? 'bg-[#4CAF50]/20 border-[#4CAF50]'
                                : 'bg-[#23303d] border-[#202D3C]';
                            const hoverClass = isAvailable
                                ? 'hover:bg-[#4CAF50]/30'
                                : 'hover:bg-[#23303d]/80';

                            return (
                                <div
                                    key={machine.part_code}
                                    className={`${bgClass} rounded px-2 py-1.5 border ${hoverClass} transition-colors flex items-center justify-between gap-2`}
                                >
                                    {/* Machine Code - Bold and prominent */}
                                    <div className="font-bold text-sm text-white truncate flex-1 min-w-0">
                                        {machine.part_code}
                                    </div>

                                    {/* Compact Metrics */}
                                    <div className="flex gap-1.5 flex-shrink-0 items-center">
                                        <div className="flex items-center gap-1 bg-[#08121a] rounded px-1.5 py-0.5">
                                            <span className="text-[10px] text-[#B0B0B0]">A:</span>
                                            <span className="text-xs font-bold text-[#4CAF50]">{machine.available}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-[#08121a] rounded px-1.5 py-0.5">
                                            <span className="text-[10px] text-[#B0B0B0]">H:</span>
                                            <span className="text-xs font-bold text-[#ff8307]">{machine.on_hold}</span>
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
            <div className="h-full w-full @container p-4">
                {/* 
                    Tabbed View for Small/Medium: < @5xl (1024px)
                    Interactive tabs to switch between cost centers
                */}
                <div className="@5xl:hidden h-full flex flex-col gap-3">
                    {/* Tab Navigation */}
                    <div className="flex gap-2">
                        {/* Cost Center 1 Tab */}
                        <button
                            onClick={() => setActiveTab('cc1')}
                            className={`flex-1 rounded-lg px-4 py-3 font-bold text-sm transition-all ${
                                activeTab === 'cc1'
                                    ? 'bg-[#4CAF50] text-white border-2 border-[#4CAF50] shadow-lg'
                                    : 'bg-[#4CAF50]/10 text-[#4CAF50] border-2 border-[#4CAF50]/50 hover:bg-[#4CAF50]/20'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>✅</span>
                                <span className="hidden @md:inline">CC1</span>
                                <span className={`${activeTab === 'cc1' ? 'bg-white text-[#4CAF50]' : 'bg-[#4CAF50] text-white'} px-2 py-0.5 rounded-full text-xs font-bold`}>
                                    {totalAvailable}
                                </span>
                            </div>
                        </button>

                        {/* Cost Center 2 Tab */}
                        <button
                            onClick={() => setActiveTab('cc2')}
                            className={`flex-1 rounded-lg px-4 py-3 font-bold text-sm transition-all ${
                                activeTab === 'cc2'
                                    ? 'bg-[#ff8307] text-white border-2 border-[#ff8307] shadow-lg'
                                    : 'bg-[#ff8307]/10 text-[#ff8307] border-2 border-[#ff8307]/50 hover:bg-[#ff8307]/20'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>⏳</span>
                                <span className="hidden @md:inline">CC2</span>
                                <span className={`${activeTab === 'cc2' ? 'bg-white text-[#ff8307]' : 'bg-[#ff8307] text-white'} px-2 py-0.5 rounded-full text-xs font-bold`}>
                                    {totalInQueue}
                                </span>
                            </div>
                        </button>

                        {/* Cost Center 5 Tab */}
                        <button
                            onClick={() => setActiveTab('cc5')}
                            className={`flex-1 rounded-lg px-4 py-3 font-bold text-sm transition-all ${
                                activeTab === 'cc5'
                                    ? 'bg-[#F44336] text-white border-2 border-[#F44336] shadow-lg'
                                    : 'bg-[#F44336]/10 text-[#F44336] border-2 border-[#F44336]/50 hover:bg-[#F44336]/20'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>🔧</span>
                                <span className="hidden @md:inline">CC5</span>
                                <span className={`${activeTab === 'cc5' ? 'bg-white text-[#F44336]' : 'bg-[#F44336] text-white'} px-2 py-0.5 rounded-full text-xs font-bold`}>
                                    {totalAtRepair}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0">
                        {activeTab === 'cc1' && (
                            <StatusCard
                                title="Cost Center 1 - Available & Ready"
                                machines={groupedMachines.available}
                                statusColor="success"
                                icon="✅"
                            />
                        )}
                        {activeTab === 'cc2' && (
                            <StatusCard
                                title="Cost Center 2 - Queue for Repair"
                                machines={groupedMachines.queueForRepair}
                                statusColor="warning"
                                icon="⏳"
                            />
                        )}
                        {activeTab === 'cc5' && (
                            <StatusCard
                                title="Cost Center 5 - At Repair Shop"
                                machines={groupedMachines.atRepairShop}
                                statusColor="error"
                                icon="🔧"
                            />
                        )}
                    </div>
                </div>

                {/* 
                    Full View: > @5xl (1024px+)
                    Shows all 3 columns side-by-side
                */}
                <div className="hidden @5xl:grid h-full grid-cols-3 gap-4">
                    <StatusCard
                        title="Cost Center 1"
                        machines={groupedMachines.available}
                        statusColor="success"
                        icon="✅"
                    />
                    <StatusCard
                        title="Cost Center 2"
                        machines={groupedMachines.queueForRepair}
                        statusColor="warning"
                        icon="⏳"
                    />
                    <StatusCard
                        title="Cost Center 5"
                        machines={groupedMachines.atRepairShop}
                        statusColor="error"
                        icon="🔧"
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
