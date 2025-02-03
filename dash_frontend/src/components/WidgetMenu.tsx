import { Widget } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
                    <CardTitle>Select Widgets</CardTitle>
                </CardHeader>
                <CardContent>
                    {masterWidgetList.map((widget) => (
                        <div key={widget.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                                checked={tempLayout.find((w) => w.id === widget.id)?.enabled ?? false}
                                onCheckedChange={() => toggleWidgetEnabled(widget.id)}
                                className="widget-menu-checkbox"
                            />
                            <label className="text-sm font-medium">{widget.id}</label>
                        </div>
                    ))}
                </CardContent>
                <CardFooter className="widget-menu-footer">
                    <Button onClick={handleCancel} variant="destructive">
                        Cancel
                    </Button>
                    <Button className="bg-blue-600 text-white" onClick={handleSave}>
                        Save
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Menu;