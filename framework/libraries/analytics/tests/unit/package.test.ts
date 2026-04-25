import { describe, expect, it } from "bun:test";

import {
  aggregateSnapshots,
  compileMetricQuerySql,
  createChartVersion,
  createDashboardVersion,
  createLocalRecordWarehouseAdapter,
  createMetricRegistry,
  defineMetric,
  defineSegment,
  drillDownRows,
  evaluateSegment,
  packageId,
  runMetricQuery,
  snapshotMetric,
  UnsupportedWarehouseAdapterError,
  validateChart,
  validateDashboard,
  validateSchedule,
  createUnsupportedWarehouseAdapter
} from "../../src";

describe("analytics", () => {
  it("exposes a stable package id", () => {
    expect(packageId).toBe("analytics");
  });

  it("records snapshots and aggregates metric windows", () => {
    const metric = defineMetric({
      id: "sales.pipeline",
      label: "Pipeline",
      unit: "currency",
      dimensions: ["region"]
    });
    const snapshots = [
      snapshotMetric(metric, 100, new Date("2026-04-18T00:00:00.000Z"), { region: "na" }),
      snapshotMetric(metric, 300, new Date("2026-04-18T12:00:00.000Z"), { region: "na" })
    ];

    expect(
      aggregateSnapshots(snapshots, {
        metricIds: ["sales.pipeline"],
        from: "2026-04-18T00:00:00.000Z",
        to: "2026-04-18T23:59:59.999Z"
      })
    ).toEqual([
      {
        metricId: "sales.pipeline",
        count: 2,
        sum: 400,
        average: 200
      }
    ]);
  });

  it("evaluates KPI segments over normalized dimensions", () => {
    const segment = defineSegment({
      id: "region.na",
      label: "North America",
      dimension: "region",
      matches: (value) => value === "na"
    });
    const metric = defineMetric({
      id: "sales.pipeline",
      label: "Pipeline",
      unit: "currency",
      dimensions: ["region"]
    });

    expect(
      evaluateSegment(
        segment,
        snapshotMetric(metric, 100, new Date("2026-04-18T00:00:00.000Z"), {
          region: "na"
        })
      )
    ).toBe(true);
  });

  it("creates metric registries for shared KPI catalogs", () => {
    const registry = createMetricRegistry({
      metrics: [
        defineMetric({
          id: "sales.pipeline",
          label: "Pipeline",
          unit: "currency"
        })
      ]
    });

    expect(registry.metrics.has("sales.pipeline")).toBe(true);
  });

  it("runs deterministic BI metric queries over seeded records", () => {
    const explore = {
      id: "sales",
      label: "Sales",
      resource: "sales.deal",
      dimensions: [
        { id: "stage", label: "Stage", type: "string" as const, sourceField: "stage" },
        { id: "owner", label: "Owner", type: "string" as const, sourceField: "owner" }
      ],
      metrics: [
        {
          id: "revenue",
          label: "Revenue",
          aggregation: "sum" as const,
          sourceField: "amount",
          unit: "currency" as const
        },
        { id: "deals", label: "Deals", aggregation: "count" as const, unit: "count" as const }
      ]
    };

    const result = runMetricQuery({
      explore,
      query: {
        exploreId: "sales",
        dimensions: ["stage"],
        metrics: ["revenue", "deals"],
        filters: [{ fieldId: "owner", operator: "eq", value: "Sam" }],
        sorts: [{ fieldId: "revenue", dir: "desc" }],
        tableCalculations: [
          { id: "avgDeal", label: "Avg deal", expression: "revenue / deals" }
        ],
        limit: 10
      },
      rows: [
        { id: "a", stage: "Won", owner: "Sam", amount: 100 },
        { id: "b", stage: "Won", owner: "Sam", amount: 300 },
        { id: "c", stage: "Open", owner: "Alex", amount: 500 }
      ],
      now: new Date("2026-04-25T00:00:00.000Z")
    });

    expect(result.rows).toEqual([
      { stage: "Won", revenue: 400, deals: 2, avgDeal: 200 }
    ]);
    expect(result.sourceRows).toBe(2);
    expect(result.compiledSql).toContain("sales.deal");
  });

  it("compiles local-record SQL previews and drill-down rows", () => {
    const explore = {
      id: "inventory",
      label: "Inventory",
      resource: "inventory.item",
      dimensions: [
        { id: "category", label: "Category", type: "string" as const, sourceField: "category" }
      ],
      metrics: [
        {
          id: "stock",
          label: "Stock",
          aggregation: "sum" as const,
          sourceField: "onHand",
          unit: "number" as const
        }
      ]
    };
    const query = {
      exploreId: "inventory",
      dimensions: ["category"],
      metrics: ["stock"],
      filters: [{ fieldId: "category", operator: "eq" as const, value: "raw" }],
      limit: 20
    };

    expect(compileMetricQuerySql(explore, query).sql).toContain("GROUP BY");
    expect(
      drillDownRows({
        explore,
        query,
        rows: [
          { id: "raw-1", category: "raw", onHand: 10 },
          { id: "fin-1", category: "finished", onHand: 20 }
        ],
        dimensionValues: { category: "raw" }
      }).map((row) => row.id)
    ).toEqual(["raw-1"]);
  });

  it("versions charts and dashboards with immutable snapshots", () => {
    const now = new Date("2026-04-25T00:00:00.000Z");
    const chart = {
      id: "chart_1",
      name: "Revenue",
      exploreId: "sales",
      query: { exploreId: "sales", dimensions: [], metrics: ["revenue"] },
      config: { kind: "big_number" as const, valueField: "revenue" },
      version: 3,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const dashboard = {
      id: "dash_1",
      name: "Exec",
      tabs: [{ id: "main", label: "Main", order: 0 }],
      filters: [],
      tiles: [{ id: "tile_1", kind: "chart" as const, chartId: "chart_1", x: 0, y: 0, w: 6, h: 4 }],
      version: 2,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    expect(createChartVersion(chart, "sam", "save", now)).toMatchObject({
      id: "chart_1:v3",
      chartId: "chart_1",
      version: 3
    });
    expect(createDashboardVersion(dashboard, "sam", "save", now)).toMatchObject({
      id: "dash_1:v2",
      dashboardId: "dash_1",
      version: 2
    });
  });

  it("validates production BI chart, dashboard, and schedule edge cases", () => {
    const now = new Date("2026-04-25T00:00:00.000Z");
    const explore = {
      id: "sales",
      label: "Sales",
      resource: "sales.deal",
      dimensions: [{ id: "stage", label: "Stage", type: "string" as const, sourceField: "stage" }],
      metrics: [{ id: "revenue", label: "Revenue", aggregation: "sum" as const, sourceField: "amount", unit: "currency" as const }]
    };
    const chart = {
      id: "chart_bad",
      name: "Revenue",
      exploreId: "sales",
      query: { exploreId: "sales", dimensions: ["missing"], metrics: ["revenue"] },
      config: { kind: "bar" as const, yFields: ["revenue"] },
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const dashboard = {
      id: "dash_bad",
      name: "Exec",
      tabs: [{ id: "main", label: "Main", order: 0 }],
      filters: [],
      tiles: [
        { id: "tile_a", kind: "chart" as const, chartId: "chart_ok", x: 0, y: 0, w: 8, h: 4, tabId: "main" },
        { id: "tile_b", kind: "markdown" as const, markdown: "", x: 6, y: 0, w: 6, h: 2, tabId: "main" },
        { id: "tile_c", kind: "chart" as const, chartId: "missing", x: 0, y: 8, w: 13, h: 2, tabId: "ghost" }
      ],
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    expect(validateChart(chart, explore, now).map((row) => row.code)).toContain("chart.query.invalid");
    expect(validateDashboard(dashboard, [{ id: "chart_ok" }], now).map((row) => row.code)).toEqual(
      expect.arrayContaining([
        "dashboard.tile.content_empty",
        "dashboard.tile.position",
        "dashboard.tile.tab_missing",
        "dashboard.tile.chart_missing",
        "dashboard.tile.overlap"
      ])
    );
    expect(
      validateSchedule({
        id: "sched_bad",
        name: "Broken",
        targetKind: "chart",
        targetId: "chart_ok",
        cron: "every 1d",
        timezone: "UTC",
        format: "pdf",
        enabled: true,
        includeLinks: true,
        targets: [{ kind: "webhook", address: "http://example.test/hook" }],
        updatedAt: now.toISOString()
      }, now).map((row) => row.code)
    ).toContain("schedule.target.webhook_https");
  });

  it("provides honest warehouse adapters for local records and unconfigured connectors", async () => {
    const explore = {
      id: "sales",
      label: "Sales",
      resource: "sales.deal",
      dimensions: [{ id: "stage", label: "Stage", type: "string" as const, sourceField: "stage" }],
      metrics: [{ id: "revenue", label: "Revenue", aggregation: "sum" as const, sourceField: "amount", unit: "currency" as const }]
    };
    const query = { exploreId: "sales", dimensions: ["stage"], metrics: ["revenue"], limit: 10 };
    const local = createLocalRecordWarehouseAdapter({
      rowsForResource: () => [{ stage: "Won", amount: 250 }],
      now: () => new Date("2026-04-25T00:00:00.000Z")
    });
    const disabled = createUnsupportedWarehouseAdapter({
      id: "snowflake",
      label: "Snowflake",
      message: "Snowflake credentials are not configured."
    });

    await expect(local.run(query, explore)).resolves.toMatchObject({
      rows: [{ stage: "Won", revenue: 250 }],
      compiledSql: expect.stringContaining("sales.deal")
    });
    expect(() => disabled.compile(query, explore)).toThrow(UnsupportedWarehouseAdapterError);
    await expect(disabled.run(query, explore)).rejects.toThrow("Snowflake credentials are not configured.");
  });
});
