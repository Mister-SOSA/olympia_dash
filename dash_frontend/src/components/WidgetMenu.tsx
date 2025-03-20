import { Widget } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MenuProps {
    masterWidgetList: Widget[];
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>;
    handleSave: () => void;
    handleCancel: () => void;
}

const Menu: React.FC<MenuProps> = ({
    masterWidgetList,
    tempLayout,
    setTempLayout,
    handleSave,
    handleCancel,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const filteredWidgets = masterWidgetList.filter(widget => {
        const term = searchTerm.toLowerCase();
        return (
            (widget.displayName && widget.displayName.toLowerCase().includes(term)) ||
            (widget.category && widget.category.toLowerCase().includes(term)) ||
            widget.id.toLowerCase().includes(term)
        );
    });

    const groupedWidgets = filteredWidgets.reduce((acc: Record<string, Widget[]>, widget) => {
        const category = widget.category || "Other";
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(widget);
        return acc;
    }, {} as Record<string, Widget[]>);

    const toggleWidgetEnabled = (id: string) => {
        setTempLayout((prev: Widget[]) =>
            prev.map((widget: Widget) =>
                widget.id === id ? { ...widget, enabled: !widget.enabled } : widget
            )
        );
    };

    return (
        <div className="shade">
            <Card className="widget-menu">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-center">⚙️ Manage Widgets</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="🔎 Search widgets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="widget-search-input mb-4 p-2 w-full border border-[--border-light] rounded-lg bg-[--background-dark]"
                    />

                    {/* Group widgets by category */}
                    {Object.keys(groupedWidgets).map((category) => {
                        const isExpanded = expandedCategories[category] !== undefined ? expandedCategories[category] : false;
                        return (
                            <div key={category} className="mb-4 align-items-center">
                                <div className="flex items-center bg-[--background-light] justify-between cursor-pointer p-2 border border-[--border-light] rounded-lg" onClick={() => toggleCategory(category)}>
                                    <h3 className="text-lg font-semibold">{category}</h3>
                                    <span className="font-black text-xl">{isExpanded ? '-' : '+'}</span>
                                </div>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {groupedWidgets[category].map(widget => (
                                                <div key={widget.id} className="flex items-center space-x-2 m-1 p-1">
                                                    <Checkbox
                                                        checked={tempLayout.find((w) => w.id === widget.id)?.enabled ?? false}
                                                        onCheckedChange={() => toggleWidgetEnabled(widget.id)}
                                                        className="widget-menu-checkbox"
                                                    />
                                                    <label className="text-sm font-medium flex items-center ">
                                                        {widget.icon && <span className="mr-2">{widget.icon}</span>}
                                                        {widget.displayName || widget.id}
                                                    </label>
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
                    <Button className="bg-blue-600 hover:bg-blue-800 text-white" onClick={handleSave}>
                        Save
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Menu;