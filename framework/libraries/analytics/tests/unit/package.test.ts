import { describe, expect, it } from "bun:test";

import {
  aggregateSnapshots,
  createMetricRegistry,
  defineMetric,
  defineSegment,
  evaluateSegment,
  packageId,
  snapshotMetric
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
});
