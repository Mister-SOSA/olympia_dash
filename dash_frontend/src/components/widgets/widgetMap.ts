import Sales6MoVsLastYear from "./Sales6MoVsLastYear";
import Sales6Mo from "./Sales6Mo";
import TopCustomersThisYear from "./TopCustomersThisYear";
import Overview from "./Overview";

const widgetMap: Record<string, React.ComponentType> = {
    Sales6MoVsLastYear: Sales6MoVsLastYear,
    Sales6Mo: Sales6Mo,
    TopCustomersThisYear: TopCustomersThisYear,
    Overview: Overview
};

export default widgetMap;