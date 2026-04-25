export const packageId = "analytics" as const;
export const packageDisplayName = "Analytics" as const;
export const packageDescription =
  "Metrics, semantic BI contracts, and analytics helper layer." as const;

/* -------------------------------------------------------------------------- */
/* Legacy metric snapshots                                                     */
/* -------------------------------------------------------------------------- */

export type MetricUnit =
  | "count"
  | "currency"
  | "percent"
  | "duration-ms"
  | "number";

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

export type SnapshotMetricQuery = {
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
    dimensions: [...(metric.dimensions ?? [])],
  });
}

export function defineSegment(segment: SegmentDefinition): SegmentDefinition {
  return Object.freeze(segment);
}

export function createMetricRegistry(
  input: {
    metrics?: MetricDefinition[] | undefined;
    segments?: SegmentDefinition[] | undefined;
  } = {},
): MetricRegistry {
  return {
    metrics: new Map((input.metrics ?? []).map((metric) => [metric.id, metric])),
    segments: new Map(
      (input.segments ?? []).map((segment) => [segment.id, segment]),
    ),
  };
}

export function snapshotMetric(
  metric: MetricDefinition,
  value: number,
  capturedAt = new Date(),
  dimensions: Record<string, string> = {},
): MetricSnapshot {
  return Object.freeze({
    metricId: metric.id,
    value,
    capturedAt: capturedAt.toISOString(),
    dimensions: Object.fromEntries(
      Object.entries(dimensions).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  });
}

export function evaluateSegment(
  segment: SegmentDefinition,
  snapshot: MetricSnapshot,
): boolean {
  const value = snapshot.dimensions[segment.dimension];
  return value ? segment.matches(value) : false;
}

export function aggregateSnapshots(
  snapshots: MetricSnapshot[],
  query: SnapshotMetricQuery,
): AggregationResult[] {
  return query.metricIds.map((metricId) => {
    const matches = snapshots.filter(
      (snapshot) =>
        snapshot.metricId === metricId &&
        snapshot.capturedAt >= query.from &&
        snapshot.capturedAt <= query.to,
    );
    const sum = matches.reduce((total, snapshot) => total + snapshot.value, 0);
    return {
      metricId,
      count: matches.length,
      sum,
      average: matches.length === 0 ? 0 : sum / matches.length,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Native BI contracts                                                         */
/* -------------------------------------------------------------------------- */

export type AnalyticsFieldType =
  | "string"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "datetime"
  | "boolean";

export type MetricAggregation =
  | "count"
  | "count_distinct"
  | "sum"
  | "avg"
  | "min"
  | "max";

export type QueryFilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "is_empty"
  | "is_not_empty";

export type ChartKind =
  | "table"
  | "line"
  | "bar"
  | "area"
  | "donut"
  | "funnel"
  | "big_number"
  | "gauge"
  | "treemap"
  | "map";

export const supportedChartKinds: readonly ChartKind[] = [
  "table",
  "line",
  "bar",
  "area",
  "donut",
  "funnel",
  "big_number",
  "gauge",
  "treemap",
  "map",
] as const;

export type DashboardTileKind =
  | "chart"
  | "markdown"
  | "heading"
  | "spacer";

export type ScheduleTargetKind =
  | "email"
  | "slack"
  | "teams"
  | "google_chat"
  | "webhook";

export type ValidationSeverity = "info" | "warning" | "error";

export type ValidationTargetKind =
  | "explore"
  | "query"
  | "chart"
  | "dashboard"
  | "space"
  | "schedule"
  | "share";

export interface AnalyticsDimension {
  id: string;
  label: string;
  type: AnalyticsFieldType;
  sourceField: string;
  description?: string;
  group?: string;
  hidden?: boolean;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  aggregation: MetricAggregation;
  sourceField?: string;
  unit?: MetricUnit;
  description?: string;
  format?: "number" | "currency" | "percent" | "compact" | "duration_ms";
  currency?: string;
  hidden?: boolean;
}

export interface AnalyticsExplore {
  id: string;
  label: string;
  resource: string;
  description?: string;
  dimensions: AnalyticsDimension[];
  metrics: AnalyticsMetric[];
  defaultQuery?: Partial<MetricQuery>;
  tags?: string[];
  owner?: string;
  freshnessField?: string;
  updatedAt?: string;
}

export interface QueryFilter {
  fieldId: string;
  operator: QueryFilterOperator;
  value?: unknown;
  to?: unknown;
}

export interface QuerySort {
  fieldId: string;
  dir: "asc" | "desc";
}

export interface TableCalculation {
  id: string;
  label: string;
  expression: string;
  format?: "number" | "currency" | "percent" | "compact";
}

export interface CustomMetric {
  id: string;
  label: string;
  aggregation: MetricAggregation;
  sourceField?: string;
  unit?: MetricUnit;
  format?: "number" | "currency" | "percent" | "compact";
}

export interface MetricQuery {
  exploreId: string;
  dimensions: string[];
  metrics: string[];
  filters?: QueryFilter[];
  sorts?: QuerySort[];
  limit?: number;
  pivotDimensions?: string[];
  tableCalculations?: TableCalculation[];
  customMetrics?: CustomMetric[];
  timezone?: string;
}

export interface QueryColumn {
  fieldId: string;
  label: string;
  type: AnalyticsFieldType;
  role: "dimension" | "metric" | "calculation";
  format?: string;
}

export interface QueryResult {
  query: MetricQuery;
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  totalRows: number;
  sourceRows: number;
  compiledSql: string;
  ranAt: string;
  warnings: string[];
}

export interface CompiledSql {
  query: MetricQuery;
  sql: string;
  dialect: "local-records" | "postgres" | "snowflake" | "bigquery";
  warnings: string[];
}

export interface ChartConfig {
  kind: ChartKind;
  xField?: string;
  yFields?: string[];
  groupField?: string;
  valueField?: string;
  labelField?: string;
  title?: string;
  stacked?: boolean;
  showLegend?: boolean;
  showValues?: boolean;
}

export interface SavedChart {
  id: string;
  name: string;
  description?: string;
  exploreId: string;
  query: MetricQuery;
  config: ChartConfig;
  spaceId?: string;
  pinned?: boolean;
  favorite?: boolean;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartVersion {
  id: string;
  chartId: string;
  version: number;
  chart: SavedChart;
  createdBy?: string;
  createdAt: string;
  reason?: string;
}

export interface DashboardTile {
  id: string;
  kind: DashboardTileKind;
  chartId?: string;
  title?: string;
  markdown?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tabId?: string;
}

export interface DashboardTab {
  id: string;
  label: string;
  order: number;
}

export interface DashboardFilter {
  id: string;
  label: string;
  fieldId: string;
  defaultValue?: unknown;
}

export interface DashboardContent {
  id: string;
  name: string;
  description?: string;
  spaceId?: string;
  tabs: DashboardTab[];
  filters: DashboardFilter[];
  tiles: DashboardTile[];
  pinned?: boolean;
  favorite?: boolean;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardVersion {
  id: string;
  dashboardId: string;
  version: number;
  dashboard: DashboardContent;
  createdBy?: string;
  createdAt: string;
  reason?: string;
}

export interface AnalyticsSpace {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  access: "private" | "team" | "organization";
  createdBy?: string;
  updatedAt: string;
}

export interface ShareUrl {
  id: string;
  token: string;
  targetKind: "chart" | "dashboard";
  targetId: string;
  includeFilters?: boolean;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ScheduledDelivery {
  id: string;
  name: string;
  targetKind: "chart" | "dashboard";
  targetId: string;
  cron: string;
  timezone: string;
  format: "csv" | "xlsx" | "pdf" | "image" | "json";
  enabled: boolean;
  includeLinks: boolean;
  targets: {
    kind: ScheduleTargetKind;
    address: string;
  }[];
  createdBy?: string;
  updatedAt: string;
}

export interface DeliveryRun {
  id: string;
  scheduleId: string;
  status: "queued" | "sent" | "failed" | "skipped";
  message?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface ValidationResult {
  id: string;
  targetKind: ValidationTargetKind;
  targetId: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  fixHint?: string;
  createdAt: string;
}

export interface WarehouseAdapter {
  id: string;
  label: string;
  compile(query: MetricQuery, explore: AnalyticsExplore): CompiledSql;
  run(query: MetricQuery, explore: AnalyticsExplore): Promise<QueryResult>;
}

export class UnsupportedWarehouseAdapterError extends Error {
  readonly adapterId: string;

  constructor(adapterId: string, message = "Warehouse adapter is not configured.") {
    super(message);
    this.name = "UnsupportedWarehouseAdapterError";
    this.adapterId = adapterId;
  }
}

export function createLocalRecordWarehouseAdapter(input: {
  id?: string;
  label?: string;
  rowsForResource: (resource: string) => readonly Record<string, unknown>[] | Promise<readonly Record<string, unknown>[]>;
  now?: () => Date;
}): WarehouseAdapter {
  return {
    id: input.id ?? "local-records",
    label: input.label ?? "Local records",
    compile(query, explore) {
      return compileMetricQuerySql(explore, query);
    },
    async run(query, explore) {
      const rows = await input.rowsForResource(explore.resource);
      const evaluation: QueryEvaluationInput = {
        explore,
        query,
        rows,
      };
      const now = input.now?.();
      if (now) evaluation.now = now;
      return runMetricQuery(evaluation);
    },
  };
}

export function createUnsupportedWarehouseAdapter(input: {
  id: string;
  label: string;
  message?: string;
}): WarehouseAdapter {
  return {
    id: input.id,
    label: input.label,
    compile() {
      throw new UnsupportedWarehouseAdapterError(input.id, input.message);
    },
    async run() {
      throw new UnsupportedWarehouseAdapterError(input.id, input.message);
    },
  };
}

export interface QueryEvaluationInput {
  explore: AnalyticsExplore;
  query: MetricQuery;
  rows: readonly Record<string, unknown>[];
  now?: Date;
}

export interface DrillDownInput {
  explore: AnalyticsExplore;
  query: MetricQuery;
  rows: readonly Record<string, unknown>[];
  dimensionValues?: Record<string, unknown>;
  limit?: number;
}

export function normalizeMetricQuery(
  explore: AnalyticsExplore,
  query: Partial<MetricQuery>,
): MetricQuery {
  const firstMetric = explore.metrics.find((metric) => !metric.hidden);
  return {
    exploreId: explore.id,
    dimensions: [...(query.dimensions ?? explore.defaultQuery?.dimensions ?? [])],
    metrics: [
      ...(query.metrics ??
        explore.defaultQuery?.metrics ??
        (firstMetric ? [firstMetric.id] : [])),
    ],
    filters: [...(query.filters ?? explore.defaultQuery?.filters ?? [])],
    sorts: [...(query.sorts ?? explore.defaultQuery?.sorts ?? [])],
    limit: clampLimit(query.limit ?? explore.defaultQuery?.limit ?? 100),
    pivotDimensions: [
      ...(query.pivotDimensions ?? explore.defaultQuery?.pivotDimensions ?? []),
    ],
    tableCalculations: [
      ...(query.tableCalculations ??
        explore.defaultQuery?.tableCalculations ??
        []),
    ],
    customMetrics: [
      ...(query.customMetrics ?? explore.defaultQuery?.customMetrics ?? []),
    ],
    timezone: query.timezone ?? explore.defaultQuery?.timezone ?? "UTC",
  };
}

export function validateMetricQuery(
  explore: AnalyticsExplore,
  query: MetricQuery,
): string[] {
  const errors: string[] = [];
  if (query.exploreId !== explore.id) {
    errors.push(`query explore "${query.exploreId}" does not match "${explore.id}"`);
  }
  const dimensions = new Set(explore.dimensions.map((dimension) => dimension.id));
  const metrics = new Set(explore.metrics.map((metric) => metric.id));
  for (const metric of query.customMetrics ?? []) metrics.add(metric.id);

  for (const id of query.dimensions) {
    if (!dimensions.has(id)) errors.push(`unknown dimension "${id}"`);
  }
  for (const id of query.pivotDimensions ?? []) {
    if (!dimensions.has(id)) errors.push(`unknown pivot dimension "${id}"`);
  }
  for (const id of query.metrics) {
    if (!metrics.has(id)) errors.push(`unknown metric "${id}"`);
  }
  for (const filter of query.filters ?? []) {
    if (!dimensions.has(filter.fieldId) && !metrics.has(filter.fieldId)) {
      errors.push(`unknown filter field "${filter.fieldId}"`);
    }
  }
  for (const sort of query.sorts ?? []) {
    if (
      !dimensions.has(sort.fieldId) &&
      !metrics.has(sort.fieldId) &&
      !(query.tableCalculations ?? []).some((calc) => calc.id === sort.fieldId)
    ) {
      errors.push(`unknown sort field "${sort.fieldId}"`);
    }
  }
  if (query.metrics.length === 0 && (query.tableCalculations ?? []).length > 0) {
    errors.push("table calculations require at least one metric");
  }
  return errors;
}

export function runMetricQuery(input: QueryEvaluationInput): QueryResult {
  const query = normalizeMetricQuery(input.explore, input.query);
  const validationErrors = validateMetricQuery(input.explore, query);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors.join("; "));
  }

  const dimensions = new Map(
    input.explore.dimensions.map((dimension) => [dimension.id, dimension]),
  );
  const metrics = metricMap(input.explore, query);
  const filtered = applyFilters(input.rows, input.explore, query);
  const groups = new Map<string, { values: Record<string, unknown>; rows: Record<string, unknown>[] }>();

  for (const row of filtered) {
    const values: Record<string, unknown> = {};
    for (const id of query.dimensions) {
      const dimension = dimensions.get(id);
      if (dimension) values[id] = readPath(row, dimension.sourceField);
    }
    const key = query.dimensions.map((id) => stableValue(values[id])).join("\u001f");
    const existing = groups.get(key);
    if (existing) existing.rows.push(row);
    else groups.set(key, { values, rows: [row] });
  }

  if (groups.size === 0 && query.dimensions.length === 0) {
    groups.set("__all__", { values: {}, rows: [] });
  }

  const resultRows = [...groups.values()].map((group) => {
    const out: Record<string, unknown> = { ...group.values };
    for (const metricId of query.metrics) {
      const metric = metrics.get(metricId);
      if (metric) out[metricId] = aggregateMetric(group.rows, metric);
    }
    for (const calc of query.tableCalculations ?? []) {
      out[calc.id] = evaluateCalculation(calc.expression, out);
    }
    return out;
  });

  const sorted = applySorts(resultRows, query);
  const limited = sorted.slice(0, clampLimit(query.limit ?? 100));
  const compiled = compileMetricQuerySql(input.explore, query);

  return {
    query,
    columns: queryColumns(input.explore, query),
    rows: limited,
    totalRows: sorted.length,
    sourceRows: filtered.length,
    compiledSql: compiled.sql,
    ranAt: (input.now ?? new Date()).toISOString(),
    warnings: compiled.warnings,
  };
}

export function compileMetricQuerySql(
  explore: AnalyticsExplore,
  queryInput: MetricQuery,
): CompiledSql {
  const query = normalizeMetricQuery(explore, queryInput);
  const dimensions = new Map(explore.dimensions.map((field) => [field.id, field]));
  const metrics = metricMap(explore, query);
  const selectParts: string[] = [];
  const groupParts: string[] = [];
  const warnings: string[] = [];

  for (const id of query.dimensions) {
    const dimension = dimensions.get(id);
    if (!dimension) continue;
    const expr = `json_extract(data, '$.${dimension.sourceField}')`;
    selectParts.push(`${expr} AS ${quoteIdentifier(id)}`);
    groupParts.push(expr);
  }
  for (const id of query.metrics) {
    const metric = metrics.get(id);
    if (!metric) continue;
    selectParts.push(`${metricSql(metric)} AS ${quoteIdentifier(id)}`);
  }
  for (const calc of query.tableCalculations ?? []) {
    warnings.push(
      `table calculation "${calc.id}" is evaluated after the local query run`,
    );
  }

  const where = (query.filters ?? [])
    .map((filter) => filterSql(filter, dimensions))
    .filter(Boolean);
  const order = (query.sorts ?? [])
    .map((sort) => `${quoteIdentifier(sort.fieldId)} ${sort.dir.toUpperCase()}`)
    .join(", ");

  const sql = [
    `SELECT ${selectParts.length > 0 ? selectParts.join(", ") : "COUNT(*) AS count"}`,
    `FROM records`,
    `WHERE resource = '${escapeSql(explore.resource)}'${where.length > 0 ? ` AND ${where.join(" AND ")}` : ""}`,
    groupParts.length > 0 ? `GROUP BY ${groupParts.join(", ")}` : "",
    order ? `ORDER BY ${order}` : "",
    `LIMIT ${clampLimit(query.limit ?? 100)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { query, sql, dialect: "local-records", warnings };
}

export function drillDownRows(input: DrillDownInput): Record<string, unknown>[] {
  const query = normalizeMetricQuery(input.explore, input.query);
  const dimensions = new Map(
    input.explore.dimensions.map((dimension) => [dimension.id, dimension]),
  );
  let rows = applyFilters(input.rows, input.explore, query);
  for (const [fieldId, expected] of Object.entries(input.dimensionValues ?? {})) {
    const dimension = dimensions.get(fieldId);
    if (!dimension) continue;
    rows = rows.filter((row) => readPath(row, dimension.sourceField) === expected);
  }
  return rows.slice(0, clampLimit(input.limit ?? 100));
}

export function validateChart(
  chart: Pick<SavedChart, "id" | "name" | "query" | "config" | "exploreId">,
  explore: AnalyticsExplore | undefined,
  now = new Date(),
): ValidationResult[] {
  const out: ValidationResult[] = [];
  if (!chart.name.trim()) {
    out.push(validation("chart", chart.id, "error", "chart.name.empty", "Chart name is required.", now));
  }
  if (!explore) {
    out.push(validation("chart", chart.id, "error", "chart.explore.missing", "Chart explore is missing.", now));
    return out;
  }
  if (!supportedChartKinds.includes(chart.config.kind)) {
    out.push(validation("chart", chart.id, "error", "chart.kind.unsupported", `Chart kind "${chart.config.kind}" is not supported.`, now));
  }
  for (const error of validateMetricQuery(explore, chart.query)) {
    out.push(validation("chart", chart.id, "error", "chart.query.invalid", error, now));
  }
  if (chart.config.kind !== "table" && chart.query.metrics.length === 0) {
    out.push(validation("chart", chart.id, "error", "chart.metric.missing", "A visual chart requires at least one metric.", now));
  }
  if (["line", "bar", "area"].includes(chart.config.kind) && !chart.config.xField && chart.query.dimensions.length === 0) {
    out.push(validation("chart", chart.id, "warning", "chart.x.missing", "Cartesian charts should define an x field or include a dimension.", now));
  }
  return out;
}

export function validateDashboard(
  dashboard: DashboardContent,
  charts: readonly Pick<SavedChart, "id">[],
  now = new Date(),
): ValidationResult[] {
  const out: ValidationResult[] = [];
  const chartIds = new Set(charts.map((chart) => chart.id));
  if (!dashboard.name.trim()) {
    out.push(validation("dashboard", dashboard.id, "error", "dashboard.name.empty", "Dashboard name is required.", now));
  }
  if (dashboard.tabs.length === 0) {
    out.push(validation("dashboard", dashboard.id, "error", "dashboard.tabs.empty", "Dashboard must have at least one tab.", now));
  }
  const tabIds = new Set<string>();
  for (const tab of dashboard.tabs) {
    if (!tab.id.trim()) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tab.id_empty", "Dashboard tab id is required.", now));
    }
    if (tabIds.has(tab.id)) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tab.duplicate", `Duplicate tab id "${tab.id}".`, now));
    }
    tabIds.add(tab.id);
  }
  const tileIds = new Set<string>();
  for (const tile of dashboard.tiles) {
    if (tileIds.has(tile.id)) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tile.duplicate", `Duplicate tile id "${tile.id}".`, now));
    }
    tileIds.add(tile.id);
    if (tile.w < 1 || tile.h < 1 || tile.w > 12) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tile.size", `Tile "${tile.id}" has an invalid size.`, now));
    }
    if (tile.x < 0 || tile.y < 0 || tile.x + tile.w > 12) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tile.position", `Tile "${tile.id}" is outside the 12-column layout.`, now));
    }
    if (tile.tabId && !tabIds.has(tile.tabId)) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tile.tab_missing", `Tile "${tile.id}" references a missing tab.`, now));
    }
    if (tile.kind === "chart" && (!tile.chartId || !chartIds.has(tile.chartId))) {
      out.push(validation("dashboard", dashboard.id, "error", "dashboard.tile.chart_missing", `Tile "${tile.id}" references a missing chart.`, now));
    }
    if ((tile.kind === "markdown" || tile.kind === "heading") && !String(tile.markdown ?? tile.title ?? "").trim()) {
      out.push(validation("dashboard", dashboard.id, "warning", "dashboard.tile.content_empty", `Tile "${tile.id}" has no visible content.`, now));
    }
  }
  const tilesByTab = new Map<string, DashboardTile[]>();
  for (const tile of dashboard.tiles) {
    const key = tile.tabId ?? dashboard.tabs[0]?.id ?? "main";
    tilesByTab.set(key, [...(tilesByTab.get(key) ?? []), tile]);
  }
  for (const [tabId, tiles] of tilesByTab) {
    for (let leftIndex = 0; leftIndex < tiles.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < tiles.length; rightIndex += 1) {
        const left = tiles[leftIndex]!;
        const right = tiles[rightIndex]!;
        const overlaps =
          left.x < right.x + right.w &&
          left.x + left.w > right.x &&
          left.y < right.y + right.h &&
          left.y + left.h > right.y;
        if (overlaps) {
          out.push(validation("dashboard", dashboard.id, "warning", "dashboard.tile.overlap", `Tiles "${left.id}" and "${right.id}" overlap on tab "${tabId}".`, now));
        }
      }
    }
  }
  return out;
}

export function validateSchedule(
  schedule: ScheduledDelivery,
  now = new Date(),
): ValidationResult[] {
  const out: ValidationResult[] = [];
  if (!schedule.name.trim()) {
    out.push(validation("schedule", schedule.id, "error", "schedule.name.empty", "Schedule name is required.", now));
  }
  if (!schedule.cron.trim()) {
    out.push(validation("schedule", schedule.id, "error", "schedule.cron.empty", "Schedule cadence is required.", now));
  }
  if (schedule.targets.length === 0) {
    out.push(validation("schedule", schedule.id, "error", "schedule.targets.empty", "At least one delivery target is required.", now));
  }
  for (const target of schedule.targets) {
    if (!["email", "slack", "teams", "google_chat", "webhook"].includes(target.kind)) {
      out.push(validation("schedule", schedule.id, "error", "schedule.target.kind", `Unsupported delivery target "${target.kind}".`, now));
    }
    if (!target.address.trim()) {
      out.push(validation("schedule", schedule.id, "error", "schedule.target.empty", "Delivery target address is required.", now));
    }
    if (target.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.address)) {
      out.push(validation("schedule", schedule.id, "error", "schedule.target.email", `Delivery target "${target.address}" is not a valid email address.`, now));
    }
    if (target.kind === "webhook") {
      try {
        const url = new URL(target.address);
        if (url.protocol !== "https:") {
          out.push(validation("schedule", schedule.id, "error", "schedule.target.webhook_https", "Webhook targets must use HTTPS.", now));
        }
      } catch {
        out.push(validation("schedule", schedule.id, "error", "schedule.target.webhook_url", "Webhook target must be a valid URL.", now));
      }
    }
  }
  return out;
}

export function createChartVersion(
  chart: SavedChart,
  actor?: string,
  reason?: string,
  now = new Date(),
): ChartVersion {
  return {
    id: `${chart.id}:v${chart.version}`,
    chartId: chart.id,
    version: chart.version,
    chart: clone(chart),
    createdAt: now.toISOString(),
    ...(actor ? { createdBy: actor } : {}),
    ...(reason ? { reason } : {}),
  };
}

export function createDashboardVersion(
  dashboard: DashboardContent,
  actor?: string,
  reason?: string,
  now = new Date(),
): DashboardVersion {
  return {
    id: `${dashboard.id}:v${dashboard.version}`,
    dashboardId: dashboard.id,
    version: dashboard.version,
    dashboard: clone(dashboard),
    createdAt: now.toISOString(),
    ...(actor ? { createdBy: actor } : {}),
    ...(reason ? { reason } : {}),
  };
}

export function stableShareToken(
  targetKind: ShareUrl["targetKind"],
  targetId: string,
  salt = "gutu",
): string {
  const raw = `${salt}:${targetKind}:${targetId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).padStart(7, "0");
}

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                            */
/* -------------------------------------------------------------------------- */

function metricMap(explore: AnalyticsExplore, query: MetricQuery) {
  const out = new Map<string, AnalyticsMetric | CustomMetric>();
  for (const metric of explore.metrics) out.set(metric.id, metric);
  for (const metric of query.customMetrics ?? []) out.set(metric.id, metric);
  return out;
}

function queryColumns(explore: AnalyticsExplore, query: MetricQuery): QueryColumn[] {
  const dimensions = new Map(explore.dimensions.map((field) => [field.id, field]));
  const metrics = metricMap(explore, query);
  const columns: QueryColumn[] = [];
  for (const id of query.dimensions) {
    const dimension = dimensions.get(id);
    if (dimension) {
      columns.push({
        fieldId: id,
        label: dimension.label,
        type: dimension.type,
        role: "dimension",
      });
    }
  }
  for (const id of query.metrics) {
    const metric = metrics.get(id);
    if (metric) {
      columns.push({
        fieldId: id,
        label: metric.label,
        type:
          metric.unit === "currency"
            ? "currency"
            : metric.unit === "percent"
              ? "percent"
              : "number",
        role: "metric",
        ...(metric.format ? { format: metric.format } : {}),
      });
    }
  }
  for (const calc of query.tableCalculations ?? []) {
    columns.push({
      fieldId: calc.id,
      label: calc.label,
      type: calc.format === "currency" ? "currency" : calc.format === "percent" ? "percent" : "number",
      role: "calculation",
      ...(calc.format ? { format: calc.format } : {}),
    });
  }
  return columns;
}

function applyFilters(
  rows: readonly Record<string, unknown>[],
  explore: AnalyticsExplore,
  query: MetricQuery,
): Record<string, unknown>[] {
  const dimensions = new Map(explore.dimensions.map((field) => [field.id, field]));
  return rows.filter((row) =>
    (query.filters ?? []).every((filter) => {
      const dimension = dimensions.get(filter.fieldId);
      if (!dimension) return true;
      return matchesFilter(readPath(row, dimension.sourceField), filter);
    }),
  );
}

function applySorts(
  rows: Record<string, unknown>[],
  query: MetricQuery,
): Record<string, unknown>[] {
  const sorts = query.sorts ?? [];
  if (sorts.length === 0) return rows;
  return [...rows].sort((left, right) => {
    for (const sort of sorts) {
      const a = left[sort.fieldId];
      const b = right[sort.fieldId];
      const cmp = compareValues(a, b);
      if (cmp !== 0) return sort.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

function aggregateMetric(
  rows: readonly Record<string, unknown>[],
  metric: AnalyticsMetric | CustomMetric,
): number {
  if (metric.aggregation === "count") return rows.length;
  const values = rows
    .map((row) => readPath(row, metric.sourceField ?? "id"))
    .filter((value) => value !== undefined && value !== null && value !== "");
  if (metric.aggregation === "count_distinct") {
    return new Set(values.map(stableValue)).size;
  }
  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  if (numbers.length === 0) return 0;
  if (metric.aggregation === "sum") return numbers.reduce((total, value) => total + value, 0);
  if (metric.aggregation === "avg") return numbers.reduce((total, value) => total + value, 0) / numbers.length;
  if (metric.aggregation === "min") return Math.min(...numbers);
  if (metric.aggregation === "max") return Math.max(...numbers);
  return 0;
}

function matchesFilter(value: unknown, filter: QueryFilter): boolean {
  if (filter.operator === "is_empty") return value === undefined || value === null || value === "";
  if (filter.operator === "is_not_empty") return value !== undefined && value !== null && value !== "";
  if (filter.operator === "in") {
    const allowed = Array.isArray(filter.value) ? filter.value : [filter.value];
    return allowed.map(stableValue).includes(stableValue(value));
  }
  if (filter.operator === "between") {
    return compareValues(value, filter.value) >= 0 && compareValues(value, filter.to) <= 0;
  }
  if (filter.operator === "contains") {
    return String(value ?? "").toLowerCase().includes(String(filter.value ?? "").toLowerCase());
  }
  const cmp = compareValues(value, filter.value);
  if (filter.operator === "eq") return cmp === 0;
  if (filter.operator === "neq") return cmp !== 0;
  if (filter.operator === "gt") return cmp > 0;
  if (filter.operator === "gte") return cmp >= 0;
  if (filter.operator === "lt") return cmp < 0;
  if (filter.operator === "lte") return cmp <= 0;
  return true;
}

function compareValues(left: unknown, right: unknown): number {
  const ln = Number(left);
  const rn = Number(right);
  if (Number.isFinite(ln) && Number.isFinite(rn)) return ln === rn ? 0 : ln > rn ? 1 : -1;
  const ls = stableValue(left);
  const rs = stableValue(right);
  return ls.localeCompare(rs);
}

function readPath(row: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (value && typeof value === "object" && segment in value) {
      return (value as Record<string, unknown>)[segment];
    }
    return undefined;
  }, row);
}

function stableValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 100;
  return Math.min(1000, Math.max(1, Math.trunc(limit)));
}

function metricSql(metric: AnalyticsMetric | CustomMetric): string {
  const field = metric.sourceField
    ? `json_extract(data, '$.${metric.sourceField}')`
    : "id";
  if (metric.aggregation === "count") return "COUNT(*)";
  if (metric.aggregation === "count_distinct") return `COUNT(DISTINCT ${field})`;
  if (metric.aggregation === "avg") return `AVG(CAST(${field} AS REAL))`;
  if (metric.aggregation === "min") return `MIN(CAST(${field} AS REAL))`;
  if (metric.aggregation === "max") return `MAX(CAST(${field} AS REAL))`;
  return `SUM(CAST(${field} AS REAL))`;
}

function filterSql(
  filter: QueryFilter,
  dimensions: Map<string, AnalyticsDimension>,
): string {
  const dimension = dimensions.get(filter.fieldId);
  if (!dimension) return "";
  const field = `json_extract(data, '$.${dimension.sourceField}')`;
  const value = filter.value;
  if (filter.operator === "is_empty") return `(${field} IS NULL OR ${field} = '')`;
  if (filter.operator === "is_not_empty") return `(${field} IS NOT NULL AND ${field} != '')`;
  if (filter.operator === "contains") return `${field} LIKE '%${escapeSql(String(value ?? ""))}%'`;
  if (filter.operator === "in") {
    const values = (Array.isArray(value) ? value : [value])
      .map((entry) => `'${escapeSql(String(entry ?? ""))}'`)
      .join(", ");
    return `${field} IN (${values})`;
  }
  if (filter.operator === "between") {
    return `${field} BETWEEN '${escapeSql(String(value ?? ""))}' AND '${escapeSql(String(filter.to ?? ""))}'`;
  }
  const op = {
    eq: "=",
    neq: "!=",
    gt: ">",
    gte: ">=",
    lt: "<",
    lte: "<=",
  }[filter.operator];
  return op ? `${field} ${op} '${escapeSql(String(value ?? ""))}'` : "";
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/[^a-zA-Z0-9_]/g, "_")}"`;
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function validation(
  targetKind: ValidationTargetKind,
  targetId: string,
  severity: ValidationSeverity,
  code: string,
  message: string,
  now: Date,
): ValidationResult {
  return {
    id: `${targetKind}:${targetId}:${code}`,
    targetKind,
    targetId,
    severity,
    code,
    message,
    createdAt: now.toISOString(),
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function evaluateCalculation(expression: string, values: Record<string, unknown>): number {
  const tokens = tokenizeExpression(expression);
  let index = 0;

  function parseExpression(): number {
    let value = parseTerm();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const op = tokens[index++];
      const next = parseTerm();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const op = tokens[index++];
      const next = parseFactor();
      value = op === "*" ? value * next : next === 0 ? 0 : value / next;
    }
    return value;
  }

  function parseFactor(): number {
    const token = tokens[index++];
    if (token === "(") {
      const value = parseExpression();
      if (tokens[index] === ")") index += 1;
      return value;
    }
    if (token === "-") return -parseFactor();
    if (!token) return 0;
    const number = Number(token);
    if (Number.isFinite(number)) return number;
    const value = Number(values[token]);
    return Number.isFinite(value) ? value : 0;
  }

  const result = parseExpression();
  return Number.isFinite(result) ? result : 0;
}

function tokenizeExpression(expression: string): string[] {
  const tokens: string[] = [];
  const re = /\s*([A-Za-z_][A-Za-z0-9_.-]*|\d+(?:\.\d+)?|[()+\-*/])\s*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(expression))) {
    tokens.push(match[1] ?? "");
  }
  return tokens;
}
