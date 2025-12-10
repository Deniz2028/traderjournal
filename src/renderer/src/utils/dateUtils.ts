export const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
};

export const getDaysInMonth = (year: number, monthIndex: number): number => {
    return new Date(year, monthIndex + 1, 0).getDate();
};

export const getMonthName = (monthIndex: number): string => {
    const date = new Date(2000, monthIndex, 1);
    return date.toLocaleDateString("en-US", { month: "long" });
};
