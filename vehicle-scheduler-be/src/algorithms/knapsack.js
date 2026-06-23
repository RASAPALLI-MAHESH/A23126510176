// dp knapsack implementation
function optimizeMaintenanceTasks(mechanicHours, tasks) {
  const capacity = Number(mechanicHours);
  
  if (!Number.isInteger(capacity) || capacity <= 0) {
    const err = new Error("mechanicHours must be a positive integer");
    err.status = 400;
    throw err;
  }

  const normalizedTasks = tasks.map((task, index) => {
    const duration = Number(task.duration);
    const impact = Number(task.impact);

    if (!Number.isInteger(duration) || duration <= 0) {
      const err = new Error("Task duration must be a positive integer");
      err.status = 400;
      err.details = { index, taskId: task.id };
      throw err;
    }

    if (!Number.isFinite(impact) || impact < 0) {
      const err = new Error("Task impact must be a non-negative number");
      err.status = 400;
      err.details = { index, taskId: task.id };
      throw err;
    }

    return {
      id: task.id,
      vehicleId: task.vehicleId,
      name: task.name || task.description || `Task ${index + 1}`,
      duration,
      impact,
      metadata: task.metadata,
    };
  });

  const numTasks = normalizedTasks.length;
  const dp = Array.from({ length: numTasks + 1 }, () => Array(capacity + 1).fill(0));

  for (let i = 1; i <= numTasks; i += 1) {
    const task = normalizedTasks[i - 1];
    const { duration, impact } = task;

    for (let hours = 0; hours <= capacity; hours += 1) {
      const skip = dp[i - 1][hours];
      
      let take = Number.NEGATIVE_INFINITY;
      if (duration <= hours) {
        take = impact + dp[i - 1][hours - duration];
      }

      dp[i][hours] = Math.max(skip, take);
    }
  }

  const selectedTasks = [];
  let remainingHours = capacity;

  for (let i = numTasks; i > 0; i -= 1) {
    if (dp[i][remainingHours] !== dp[i - 1][remainingHours]) {
      const task = normalizedTasks[i - 1];
      selectedTasks.push(task);
      remainingHours -= task.duration;
    }
  }

  selectedTasks.reverse();

  let totalDuration = 0;
  let totalImpact = 0;

  for (const task of selectedTasks) {
    totalDuration += task.duration;
    totalImpact += task.impact;
  }

  return {
    selectedTasks,
    totalDuration,
    totalImpact,
    mechanicHours: capacity,
  };
}

module.exports = { optimizeMaintenanceTasks };
