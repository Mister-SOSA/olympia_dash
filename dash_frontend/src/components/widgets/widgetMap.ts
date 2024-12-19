import Sales6MoVsLastYear from "./Sales6MoVsLastYear";
import Sales6Mo from "./Sales6Mo";
import TopCustomersThisYear from "./TopCustomersThisYear";

const widgetMap: Record<string, React.ComponentType> = {
    Sales6MoVsLastYear: Sales6MoVsLastYear,
    Sales6Mo: Sales6Mo,
    TopCustomersThisYear: TopCustomersThisYear
};

export default widgetMap;