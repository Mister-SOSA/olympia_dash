import React, { useMemo, useCallback } from "react";
import Widget from "./Widget";
import { nFormatter, calculatePercentageChange } from "@/utils/helpers";
import config from "@/config";
import { SalesData } from "@/types";
import { MdAttachMoney } from "react-icons/md";

/* -------------------------------------- */
/* Widget Metadata                        */
/* -------------------------------------- */
export const overviewWidgetMeta = {
    id: "Overview",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    enabled: true,
    displayName: "Sales Overview",
    category: "Sales",
    description: "Displays an overview of sales metrics.",
    icon: <MdAttachMoney />,
};

/* -------------------------------------- */
/* 📊 OverviewWidget Component            */
/* -------------------------------------- */

const OverviewWidget = ({ data }: { data: SalesData[] }) => {
    const now = new Date();
    const todayGMT = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const metrics = useMemo(() => {
        const dailyData = data.map((entry) => ({
            ...entry,
            date: new Date(entry.period),
        }));

        // Year-to-Date (YTD)
        const startOfYearGMT = new Date(Date.UTC(todayGMT.getUTCFullYear(), 0, 1));
        const totalSalesYTD = dailyData
            .filter((entry) => entry.date >= startOfYearGMT && entry.date <= todayGMT)
            .reduce((sum, entry) => sum + entry.total, 0);

        const startOfPreviousYearGMT = new Date(Date.UTC(todayGMT.getUTCFullYear() - 1, 0, 1));
        const sameDayPreviousYearGMT = new Date(todayGMT);
        sameDayPreviousYearGMT.setUTCFullYear(todayGMT.getUTCFullYear() - 1);
        const totalSalesPreviousYTD = dailyData
            .filter((entry) => entry.date >= startOfPreviousYearGMT && entry.date <= sameDayPreviousYearGMT)
            .reduce((sum, entry) => sum + entry.total, 0);

        // Monthly Sales
        const startOfCurrentMonthGMT = new Date(Date.UTC(todayGMT.getUTCFullYear(), todayGMT.getUTCMonth(), 1));
        const startOfPreviousYearSameMonthGMT = new Date(
            Date.UTC(todayGMT.getUTCFullYear() - 1, todayGMT.getUTCMonth(), 1)
        );
        const totalSalesCurrentMonth = dailyData
            .filter((entry) => entry.date >= startOfCurrentMonthGMT && entry.date <= todayGMT)
            .reduce((sum, entry) => sum + entry.total, 0);

        const totalSalesPreviousMonth = dailyData
            .filter(
                (entry) =>
                    entry.date >= startOfPreviousYearSameMonthGMT &&
                    entry.date <= new Date(
                        Date.UTC(
                            startOfPreviousYearSameMonthGMT.getUTCFullYear(),
                            startOfPreviousYearSameMonthGMT.getUTCMonth(),
                            todayGMT.getUTCDate()
                        )
                    )
            )
            .reduce((sum, entry) => sum + entry.total, 0);

        // Rolling 7-Day Sales
        const rolling7DaysStartGMT = new Date(todayGMT);
        rolling7DaysStartGMT.setUTCDate(todayGMT.getUTCDate() - 8);
        const rolling7DaysEndGMT = todayGMT;

        const previousRolling7DaysStartGMT = new Date(rolling7DaysStartGMT);
        previousRolling7DaysStartGMT.setUTCDate(previousRolling7DaysStartGMT.getUTCDate() - 8);
        const previousRolling7DaysEndGMT = new Date(rolling7DaysStartGMT);
        previousRolling7DaysEndGMT.setUTCDate(rolling7DaysStartGMT.getUTCDate() - 1);

        const totalSalesRolling7Days = dailyData
            .filter((entry) => entry.date >= rolling7DaysStartGMT && entry.date <= rolling7DaysEndGMT)
            .reduce((sum, entry) => sum + entry.total, 0);

        const totalSalesPreviousRolling7Days = dailyData
            .filter((entry) => entry.date >= previousRolling7DaysStartGMT && entry.date <= previousRolling7DaysEndGMT)
            .reduce((sum, entry) => sum + entry.total, 0);

        // Sales Today (GMT)
        const totalSalesToday = dailyData
            .filter((entry) => {
                const entryDate = new Date(entry.date);
                const normalizedEntryDate = new Date(
                    Date.UTC(entryDate.getUTCFullYear(), entryDate.getUTCMonth(), entryDate.getUTCDate())
                );
                return normalizedEntryDate.getTime() === todayGMT.getTime();
            })
            .reduce((sum, entry) => sum + entry.total, 0);

        return {
            totalSalesYTD,
            totalSalesPreviousYTD,
            totalSalesCurrentMonth,
            totalSalesPreviousMonth,
            totalSalesRolling7Days,
            totalSalesPreviousRolling7Days,
            totalSalesToday,
        };
    }, [data, todayGMT]);

    const {
        totalSalesYTD,
        totalSalesPreviousYTD,
        totalSalesCurrentMonth,
        totalSalesPreviousMonth,
        totalSalesRolling7Days,
        totalSalesPreviousRolling7Days,
        totalSalesToday,
    } = metrics;

    return (
        <div className="overview-widget">
            <OverviewSubwidget
                title="Sales YTD"
                value={totalSalesYTD}
                subtitle={calculatePercentageChange(totalSalesYTD, totalSalesPreviousYTD)}
            />
            <OverviewSubwidget
                title="Sales This Month"
                value={totalSalesCurrentMonth}
                subtitle={calculatePercentageChange(totalSalesCurrentMonth, totalSalesPreviousMonth)}
            />
            <OverviewSubwidget
                title="Sales Last 7 Days"
                value={totalSalesRolling7Days}
                subtitle={calculatePercentageChange(totalSalesRolling7Days, totalSalesPreviousRolling7Days)}
            />
            <OverviewSubwidget
                title="Sales Today"
                value={totalSalesToday}
                subtitle=""
            />
        </div>
    );
};

