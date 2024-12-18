import Widget from "./Widget";
import { BarChart, Bar, XAxis, CartesianGrid, LabelList, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Utility Functions
const formatDate = (date: Date, day: number) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const calculateDates = () => {
    const todaysDate = new Date();
    const endOfMonth = new Date(todaysDate.getFullYear(), todaysDate.getMonth() + 1, 0);
    const sixMonthsAgo = new Date(endOfMonth);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const sixMonthsAgoLastYear = new Date(sixMonthsAgo);
    sixMonthsAgoLastYear.setFullYear(sixMonthsAgoLastYear.getFullYear() - 1);

    const endOfMonthLastYear = new Date(endOfMonth);
    endOfMonthLastYear.setFullYear(endOfMonthLastYear.getFullYear() - 1);

    return {
        sixMonthsAgoFormatted: formatDate(sixMonthsAgo, 1),
        endOfMonthFormatted: formatDate(endOfMonth, endOfMonth.getDate()),
        sixMonthsAgoLastYearFormatted: formatDate(sixMonthsAgoLastYear, 1),
        endOfMonthLastYearFormatted: formatDate(endOfMonthLastYear, endOfMonthLastYear.getDate()),
        currentYear: todaysDate.getFullYear(),
    };
};

const processData = (data: any[], currentYear: number) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dataMap = new Map<string, { currentYear: number; lastYear: number }>();

    data.forEach((item) => {
        const monthKey = item.month.split("-")[1];
        if (!dataMap.has(monthKey)) {
            // Initialize with the correct type
            dataMap.set(monthKey, { currentYear: 0, lastYear: 0 });
        }

        const year = parseInt(item.year, 10);
        const values = dataMap.get(monthKey)!; // Non-null assertion since we just initialized it

        if (year === currentYear) {
            values.currentYear = Math.trunc(item.total);
        } else {
            values.lastYear = Math.trunc(item.total);
        }
    });

    return Array.from(dataMap.entries()).map(([monthKey, values]) => ({
        month: monthNames[parseInt(monthKey, 10) - 1],
        currentYear: values.currentYear,
        lastYear: values.lastYear,
    }));
};

const nFormatter = (num: number, digits: number) => {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
        { value: 1e12, symbol: "T" },
    ];
    const item = lookup.findLast((item) => num >= item.value);
    return item
        ? (num / item.value).toFixed(digits).replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/, "").concat(item.symbol)
        : "0";
};

// Chart Component
const SalesChart = ({ data }: { data: any[] }) => {
    const { currentYear } = calculateDates();
    const groupedData = processData(data, currentYear);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={{}}>
                <BarChart accessibilityLayer data={groupedData} margin={{ top: 20 }} className="last-blinking">
                    <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="lastYear" fill="var(--accent-color)" radius={8}>
                        <LabelList
                            position="top"
                            offset={12}
                            className="fill-white"
                            fontSize={16}
                            fontWeight={600}
                            formatter={(value: number) => `$${nFormatter(value, 2)}`}
                        />
                    </Bar>
                    <Bar dataKey="currentYear" fill="var(--primary-color)" radius={8}>
                        <LabelList
                            position="top"
                            offset={12}
                            className="fill-white"
                            fontSize={16}
                            fontWeight={600}
                            formatter={(value: number) => `$${nFormatter(value, 2)}`}
                        />
                    </Bar>
                </BarChart>
            </ChartContainer>
        </ResponsiveContainer>
    );
};

// Main Widget Component
export default function Sales6MoVsLastYear() {
    const { sixMonthsAgoFormatted, endOfMonthFormatted, sixMonthsAgoLastYearFormatted, endOfMonthLastYearFormatted } =
        calculateDates();

    return (
        <Widget
            apiEndpoint="http://172.19.1.186:5001/api/widgets"
            payload={{
                table: "sumsales",
                columns: ["FORMAT(sale_date, 'yyyy-MM') AS month", "SUM(sales_dol) AS total", "YEAR(sale_date) AS year"],
                filters: `(
                    (sale_date >= '${sixMonthsAgoFormatted}' AND sale_date <= '${endOfMonthFormatted}') 
                    OR (sale_date >= '${sixMonthsAgoLastYearFormatted}' AND sale_date <= '${endOfMonthLastYearFormatted}')
                )`,
                group_by: ["FORMAT(sale_date, 'yyyy-MM')", "YEAR(sale_date)"],
                sort: ["month ASC", "year ASC"],
            }}
            title="Total Sales (Last 6 Months vs Last Year)"
            updateInterval={300000}
            render={(data) => <SalesChart data={data} />}
        />
    );
}