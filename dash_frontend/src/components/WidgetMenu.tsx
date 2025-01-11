import { Widget } from "@/types";

interface MenuProps {
    masterWidgetList: Widget[];
    tempLayout: Widget[];
    setTempLayout: React.Dispatch<React.SetStateAction<Widget[]>>; // Correct type for state setter
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
        <div
            className="widget-menu"
        >
            <h3>Select Widgets</h3>
            {masterWidgetList.map((widget) => (
                <div key={widget.id}>
                    <input
                        type="checkbox"
                        checked={tempLayout.find((w) => w.id === widget.id)?.enabled ?? false}
                        onChange={() => toggleWidgetEnabled(widget.id)}
                    />
                    <label>{widget.id}</label>
                </div>
            ))}
            <div style={{ marginTop: "16px" }}>
                <button onClick={handleSave} style={{ marginRight: "8px" }}>
                    Save
                </button>
                <button onClick={handleCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default Menu;