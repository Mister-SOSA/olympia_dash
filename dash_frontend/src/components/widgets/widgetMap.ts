import SalesByMonthComparisonBar from "./SalesByMonthComparisonBar";
import SalesByMonthBar from "./SalesByMonthBar";
import TopCustomersThisYearPie from "./TopCustomersThisYearPie";
import Overview from "./Overview";
import SalesByDayBar from "./SalesByDayBar";
import ClockWidget from "./ClockWidget";
import DateWidget from "./DateWidget";
import OutstandingOrdersTable from "./OutstandingOrdersTable";
import DailyDueInTable from "./DailyDueInTable";
import Humidity from "./Humidity";
import DailyMovesByUser from "./DailyMovesByUser";

const widgetMap: Record<string, React.ComponentType> = {
    SalesByMonthComparisonBar: SalesByMonthComparisonBar,
    SalesByMonthBar: SalesByMonthBar,
    TopCustomersThisYearPie: TopCustomersThisYearPie,
    Overview: Overview,
    SalesByDayBar: SalesByDayBar,
    ClockWidget: ClockWidget,
    DateWidget: DateWidget,
    OutstandingOrdersTable: OutstandingOrdersTable,
    DailyDueInTable: DailyDueInTable,
    Humidity: Humidity,
    DailyMovesByUser: DailyMovesByUser,
};

export default widgetMap;