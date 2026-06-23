const test = require("node:test");
const assert = require("node:assert/strict");
const { optimizeMaintenanceTasks } = require("../src/algorithms/knapsack");

test("selects highest impact tasks within mechanic hours", () => {
  const result = optimizeMaintenanceTasks(8, [
    { id: "T1", vehicleId: "V1", duration: 3, impact: 25 },
    { id: "T2", vehicleId: "V2", duration: 4, impact: 40 },
    { id: "T3", vehicleId: "V3", duration: 5, impact: 50 },
    { id: "T4", vehicleId: "V4", duration: 2, impact: 20 },
  ]);

  assert.deepEqual(
    result.selectedTasks.map((task) => task.id),
    ["T1", "T3"]
  );
  assert.equal(result.totalDuration, 8);
  assert.equal(result.totalImpact, 75);
});
