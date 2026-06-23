# Vehicle Scheduler Backend

Affordmed Vehicle Maintenance Scheduler Microservice built with Node.js and Express.

## Folder Structure

```text
vehicle-scheduler-be/
├── src/
│   ├── config/
│   │   ├── apiConfig.js
│   │   └── env.js
│   ├── controllers/
│   │   ├── depotController.js
│   │   ├── schedulerController.js
│   │   └── vehicleController.js
│   ├── services/
│   │   ├── depotService.js
│   │   ├── schedulerService.js
│   │   └── vehicleService.js
│   ├── algorithms/
│   │   └── knapsack.js
│   ├── routes/
│   │   ├── depotRoutes.js
│   │   ├── index.js
│   │   ├── schedulerRoutes.js
│   │   └── vehicleRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   ├── requestId.js
│   │   ├── requestLogger.js
│   │   └── validate.js
│   ├── utils/
│   │   ├── AppError.js
│   │   ├── asyncHandler.js
│   │   ├── httpClient.js
│   │   ├── logger.js
│   │   └── validators.js
│   ├── app.js
│   └── server.js
├── test/
│   └── knapsack.test.js
├── .env.example
└── package.json
```

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required environment variables:

```text
DEPOT_API_URL
VEHICLES_API_URL
EVALUATION_API_TOKEN
```

Optional environment variables:

```text
NODE_ENV=development
PORT=3001
DEPOT_API_TOKEN
VEHICLES_API_TOKEN
DEPOT_API_BASE_URL
DEPOT_API_PATH
VEHICLES_API_BASE_URL
VEHICLES_API_PATH
EXTERNAL_API_TIMEOUT_MS=10000
```

## API Contracts

### GET /api/v1/depots

Consumes the protected Depot API with bearer authentication. Query parameters are forwarded to the upstream API.

Response:

```json
{
  "success": true,
  "data": []
}
```

### GET /api/v1/vehicles

Consumes the protected Vehicles API with bearer authentication. Query parameters are forwarded to the upstream API.

Response:

```json
{
  "success": true,
  "data": []
}
```

### POST /api/v1/scheduler/optimize

Runs 0/1 knapsack dynamic programming for maintenance task selection.

Request:

```json
{
  "mechanicHours": 8,
  "tasks": [
    {
      "id": "task-1",
      "vehicleId": "vehicle-1",
      "name": "Brake inspection",
      "duration": 3,
      "impact": 25
    },
    {
      "id": "task-2",
      "vehicleId": "vehicle-2",
      "name": "Oil leak repair",
      "duration": 5,
      "impact": 50
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "selectedTasks": [
      {
        "id": "task-1",
        "vehicleId": "vehicle-1",
        "name": "Brake inspection",
        "duration": 3,
        "impact": 25
      },
      {
        "id": "task-2",
        "vehicleId": "vehicle-2",
        "name": "Oil leak repair",
        "duration": 5,
        "impact": 50
      }
    ],
    "totalDuration": 8,
    "totalImpact": 75,
    "mechanicHours": 8
  }
}
```

Validation error:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "mechanicHours",
        "message": "mechanicHours is required and must be a positive integer"
      }
    ],
    "requestId": "..."
  }
}
```

## Dynamic Programming Logic

The scheduler treats mechanic hours as knapsack capacity. Each vehicle task is an item:

- `duration` is the weight.
- `impact` is the value.
- Each task can be selected once.

The DP table is `tasks + 1` by `mechanicHours + 1`.

```js
dp[i][hours] = Math.max(
  dp[i - 1][hours],
  task.impact + dp[i - 1][hours - task.duration]
);
```

After filling the table, the algorithm backtracks from the final cell to identify selected tasks, then returns selected tasks, total duration, and total impact.

## Logging

`src/app.js` attaches request ID and the shared logging middleware before route execution. The scheduler imports the middleware from `../logging-middleware`, so all API calls are logged with method, path, status code, duration, and request ID.
