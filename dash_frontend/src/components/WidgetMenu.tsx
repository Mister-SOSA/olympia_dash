import { Widget } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getWidgetsByCategory } from "@/constants/widgets";

interface MenuProps {
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
}

const Menu: React.FC<MenuProps> = ({
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const widgetsByCategory = getWidgetsByCategory();

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    const filteredCategories = Object.entries(widgetsByCategory).reduce((acc, [category, widgets]) => {
        const filtered = widgets.filter(widget =>
            widget.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            widget.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filtered.length > 0) {
            acc[category] = filtered;
        }

        return acc;
    }, {} as Record<string, typeof widgetsByCategory[string]>);

    const toggleWidgetEnabled = (id: string, newEnabled: boolean) => {
        const widgetDef = Object.values(widgetsByCategory)
            .flat()
            .find(w => w.id === id);

        if (!widgetDef) return;

        const existingWidget = tempLayout.find(w => w.id === id);

        if (existingWidget) {
            // Update existing widget
            setTempLayout((prev: Widget[]) =>
                prev.map((widget: Widget) => (widget.id === id ? { ...widget, enabled: newEnabled } : widget))
            );
        } else if (newEnabled) {
            // Add new widget
            const newWidget: Widget = {
                id: id,
                x: 0,
                y: 0,
                w: widgetDef.defaultSize.w,
                h: widgetDef.defaultSize.h,
                enabled: newEnabled,
                displayName: widgetDef.title,
                category: widgetDef.category,
                description: widgetDef.description
            };

            setTempLayout(prev => [...prev, newWidget]);
        }
    };

    const clearDashboard = () => {

        setTempLayout((prev) => prev.map((widget) => ({ ...widget, enabled: false })));
    };

    return (
        <div className="shade">
            <Card className="widget-menu">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-center">⚙️ Manage Widgets</CardTitle>
                </CardHeader>
                <CardContent className="widget-menu-content">
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="🔎 Search widgets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="widget-search-input mb-4 p-2 w-full border border-[--border-light] rounded-lg bg-[--background-dark]"
                    />

                    {/* Group widgets by category */}
                    {Object.entries(filteredCategories).map(([category, widgets]) => {
                        // If there's a search term, force the dropdown to be expanded.
                        const isExpanded =
                            searchTerm.length > 0 ||
                            (expandedCategories[category] !== undefined ? expandedCategories[category] : false);
                        return (
                            <div key={category} className="mb-4 align-items-center">
                                <div
                                    className="flex items-center bg-[--background-light] justify-between cursor-pointer p-2 border border-[--border-light] rounded-lg widget-category-dropdown"
                                    onClick={() => toggleCategory(category)}
                                >
                                    <h3 className="text-lg font-semibold">{category}</h3>
                                    <span className="font-black text-xl category-expand-icon">{isExpanded ? "-" : "+"}</span>
                                </div>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {widgets.map((widget) => (
                                                <div key={widget.id} className="flex items-center space-x-2 m-1 p-1">
                                                    <Checkbox
                                                        checked={
                                                            tempLayout.find((w) => w.id === widget.id)?.enabled ?? false
                                                        }
                                                        onCheckedChange={(checked: boolean) =>
                                                            toggleWidgetEnabled(widget.id, checked)
                                                        }
                                                        className="widget-menu-checkbox"
                                                    />
                                                    <Label className="text-sm font-medium flex items-center">
                                                        {widget.icon && <span className="mr-2">{widget.icon}</span>}
                                                        {widget.title}
                                                    </Label>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </CardContent>
                <CardFooter className="widget-menu-footer">
                    <Button onClick={handleCancel} variant="destructive">
                        Cancel
                    </Button>
                    <Button onClick={clearDashboard} className="bg-gray-600 hover:bg-gray-700 text-white">
                        Clear Dashboard
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-800 text-white" onClick={handleSave}>
                        Save
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Menu;