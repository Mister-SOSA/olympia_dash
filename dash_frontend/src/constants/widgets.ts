import { Widget } from "@/types";
import { overviewWidgetMeta } from "@/components/widgets/Overview";
import { salesByDayBarMeta } from "@/components/widgets/SalesByDayBar";
import { salesByMonthBarMeta } from "@/components/widgets/SalesByMonthBar";
import { salesByMonthComparisonBarMeta } from "@/components/widgets/SalesByMonthComparisonBar";
import { clockWidgetMeta } from "@/components/widgets/ClockWidget";
import { dateWidgetMeta } from "@/components/widgets/DateWidget";
import { topCustomersThisYearPieMeta } from "@/components/widgets/TopCustomersThisYearPie";
import { outstandingOrdersTableMeta } from "@/components/widgets/OutstandingOrdersTable";
import { dailyDueInTableMeta } from "@/components/widgets/DailyDueInTable";
import { humidityWidgetMeta } from "@/components/widgets/Humidity";
import { dailyMovesByUserMeta } from "@/components/widgets/DailyMovesByUser";
import { inventoryMovesLogMeta } from "@/components/widgets/InventoryMovesLog";
import { dailyDueInHiddenVendTableMeta } from "@/components/widgets/DailyDueInHiddenVendTable";
import { topProductUnitSalesMeta } from "@/components/widgets/TopProductUnitSales";

export const masterWidgetList: Widget[] = [
    overviewWidgetMeta,
    salesByDayBarMeta,
    salesByMonthBarMeta,
    salesByMonthComparisonBarMeta,
    clockWidgetMeta,
    dateWidgetMeta,
    topCustomersThisYearPieMeta,
    outstandingOrdersTableMeta,
    dailyDueInTableMeta,
    humidityWidgetMeta,
    dailyMovesByUserMeta,
    inventoryMovesLogMeta,
    dailyDueInHiddenVendTableMeta,
    topProductUnitSalesMeta,
];