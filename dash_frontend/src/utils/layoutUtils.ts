import { Widget } from "@/types";
import { LOCAL_STORAGE_KEY, COLUMN_COUNT } from "@/constants/dashboard";
import { masterWidgetList } from "@/constants/widgets";

export const readLayoutFromStorage = (): Widget[] => {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLayout) {
        const parsedLayout: Widget[] = JSON.parse(savedLayout);
        return masterWidgetList.map((widget) => ({
            ...widget,
            ...parsedLayout.find((saved) => saved.id === widget.id),
        }));
    }
    return masterWidgetList;
};

export const saveLayoutToStorage = (layout: Widget[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(layout));
};

export const validateLayout = (layout: Widget[], columnCount: number = COLUMN_COUNT): Widget[] =>
    layout.map((widget) => ({
        ...widget,
        w: Math.min(widget.w, columnCount),
        x: Math.min(widget.x, columnCount - widget.w),
    }));