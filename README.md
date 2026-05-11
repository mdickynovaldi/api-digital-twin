# Digital Twin API

Production-ready backend API for Unity digital twin, built with **Hono** on **Next.js App Router** + **Prisma** + **PostgreSQL**.

Implements a recursive tree structure for industrial machine nodes where each node can have unlimited depth of children.

## Architecture

```
app/api/[...route]/route.ts  →  Hono entry point
src/routes/                  →  Route handlers
src/schemas/                 →  Zod validation
src/services/                →  Business logic
src/repositories/            →  Database access
src/middleware/               →  CORS, Logger, Error handler
src/utils/                   →  Response & tree helpers
src/lib/prisma.ts            →  Prisma client singleton
```

## Quick Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### 1. Install dependencies
```bash
npm install
```

### 2. Configure database
Edit `.env` with your PostgreSQL connection:
```
DATABASE_URL="postgresql://user:password@localhost:5432/digital_twin?schema=public"
```

### 3. Generate Prisma client & run migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed sample data
```bash
npx tsx prisma/seed.ts
```

### 5. Start dev server
```bash
npm run dev
```

API is now running at `http://localhost:3000/api`.

### One-liner setup (after configuring .env)
```bash
npm run setup
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/nodes` | Create root/nested node |
| `GET` | `/api/nodes` | List nodes (`?rootOnly=true&page=1&limit=50`) |
| `GET` | `/api/nodes/:id` | Get single node (with direct children) |
| `GET` | `/api/nodes/:id/tree` | Get full recursive tree (`?depth=3`) |
| `PATCH` | `/api/nodes/:id` | Partial update |
| `DELETE` | `/api/nodes/:id` | Delete node (`?mode=node` or `?mode=subtree`) |
| `POST` | `/api/nodes/:id/children` | Add children recursively |
| `GET` | `/api/nodes/:id/children` | List direct children |
| `PATCH` | `/api/nodes/:id/move` | Move node to new parent |
| `POST` | `/api/nodes/bulk-upsert-tree` | Bulk upsert tree structure |
| `POST` | `/api/screenshots` | Upload Unity screenshot (`multipart/form-data`) |
| `GET` | `/api/screenshots` | List uploaded screenshots |
| `GET` | `/api/screenshots/:id` | Get screenshot detail |

---

## Curl Examples

### Health check
```bash
curl http://localhost:3000/api/health
```

### Create root node with nested children
```bash
curl -X POST http://localhost:3000/api/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CNC_01",
    "status": "Machine",
    "company": "PARAGON_DT",
    "color": "#FF5500",
    "is_active": true,
    "icon": "tabler:settings",
    "description": "CNC Machine Unit 01",
    "coordinate": {"x": 10, "y": 0, "z": 5},
    "line_coordinate": {"x": 0, "y": 0, "z": 0},
    "rotate_xyz": {"x": 0, "y": 0, "z": 0},
    "size": 1.5,
    "tags": ["cnc", "production"],
    "categories": ["machining"],
    "dependent_category": [],
    "children": [
      {
        "name": "Spindle",
        "status": "Part",
        "company": "PARAGON_DT",
        "color": "#AA0000",
        "description": "Main spindle motor",
        "coordinate": {"x": 1, "y": 0, "z": 0},
        "children": [
          {
            "name": "Spindle Bearing",
            "status": "SubPart",
            "company": "PARAGON_DT",
            "color": "#880000",
            "description": "Bearing of spindle"
          }
        ]
      }
    ]
  }'
```

### List root nodes only
```bash
curl "http://localhost:3000/api/nodes?rootOnly=true"
```

### Get full recursive tree
```bash
curl http://localhost:3000/api/nodes/{id}/tree
```

### Get tree with depth limit
```bash
curl "http://localhost:3000/api/nodes/{id}/tree?depth=2"
```

### Partial update
```bash
curl -X PATCH http://localhost:3000/api/nodes/{id} \
  -H "Content-Type: application/json" \
  -d '{"name": "BLP_01_Updated", "color": "#FF0000"}'
```