const OverviewSubwidget = ({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: number;
    subtitle: string;
}) => {
    const subtitleClass = (() => {
        if (subtitle.startsWith("+")) return "percent positive";
        if (subtitle.startsWith("-")) return "percent negative";
        return "percent neutral";
    })();

    return (
        <div className="overview-subwidget">
            <div className="overview-header-container">
                <div className="overview-subwidget-value">${nFormatter(value, 2)}</div>
                <div className={`overview-subwidget-subtitle ${subtitleClass}`}>{subtitle}</div>
            </div>
            <div className="overview-subwidget-title">{title}</div>
        </div>
    );
};

/* -------------------------------------- */
/* 📊 Main Overview Component             */
/* -------------------------------------- */

export default function Overview() {
    const previousYearStart = useMemo(
        () => new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split("T")[0],
        []
    );
    const currentDate = useMemo(() => new Date().toISOString().split("T")[0], []);
    const sevenDaysAgoDate = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return sevenDaysAgo.toISOString().split("T")[0];
    }, []);

    const widgetPayload = useMemo(
        () => ({
            module: "Overview",
            raw_query: `
        -- Fetch sales data for the last 7 days from orditem
        SELECT 
            FORMAT(duedate, 'yyyy-MM-dd') AS period,
            SUM(ext_price) AS total
        FROM 
            orditem
        WHERE 
            duedate >= '${sevenDaysAgoDate}'
            AND duedate <= '${currentDate}'
        GROUP BY 
            FORMAT(duedate, 'yyyy-MM-dd')

        UNION ALL

        -- Fetch sales data beyond the last 7 days (within the full year) from sumsales
        SELECT 
            FORMAT(sale_date, 'yyyy-MM-dd') AS period,
            SUM(sales_dol) AS total
        FROM 
            sumsales
        WHERE 
            sale_date >= '${previousYearStart}'
            AND sale_date < '${sevenDaysAgoDate}'
            AND sale_date <= '${currentDate}'
        GROUP BY 
            FORMAT(sale_date, 'yyyy-MM-dd')

        ORDER BY 
            period ASC;
      `,
        }),
        [sevenDaysAgoDate, currentDate, previousYearStart]
    );

    const renderOverview = useCallback((data: SalesData[]) => {
        return <OverviewWidget data={data} />;
    }, []);

    return (
        <Widget
            apiEndpoint={`${config.API_BASE_URL}/api/widgets`}
            payload={widgetPayload}
            title=""
            updateInterval={300000}
            render={renderOverview}
        />
    );
}