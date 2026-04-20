export const packageId = "analytics" as const;
export const packageDisplayName = "Analytics" as const;
export const packageDescription = "Metrics, marts, and analytics helper layer." as const;

export type MetricUnit = "count" | "currency" | "percent" | "duration-ms";

export type MetricDefinition = {
  id: string;
  label: string;
  unit: MetricUnit;
  description?: string | undefined;
  dimensions?: string[] | undefined;
};

export type SegmentDefinition = {
  id: string;
  label: string;
  dimension: string;
  matches(value: string): boolean;
};

export type MetricSnapshot = {
  metricId: string;
  value: number;
  capturedAt: string;
  dimensions: Record<string, string>;
};

export type MetricQuery = {
  metricIds: string[];
  from: string;
  to: string;
  segmentIds?: string[] | undefined;
  groupBy?: string[] | undefined;
};

export type AggregationResult = {
  metricId: string;
  count: number;
  sum: number;
  average: number;
};

export type MetricRegistry = {
  metrics: ReadonlyMap<string, MetricDefinition>;
  segments: ReadonlyMap<string, SegmentDefinition>;
};

export function defineMetric(metric: MetricDefinition): MetricDefinition {
  return Object.freeze({
    ...metric,
    dimensions: [...(metric.dimensions ?? [])]
  });
}

export function defineSegment(segment: SegmentDefinition): SegmentDefinition {
  return Object.freeze(segment);
}

export function createMetricRegistry(input: {
  metrics?: MetricDefinition[] | undefined;
  segments?: SegmentDefinition[] | undefined;
} = {}): MetricRegistry {
  return {
    metrics: new Map((input.metrics ?? []).map((metric) => [metric.id, metric])),
    segments: new Map((input.segments ?? []).map((segment) => [segment.id, segment]))
  };
}

export function snapshotMetric(
  metric: MetricDefinition,
  value: number,
  capturedAt = new Date(),
  dimensions: Record<string, string> = {}
): MetricSnapshot {
  return Object.freeze({
    metricId: metric.id,
    value,
    capturedAt: capturedAt.toISOString(),
    dimensions: Object.fromEntries(Object.entries(dimensions).sort(([left], [right]) => left.localeCompare(right)))
  });
}

export function evaluateSegment(segment: SegmentDefinition, snapshot: MetricSnapshot): boolean {
  const value = snapshot.dimensions[segment.dimension];
  return value ? segment.matches(value) : false;
}

export function aggregateSnapshots(snapshots: MetricSnapshot[], query: MetricQuery): AggregationResult[] {
  return query.metricIds.map((metricId) => {
    const matches = snapshots.filter(
      (snapshot) =>
        snapshot.metricId === metricId &&
        snapshot.capturedAt >= query.from &&
        snapshot.capturedAt <= query.to
    );
    const sum = matches.reduce((total, snapshot) => total + snapshot.value, 0);
    return {
      metricId,
      count: matches.length,
      sum,
      average: matches.length === 0 ? 0 : sum / matches.length
    };
  });
}
