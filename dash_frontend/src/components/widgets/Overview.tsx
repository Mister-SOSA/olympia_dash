import React from "react";
import Widget from "./Widget";
import { calculateDates, processData, nFormatter } from "@/utils/helpers";
import config from "@/config";
import { SalesData } from "@/types";

const OverviewWidget = ({ data }: { data: SalesData[] }) => {
    const { currentYear } = calculateDates(12);
    const groupedData = React.useMemo(() => processData(data, currentYear), [data, currentYear]);

    console.log(
        "This YTD sales", groupedData[groupedData.length - 1].currentYear,
        "Last YTD sales", groupedData[groupedData.length - 1].lastYear
    );

    return (
        <div className="overview-widget">
            <div className="overview-subwidget">
                <div className="overview-header-container">
                    <div className="overview-subwidget-value">${nFormatter(groupedData.reduce((acc, { currentYear }) => acc + currentYear, 0), 2)}</div>
                    <div className="overview-subwidget-subtitle percent">
                        {(groupedData[groupedData.length - 1].currentYear >= groupedData[groupedData.length - 1].lastYear ? '+' : '-')
                            + nFormatter(Math.abs((groupedData[groupedData.length - 1].currentYear / groupedData.reduce((acc, { currentYear }) => acc + currentYear, 0)) * 100), 2)}%
                    </div>
                </div>
                <div className="overview-subwidget-title">Sales YTD</div>
            </div>
            <div className="overview-subwidget this-month">
                <div className="overview-header-container">
                    <div className="overview-subwidget-value">${nFormatter(groupedData[groupedData.length - 1].currentYear, 2)}</div>
                    <div className="overview-subwidget-subtitle percent">
                        {(groupedData[groupedData.length - 1].currentYear >= groupedData[groupedData.length - 2].currentYear ? '+' : '-')
                            + nFormatter(Math.abs((groupedData[groupedData.length - 1].currentYear - groupedData[groupedData.length - 2].currentYear) / groupedData[groupedData.length - 2].currentYear * 100), 2)}%
                    </div>
                </div>
                <div className="overview-subwidget-title">Sales This Month</div>
            </div>
            <div className="overview-subwidget this-week">
                <div className="overview-header-container">
                    <div className="overview-subwidget-value">${nFormatter(groupedData[groupedData.length - 1].currentYear, 2)}</div>
                    <div className="overview-subwidget-subtitle percent">
                        {(groupedData[groupedData.length - 1].currentYear >= groupedData[groupedData.length - 2].currentYear ? '+' : '-')
                            + nFormatter(Math.abs((groupedData[groupedData.length - 1].currentYear - groupedData[groupedData.length - 2].currentYear) / groupedData[groupedData.length - 2].currentYear * 100), 2)}%
                    </div>
                </div>
                <div className="overview-subwidget-title">Sales This Week</div>
            </div>
        </div>
    );
}

export default function Overview() {
    const {
        startDateLastYearFormatted,
        endOfMonthFormatted,
    } = calculateDates(12);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM') AS month", "SUM(sales_dol) AS total", "YEAR(sale_date) AS year"],
                filters: `(
                    (sale_date >= '${startDateLastYearFormatted}' AND sale_date <= '${endOfMonthFormatted}') 
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
                sort: ["month ASC", "year ASC"],
            }}
            title=""
            updateInterval={300000}
            render={(data: SalesData[]) => <OverviewWidget data={data} />}
        />
    );
}