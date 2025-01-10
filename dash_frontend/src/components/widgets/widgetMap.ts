import SalesByMonthComparisonBar from "./SalesByMonthComparisonBar";
import SalesByMonthBar from "./SalesByMonthBar";
import TopCustomersThisYearPie from "./TopCustomersThisYearPie";
import Overview from "./Overview";

const widgetMap: Record<string, React.ComponentType> = {
    SalesByMonthComparisonBar: SalesByMonthComparisonBar,
    SalesByMonthBar: SalesByMonthBar,
    TopCustomersThisYearPie: TopCustomersThisYearPie,
    Overview: Overview
};

export default widgetMap;