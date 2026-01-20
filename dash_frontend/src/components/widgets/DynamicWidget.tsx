/**
 * Dynamic Widget Renderer
 * 
 * A high-performance, type-safe component that renders custom widgets
 * based on their configuration. Supports multiple visualization types
 * with automatic data fetching, error handling, and responsive layouts.
 * 
 * @module DynamicWidget
 */

import React, { useMemo, memo, Suspense } from 'react';
import Widget from './Widget';
import { Loader } from '@/components/ui/loader';
import { useCustomWidget } from '@/hooks/useCustomWidgets';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';
import type {
    CustomWidgetDefinition,
    DataSourceConfig,
    VisualizationConfig,
    VisualizationType,
} from '@/types';

// Lazy load visualization components for code splitting
const BarChartVisualization = React.lazy(() => import('./visualizations/BarChartViz'));
const LineChartVisualization = React.lazy(() => import('./visualizations/LineChartViz'));
const PieChartVisualization = React.lazy(() => import('./visualizations/PieChartViz'));
const TableVisualization = React.lazy(() => import('./visualizations/TableViz'));
const SingleValueVisualization = React.lazy(() => import('./visualizations/SingleValueViz'));
const GaugeVisualization = React.lazy(() => import('./visualizations/GaugeViz'));

// ============================================
// Types
// ============================================

interface DynamicWidgetProps {
    /** The custom widget ID (e.g., "cw_abc123") */
    widgetId: string;
    /** Optional: Pre-loaded widget definition (skips fetch) */
    definition?: CustomWidgetDefinition;
    /** Optional: Override the widget title */
    titleOverride?: string;
}

interface VisualizationProps {
    data: any[];
    config: VisualizationConfig;
    loading: boolean;
    error?: string;
}

// ============================================
// Visualization Component Map
// ============================================

const VISUALIZATION_COMPONENTS: Record<
    VisualizationType,
    React.LazyExoticComponent<React.ComponentType<VisualizationProps>>
> = {
    bar: BarChartVisualization,
    line: LineChartVisualization,
    pie: PieChartVisualization,
    table: TableVisualization,
    single_value: SingleValueVisualization,
    gauge: GaugeVisualization,
    custom: React.lazy(() => Promise.resolve({
        default: () => <div className="text-muted text-center p-4">Custom templates coming soon</div>
    })),
};

// ============================================
// Data Source Payload Builder
// ============================================

function buildWidgetPayload(dataSource: DataSourceConfig): object | undefined {
    switch (dataSource.type) {
        case 'none':
        case 'static':
            return undefined;

        case 'query_registry':
            return {
                module: 'CustomWidget',
                queryId: dataSource.queryId,
                params: dataSource.params || {},
            };

        case 'api_endpoint':
            // For custom endpoints, we return the params as the payload
            return dataSource.params;

        default:
            return undefined;
    }
}

function getEndpoint(dataSource: DataSourceConfig): string | undefined {
    switch (dataSource.type) {
        case 'none':
        case 'static':
            return undefined;

        case 'query_registry':
            return '/api/widgets';

        case 'api_endpoint':
            return dataSource.endpoint;

        default:
            return undefined;
    }
}

// ============================================
// Visualization Renderer
// ============================================

const VisualizationRenderer = memo(function VisualizationRenderer({
    visualizationType,
    data,
    config,
    loading,
    error,
}: {
    visualizationType: VisualizationType;
    data: any[];
    config: VisualizationConfig;
    loading: boolean;
    error?: string;
}) {
    const VisualizationComponent = VISUALIZATION_COMPONENTS[visualizationType];

    if (!VisualizationComponent) {
        return (
            <div className="flex items-center justify-center h-full text-muted">
                Unknown visualization type: {visualizationType}
            </div>
        );
    }

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader /></div>}>
            <VisualizationComponent
                data={data}
                config={config}
                loading={loading}
                error={error}
            />
        </Suspense>
    );
});

// ============================================
// Static Data Widget (no fetching)
// ============================================

const StaticDataWidget = memo(function StaticDataWidget({
    definition,
    titleOverride,
}: {
    definition: CustomWidgetDefinition;
    titleOverride?: string;
}) {
    const staticData = definition.data_source.staticData || [];

    return (
        <div className="h-full w-full">
            <Widget
                title={titleOverride || definition.title}
                endpoint={undefined}
                payload={undefined}
                refreshInterval={0}
                widgetId={`custom:${definition.id}`}
            >
                {() => (
                    <VisualizationRenderer
                        visualizationType={definition.visualization_type}
                        data={staticData}
                        config={definition.config}
                        loading={false}
                    />
                )}
            </Widget>
        </div>
    );
});

// ============================================
// Dynamic Data Widget (with fetching)
// ============================================

const DynamicDataWidget = memo(function DynamicDataWidget({
    definition,
    titleOverride,
}: {
    definition: CustomWidgetDefinition;
    titleOverride?: string;
}) {
    const { settings } = useWidgetSettings(`custom:${definition.id}`);

    // Build the payload based on data source config
    const payload = useMemo(
        () => buildWidgetPayload(definition.data_source),
        [definition.data_source]
    );

    const endpoint = useMemo(
        () => getEndpoint(definition.data_source),
        [definition.data_source]
    );

    const refreshInterval = definition.data_source.refreshInterval || 60000;

    return (
        <div className="h-full w-full">
            <Widget
                title={titleOverride || definition.title}
                endpoint={endpoint}
                payload={payload}
                refreshInterval={refreshInterval}
                widgetId={`custom:${definition.id}`}
            >
                {(data: any[], loading: boolean, error?: string) => (
                    <VisualizationRenderer
                        visualizationType={definition.visualization_type}
                        data={data || []}
                        config={definition.config}
                        loading={loading}
                        error={error}
                    />
                )}
            </Widget>
        </div>
    );
});

// ============================================
// Main Component
// ============================================

/**
 * DynamicWidget - Renders a custom widget based on its configuration
 * 
 * This component handles:
 * - Loading widget definition (if not provided)
 * - Building appropriate data fetching payload
 * - Selecting the correct visualization component
 * - Error boundaries and loading states
 * 
 * @example
 * // With widget ID (fetches definition)
 * <DynamicWidget widgetId="cw_abc123" />
 * 
 * @example
 * // With pre-loaded definition
 * <DynamicWidget widgetId={widget.id} definition={widget} />
 */
function DynamicWidget({ widgetId, definition: providedDefinition, titleOverride }: DynamicWidgetProps) {
    // Fetch definition if not provided
    const { widget: fetchedWidget, loading, error } = useCustomWidget(
        providedDefinition ? null : widgetId
    );

    const definition = providedDefinition || fetchedWidget;

    // Loading state
    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    // Error state
    if (error || !definition) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-4">
                <div className="text-ui-danger-text text-sm font-medium">
                    Failed to load widget
                </div>
                <div className="text-muted text-xs">
                    {error || 'Widget not found'}
                </div>
            </div>
        );
    }

    // Render based on data source type
    if (definition.data_source.type === 'none' || definition.data_source.type === 'static') {
        return <StaticDataWidget definition={definition} titleOverride={titleOverride} />;
    }

    return <DynamicDataWidget definition={definition} titleOverride={titleOverride} />;
}

export default memo(DynamicWidget);

// ============================================
// Exports for direct visualization access
// ============================================

export { VisualizationRenderer };
export type { VisualizationProps, DynamicWidgetProps };