### Move node to new parent
```bash
curl -X PATCH http://localhost:3000/api/nodes/{id}/move \
  -H "Content-Type: application/json" \
  -d '{"new_parent_id": "target-parent-uuid"}'
```

### Make node a root (detach from parent)
```bash
curl -X PATCH http://localhost:3000/api/nodes/{id}/move \
  -H "Content-Type: application/json" \
  -d '{"new_parent_id": null}'
```

### Add children to existing node
```bash
curl -X POST http://localhost:3000/api/nodes/{id}/children \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {
        "name": "New Part",
        "status": "Part",
        "company": "PARAGON_DT",
        "color": "#0000FF",
        "description": "Added part"
      }
    ]
  }'
```

### Delete subtree
```bash
curl -X DELETE "http://localhost:3000/api/nodes/{id}?mode=subtree"
```

### Delete node only (children move to grandparent)
```bash
curl -X DELETE "http://localhost:3000/api/nodes/{id}?mode=node"
```

### Bulk upsert tree
```bash
curl -X POST http://localhost:3000/api/nodes/bulk-upsert-tree \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {
        "name": "Assembly_Line_01",
        "status": "Machine",
        "company": "PARAGON_DT",
        "color": "#009900",
        "description": "Assembly line",
        "children": [
          {"name": "Station A", "status": "Part", "company": "PARAGON_DT", "color": "#009911"},
          {"name": "Station B", "status": "Part", "company": "PARAGON_DT", "color": "#009922"}
        ]
      }
    ]
  }'
```

### Upload Unity screenshot
```bash
curl -X POST http://localhost:3000/api/screenshots \
  -F "file=@./capture.png" \
  -F "asset_node_id={asset-node-uuid}" \
  -F "title=Inspection capture" \
  -F "captured_at=2026-05-11T09:30:00.000Z" \
  -F 'metadata={"scene":"FactoryFloor","camera":"MainCamera"}'
```

### List screenshots for maintenance
```bash
curl "http://localhost:3000/api/screenshots?page=1&limit=20"
```

### List screenshots by asset node
```bash
curl "http://localhost:3000/api/screenshots?asset_node_id={asset-node-uuid}"
```

### Render screenshot image
```bash
curl http://localhost:3000/api/screenshots/{screenshot-id}/file --output screenshot.png
```

---

## Unity Integration Notes

1. **CORS**: All origins allowed — Unity WebGL and native builds work out of the box
2. **Response format**: All responses use `{success: true, data: ...}` or `{success: false, error: ...}`
3. **Coordinates**: Already in `{x, y, z}` format matching Unity's `Vector3`
4. **Recursive tree**: `GET /api/nodes/:id/tree` returns the full hierarchy — parse it recursively in Unity
5. **Snake_case**: Response fields use `snake_case` (e.g. `is_active`, `parent_id`, `rotate_xyz`)
6. **Content-Type**: Send `Content-Type: application/json` for node POST/PATCH requests
7. **Screenshots**: Send screenshot uploads as `multipart/form-data` with image field `file` or `screenshot`; response `url` points to an API image endpoint that works on Vercel

### C# UnityWebRequest Example
```csharp
IEnumerator FetchTree(string nodeId) {
    string url = $"http://localhost:3000/api/nodes/{nodeId}/tree";
    using (UnityWebRequest req = UnityWebRequest.Get(url)) {
        yield return req.SendWebRequest();
        if (req.result == UnityWebRequest.Result.Success) {
            var response = JsonUtility.FromJson<ApiResponse>(req.downloadHandler.text);
            // Process response.data recursively
        }
    }
}
```

---

## Design Decisions

1. **Adjacency List** over Materialized Path: simpler self-join, Prisma-native support, easy move operations
2. **Individual float columns** for coordinates: better indexing than JSON, typed queries, slightly more verbose but much faster
3. **Level auto-sync**: level is recalculated on move operations, keeping tree depth consistent
4. **BFS tree loading**: iterative BFS avoids stack overflow on very deep trees
5. **Soft structure for tags/categories**: PostgreSQL `text[]` arrays — easy to query with `@>` operator, no join tables needed
6. **Hono on Next.js**: leverages Next.js deployment ecosystem (Vercel, Docker) while keeping Hono's lightweight router
