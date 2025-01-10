import SalesByMonthComparisonBar from "./SalesByMonthComparisonBar";
import SalesByMonthBar from "./SalesByMonthBar";
import TopCustomersThisYearPie from "./TopCustomersThisYearPie";
import Overview from "./Overview";
import SalesByDayBar from "./SalesByDayBar";
import DateTimeWidget from "./DateTime";

const widgetMap: Record<string, React.ComponentType> = {
    SalesByMonthComparisonBar: SalesByMonthComparisonBar,
    SalesByMonthBar: SalesByMonthBar,
    TopCustomersThisYearPie: TopCustomersThisYearPie,
    Overview: Overview,
    SalesByDayBar: SalesByDayBar,
    DateTimeWidget: DateTimeWidget,
};

export default widgetMap;