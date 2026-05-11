/**
 * OpenAPI 3.1 Specification for Digital Twin API
 *
 * Comprehensive API documentation for managing AssetNode tree structures
 * used in Unity digital twin applications.
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Digital Twin API',
    version: '1.0.0',
    description: `
## Overview

REST API for managing hierarchical machine/asset nodes in a Unity digital twin application.
Supports full CRUD operations with recursive tree structures, nested children, subtree operations, and bulk upserts.

## Features

- 🌳 **Recursive Tree Structure** — Nodes can have unlimited nested children
- 🔄 **Full CRUD** — Create, Read, Update, Delete operations for all nodes
- 📦 **Bulk Operations** — Upsert entire tree structures in a single request
- 🚚 **Move Nodes** — Reparent nodes within the tree
- 🎯 **Filtering** — Query nodes by status, company, active state
- 📄 **Pagination** — Built-in pagination for list endpoints
- 🎮 **Unity Ready** — Designed for integration with Unity applications

## Response Format

All endpoints return a consistent JSON format:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 50 }
}
\`\`\`

Error responses follow the same structure:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Description of the error",
    "code": "ERROR_CODE",
    "details": [...]
  }
}
\`\`\`
    `,
    contact: {
      name: 'Digital Twin API Support',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Current Server',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Local Development',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health check endpoints',
    },
    {
      name: 'Nodes',
      description: 'CRUD operations for AssetNode resources',
    },
    {
      name: 'Tree Operations',
      description: 'Recursive tree traversal and manipulation',
    },
    {
      name: 'Bulk Operations',
      description: 'Batch operations for tree structures',
    },
    {
      name: 'Screenshots',
      description:
        'Upload and list Unity digital twin screenshots for maintenance views',
    },
  ],
  paths: {
    // ─── Health Check ─────────────────────────────────────────────────
    '/health': {
      get: {
        operationId: 'healthCheck',
        summary: 'Health Check',
        description: 'Returns the current health status of the API service.',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        service: {
                          type: 'string',
                          example: 'digital-twin-api',
                        },
                        version: { type: 'string', example: '1.0.0' },
                        timestamp: {
                          type: 'string',
                          format: 'date-time',
                          example: '2026-03-10T06:00:00.000Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── Nodes Collection ─────────────────────────────────────────────
    '/nodes': {
      get: {
        operationId: 'listNodes',
        summary: 'List Nodes',
        description:
          'Retrieve a paginated list of asset nodes with optional filtering by root status, status, company, and active state.',
        tags: ['Nodes'],
        parameters: [
          {
            name: 'rootOnly',
            in: 'query',
            description:
              'If `true`, only return root nodes (nodes without a parent)',
            schema: { type: 'string', enum: ['true', 'false'] },
            example: 'true',
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by node status',
            schema: { type: 'string' },
            example: 'Machine',
          },
          {
            name: 'company',
            in: 'query',
            description: 'Filter by company name',
            schema: { type: 'string' },
          },
          {
            name: 'isActive',
            in: 'query',
            description: 'Filter by active state',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number (1-indexed)',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of nodes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AssetNode' },
                    },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createNode',
        summary: 'Create Node',
        description:
          'Create a new asset node. Supports creating nested children in a single request by providing the `children` array recursively.',
        tags: ['Nodes'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateNodeInput' },
              example: {
                name: 'CNC Machine A1',
                status: 'Machine',
                company: 'Acme Corp',
                color: '#3B82F6',
                icon: 'tabler:settings',
                description: 'Primary CNC machine on Floor 1',
                coordinate: { x: 10, y: 0, z: 5 },
                line_coordinate: { x: 0, y: 0, z: 0 },
                rotate_xyz: { x: 0, y: 90, z: 0 },
                size: 2,
                tags: ['cnc', 'floor-1'],
                categories: ['machines'],
                children: [
                  {
                    name: 'Spindle Motor',
                    status: 'Component',
                    company: 'Acme Corp',
                    color: '#10B981',
                    description: 'Main spindle motor',
                    coordinate: { x: 10, y: 1, z: 5 },
                    line_coordinate: { x: 0, y: 0, z: 0 },
                    rotate_xyz: { x: 0, y: 0, z: 0 },
                    size: 0.5,
                    tags: ['motor', 'spindle'],
                    categories: ['components'],
                    children: [],
                  },
                ],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Node created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNode' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ─── Bulk Upsert Tree ─────────────────────────────────────────────
    '/nodes/bulk-upsert-tree': {
      post: {
        operationId: 'bulkUpsertTree',
        summary: 'Bulk Upsert Tree',
        description:
          'Upsert an entire tree structure in a single request. Nodes with an `id` will be updated, nodes without will be created. Children are processed recursively.',
        tags: ['Bulk Operations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nodes'],
                properties: {
                  nodes: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/BulkUpsertNodeInput' },
                    description: 'Array of nodes to upsert (recursive)',
                  },
                },
              },
              example: {
                nodes: [
                  {
                    name: 'Factory Floor',
                    status: 'Machine',
                    company: 'Acme Corp',
                    color: '#6366F1',
                    coordinate: { x: 0, y: 0, z: 0 },
                    line_coordinate: { x: 0, y: 0, z: 0 },
                    rotate_xyz: { x: 0, y: 0, z: 0 },
                    size: 10,
                    tags: ['factory'],
                    categories: ['buildings'],
                    children: [
                      {
                        name: 'Assembly Line 1',
                        status: 'Machine',
                        company: 'Acme Corp',
                        color: '#F59E0B',
                        coordinate: { x: 5, y: 0, z: 3 },
                        line_coordinate: { x: 0, y: 0, z: 0 },
                        rotate_xyz: { x: 0, y: 0, z: 0 },
                        size: 3,
                        tags: ['assembly'],
                        categories: ['production'],
                        children: [],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tree upserted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNode' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ─── Single Node ──────────────────────────────────────────────────
    '/nodes/{id}': {
      get: {
        operationId: 'getNode',
        summary: 'Get Node',
        description:
          'Retrieve a single asset node by its UUID, including its direct children.',
        tags: ['Nodes'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the node',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Node details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNode' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Node not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        operationId: 'updateNode',
        summary: 'Update Node',
        description:
          'Partially update an asset node. Only the provided fields will be modified. At least one field must be provided.',
        tags: ['Nodes'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the node to update',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateNodeInput' },
              example: {
                name: 'Updated Machine Name',
                color: '#EF4444',
                is_active: false,
                coordinate: { x: 15, y: 2, z: 8 },
                tags: ['updated', 'maintenance'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Node updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNode' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Node not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'deleteNode',
        summary: 'Delete Node',
        description:
          'Delete a node. Use `mode=subtree` (default) to delete the node and all its descendants, or `mode=node` to delete only the node and reparent its children.',
        tags: ['Nodes'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the node to delete',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'mode',
            in: 'query',
            description:
              '`subtree` — delete node and all descendants (default). `node` — delete only the node, reparent children.',
            schema: {
              type: 'string',
              enum: ['node', 'subtree'],
              default: 'subtree',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Node deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        deleted: { type: 'integer', example: 3 },
                        message: {
                          type: 'string',
                          example: 'Subtree deleted successfully',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Node not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ─── Node Tree ────────────────────────────────────────────────────
    '/nodes/{id}/tree': {
      get: {
        operationId: 'getNodeTree',
        summary: 'Get Node Tree',
        description:
          'Retrieve the full recursive tree structure starting from the specified node. Optionally limit the depth of traversal.',
        tags: ['Tree Operations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the root node to start tree traversal',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'depth',
            in: 'query',
            description:
              'Maximum depth to traverse. If omitted, returns the full tree.',
            schema: { type: 'integer', minimum: 1 },
          },
        ],
        responses: {
          '200': {
            description: 'Recursive tree structure',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNodeTree' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Node not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ─── Node Children ────────────────────────────────────────────────
    '/nodes/{id}/children': {
      get: {
        operationId: 'getDirectChildren',
        summary: 'Get Direct Children',
        description:
          'Retrieve only the direct (immediate) children of the specified node, without recursive traversal.',
        tags: ['Tree Operations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the parent node',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'List of direct children',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AssetNode' },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Parent node not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        operationId: 'addChildren',
        summary: 'Add Children to Node',
        description:
          'Add one or more child nodes to an existing parent node. Children can be nested recursively.',
        tags: ['Tree Operations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the parent node',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['children'],
                properties: {
                  children: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/CreateNodeInput' },
                    description: 'Array of child nodes to add',
                  },
                },
              },
              example: {
                children: [
                  {
                    name: 'Sensor Unit A',
                    status: 'Component',
                    company: 'Acme Corp',
                    color: '#8B5CF6',
                    description: 'Temperature sensor',
                    coordinate: { x: 11, y: 1, z: 5 },
                    line_coordinate: { x: 0, y: 0, z: 0 },
                    rotate_xyz: { x: 0, y: 0, z: 0 },
                    size: 0.2,
                    tags: ['sensor', 'temperature'],
                    categories: ['sensors'],
                  },
                ],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Children added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNode' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Parent node not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ─── Move Node ────────────────────────────────────────────────────
    '/nodes/{id}/move': {
      patch: {
        operationId: 'moveNode',
        summary: 'Move Node',
        description:
          'Move a node to a new parent. Set `new_parent_id` to a valid UUID to reparent, or `null` to make it a root node.',
        tags: ['Tree Operations'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the node to move',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MoveNodeInput' },
              example: {
                new_parent_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Node moved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/AssetNode' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid move (e.g., circular reference)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Node or target parent not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // ─── Screenshots ──────────────────────────────────────────────────
    '/screenshots': {
      get: {
        operationId: 'listScreenshots',
        summary: 'List Screenshots',
        description:
          'Retrieve uploaded Unity screenshots. Maintenance views can use this endpoint to display recent captures, optionally filtered by asset node.',
        tags: ['Screenshots'],
        parameters: [
          {
            name: 'asset_node_id',
            in: 'query',
            description: 'Filter screenshots by linked asset node UUID',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number (1-indexed)',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated screenshot list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/DigitalTwinScreenshot',
                      },
                    },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'uploadScreenshot',
        summary: 'Upload Screenshot',
        description:
          'Upload a Unity digital twin screenshot using multipart/form-data. Use form field `file` or `screenshot` for the image.',
        tags: ['Screenshots'],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description:
                      'Screenshot image file. PNG, JPG, and WebP are supported.',
                  },
                  asset_node_id: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Optional asset node UUID related to capture',
                  },
                  title: { type: 'string', maxLength: 255 },
                  description: { type: 'string' },
                  captured_at: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Timestamp from Unity when capture was taken',
                  },
                  uploaded_by: {
                    type: 'string',
                    maxLength: 255,
                    description: 'Optional uploader/user identifier',
                  },
                  metadata: {
                    type: 'string',
                    description:
                      'Optional JSON object string for Unity-specific context',
                    example: '{"scene":"FactoryFloor","camera":"MainCamera"}',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Screenshot uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      $ref: '#/components/schemas/DigitalTwinScreenshot',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request or unsupported file type',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '413': {
            description: 'Uploaded file is too large',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/screenshots/{id}': {
      get: {
        operationId: 'getScreenshot',
        summary: 'Get Screenshot',
        description: 'Retrieve one uploaded screenshot by UUID.',
        tags: ['Screenshots'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the screenshot',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Screenshot detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      $ref: '#/components/schemas/DigitalTwinScreenshot',
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Screenshot not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },

  // ─── Components ───────────────────────────────────────────────────
  components: {
    schemas: {
      Coordinate: {
        type: 'object',
        description: '3D coordinate with x, y, z values',
        properties: {
          x: { type: 'number', default: 0, example: 10 },
          y: { type: 'number', default: 0, example: 0 },
          z: { type: 'number', default: 0, example: 5 },
        },
      },

      AssetNode: {
        type: 'object',
        description:
          'Represents a machine or component node in the digital twin tree',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          },
          name: { type: 'string', example: 'CNC Machine A1' },
          status: { type: 'string', example: 'Machine' },
          company: { type: 'string', example: 'Acme Corp' },
          color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$', example: '#3B82F6' },
          level: { type: 'integer', example: 1 },
          is_active: { type: 'boolean', example: true },
          icon: { type: 'string', example: 'tabler:settings' },
          description: { type: 'string', example: 'Primary CNC machine' },
          coordinate: { $ref: '#/components/schemas/Coordinate' },
          line_coordinate: { $ref: '#/components/schemas/Coordinate' },
          rotate_xyz: { $ref: '#/components/schemas/Coordinate' },
          size: { type: 'number', example: 2 },
          parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: null,
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            example: ['cnc', 'floor-1'],
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            example: ['machines'],
          },
          dependent_category: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-10T06:00:00.000Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-03-10T06:00:00.000Z',
          },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/AssetNode' },
            description: 'Direct children of this node',
          },
        },
      },

      AssetNodeTree: {
        type: 'object',
        description:
          'Asset node with recursively nested children (full tree)',
        allOf: [
          { $ref: '#/components/schemas/AssetNode' },
          {
            type: 'object',
            properties: {
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/AssetNodeTree' },
                description: 'Recursively nested children',
              },
            },
          },
        ],
      },

      CreateNodeInput: {
        type: 'object',
        required: ['name'],
        description: 'Input schema for creating a new node with optional nested children',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Node name (required)',
          },
          status: { type: 'string', maxLength: 100, default: 'Machine' },
          company: { type: 'string', maxLength: 255, default: '' },
          color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            default: '#000000',
            description: 'Hex color code',
          },
          level: {
            type: 'integer',
            minimum: 1,
            description: 'Auto-calculated if not provided',
          },
          is_active: { type: 'boolean', default: true },
          icon: { type: 'string', maxLength: 255, default: 'tabler:settings' },
          description: { type: 'string', default: '' },
          coordinate: { $ref: '#/components/schemas/Coordinate' },
          line_coordinate: { $ref: '#/components/schemas/Coordinate' },
          rotate_xyz: { $ref: '#/components/schemas/Coordinate' },
          size: { type: 'number', minimum: 0, default: 1 },
          parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description: 'UUID of parent node, null for root nodes',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          dependent_category: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/CreateNodeInput' },
            default: [],
            description: 'Nested children to create recursively',
          },
        },
      },

      UpdateNodeInput: {
        type: 'object',
        description:
          'Partial update schema — at least one field must be provided',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          status: { type: 'string', maxLength: 100 },
          company: { type: 'string', maxLength: 255 },
          color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Hex color code',
          },
          is_active: { type: 'boolean' },
          icon: { type: 'string', maxLength: 255 },
          description: { type: 'string' },
          coordinate: { $ref: '#/components/schemas/Coordinate' },
          line_coordinate: { $ref: '#/components/schemas/Coordinate' },
          rotate_xyz: { $ref: '#/components/schemas/Coordinate' },
          size: { type: 'number', minimum: 0 },
          tags: { type: 'array', items: { type: 'string' } },
          categories: { type: 'array', items: { type: 'string' } },
          dependent_category: { type: 'array', items: { type: 'string' } },
        },
      },

      MoveNodeInput: {
        type: 'object',
        required: ['new_parent_id'],
        description: 'Input for moving a node to a new parent',
        properties: {
          new_parent_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            description:
              'UUID of the new parent node, or null to make it a root node',
          },
        },
      },

      BulkUpsertNodeInput: {
        type: 'object',
        required: ['name'],
        description:
          'Input for bulk upserting a node. Include `id` to update an existing node, omit to create a new one.',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description:
              'If provided, the existing node will be updated. If omitted, a new node is created.',
          },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          status: { type: 'string', maxLength: 100, default: 'Machine' },
          company: { type: 'string', maxLength: 255, default: '' },
          color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            default: '#000000',
          },
          level: { type: 'integer', minimum: 1 },
          is_active: { type: 'boolean', default: true },
          icon: { type: 'string', maxLength: 255, default: 'tabler:settings' },
          description: { type: 'string', default: '' },
          coordinate: { $ref: '#/components/schemas/Coordinate' },
          line_coordinate: { $ref: '#/components/schemas/Coordinate' },
          rotate_xyz: { $ref: '#/components/schemas/Coordinate' },
          size: { type: 'number', minimum: 0, default: 1 },
          parent_id: { type: 'string', format: 'uuid', nullable: true },
          tags: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          categories: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          dependent_category: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/BulkUpsertNodeInput' },
            default: [],
            description: 'Nested children to upsert recursively',
          },
        },
      },

      DigitalTwinScreenshot: {
        type: 'object',
        description: 'Screenshot uploaded from Unity digital twin sessions',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'de305d54-75b4-431b-adb2-eb6b9e546014',
          },
          asset_node_id: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          },
          asset_node: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: 'CNC Machine A1' },
              status: { type: 'string', example: 'Machine' },
            },
          },
          title: { type: 'string', example: 'Overheat warning capture' },
          description: {
            type: 'string',
            example: 'Screenshot captured from Unity inspection camera',
          },
          file_name: {
            type: 'string',
            example: 'de305d54-75b4-431b-adb2-eb6b9e546014.png',
          },
          original_name: { type: 'string', example: 'capture.png' },
          mime_type: { type: 'string', example: 'image/png' },
          size_bytes: { type: 'integer', example: 481226 },
          url: {
            type: 'string',
            example:
              '/uploads/digital-twin-screenshots/de305d54-75b4-431b-adb2-eb6b9e546014.png',
          },
          captured_at: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-05-11T09:30:00.000Z',
          },
          uploaded_by: {
            type: 'string',
            nullable: true,
            example: 'unity-client',
          },
          metadata: {
            type: 'object',
            nullable: true,
            additionalProperties: true,
            example: { scene: 'FactoryFloor', camera: 'MainCamera' },
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-05-11T09:30:02.000Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            example: '2026-05-11T09:30:02.000Z',
          },
        },
      },

      PaginationMeta: {
        type: 'object',
        description: 'Pagination metadata',
        properties: {
          total: {
            type: 'integer',
            example: 42,
            description: 'Total number of matching items',
          },
          page: {
            type: 'integer',
            example: 1,
            description: 'Current page number',
          },
          limit: {
            type: 'integer',
            example: 50,
            description: 'Items per page',
          },
        },
      },

      ErrorResponse: {
        type: 'object',
        description: 'Standard error response',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Validation failed',
              },
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', example: 'name' },
                    message: {
                      type: 'string',
                      example: 'Name is required',
                    },
                  },
                },
                description: 'Detailed validation errors (if applicable)',
              },
            },
          },
        },
      },
    },
  },
} as const;
