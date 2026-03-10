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
## Overview | Gambaran Umum

**[EN]** REST API for managing hierarchical machine/asset nodes in a Unity digital twin application.
Supports full CRUD operations with recursive tree structures, nested children, subtree operations, and bulk upserts.
**[ID]** REST API untuk mengelola node mesin/aset hierarkis dalam aplikasi digital twin Unity.
Mendukung operasi CRUD penuh dengan struktur pohon rekursif, anak bersarang (nested children), operasi sub-pohon, dan upsert massal.

## Features | Fitur

- 🌳 **Recursive Tree Structure | Struktur Pohon Rekursif** — Nodes can have unlimited nested children | Node dapat memiliki anak bersarang tak terbatas
- 🔄 **Full CRUD | CRUD Penuh** — Create, Read, Update, Delete operations for all nodes | Operasi Buat, Baca, Perbarui, Hapus untuk semua node
- 📦 **Bulk Operations | Operasi Massal** — Upsert entire tree structures in a single request | Upsert seluruh struktur pohon dalam satu permintaan
- 🚚 **Move Nodes | Pindahkan Node** — Reparent nodes within the tree | Mengubah referensi induk (parent) node dalam pohon
- 🎯 **Filtering | Penyaringan** — Query nodes by status, company, active state | Kueri pencarian node berdasarkan status, perusahaan, dan status aktif
- 📄 **Pagination | Paginasi** — Built-in pagination for list endpoints | Paginasi bawaan untuk endpoint daftar
- 🎮 **Unity Ready | Siap untuk Unity** — Designed for integration with Unity applications | Dirancang untuk integrasi dengan aplikasi Unity

## Response Format | Format Respons

**[EN]** All endpoints return a consistent JSON format:
**[ID]** Semua endpoint mengembalikan format JSON yang konsisten:

\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 50 }
}
\`\`\`

**[EN]** Error responses follow the same structure:
**[ID]** Respons kesalahan (error) mengikuti struktur yang sama:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Description of the error | Deskripsi kesalahan",
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
      description: 'Current Server | Server Saat Ini',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Local Development | Pengembangan Lokal',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health check endpoints | Endpoint pemeriksaan status layanan',
    },
    {
      name: 'Nodes',
      description: 'CRUD operations for AssetNode resources | Operasi CRUD untuk resource AssetNode',
    },
    {
      name: 'Tree Operations',
      description: 'Recursive tree traversal and manipulation | Penelusuran dan manipulasi pohon rekursif',
    },
    {
      name: 'Bulk Operations',
      description: 'Batch operations for tree structures | Operasi massal untuk struktur pohon',
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
        summary: 'List Nodes | Daftar Node',
        description:
          '**[EN]** Retrieve a paginated list of asset nodes with optional filtering by root status, status, company, and active state.\n**[ID]** Mengambil daftar paginasi node aset dengan penyaringan (filter) opsional berdasarkan status root, status, perusahaan, dan keadaan aktif.',
        tags: ['Nodes'],
        parameters: [
          {
            name: 'rootOnly',
            in: 'query',
            description:
              '**[EN]** If `true`, only return root nodes (nodes without a parent). **[ID]** Jika `true`, hanya mengembalikan node root (node tanpa parent)',
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
        summary: 'Create Node | Buat Node',
        description:
          '**[EN]** Create a new asset node. Supports creating nested children in a single request by providing the `children` array recursively.\n**[ID]** Membuat node aset baru. Mendukung pembuatan anak bersarang (nested children) dalam satu permintaan dengan menyertakan array `children` secara rekursif.',
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
        summary: 'Bulk Upsert Tree | Upsert Pohon Secara Massal',
        description:
          '**[EN]** Upsert an entire tree structure in a single request. Nodes with an `id` will be updated, nodes without will be created. Children are processed recursively.\n**[ID]** Melakukan upsert (tambah/perbarui) seluruh struktur pohon dalam satu permintaan. Node dengan `id` akan diperbarui, node tanpa `id` akan dibuat baru. Anak (children) diproses secara rekursif.',
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
        summary: 'Get Node | Ambil Node',
        description:
          '**[EN]** Retrieve a single asset node by its UUID, including its direct children.\n**[ID]** Mengambil satu node aset berdasarkan UUID-nya, termasuk anak langsungnya (direct children).',
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
        summary: 'Update Node | Perbarui Node',
        description:
          '**[EN]** Partially update an asset node. Only the provided fields will be modified. At least one field must be provided.\n**[ID]** Memperbarui sebagian dari node aset. Hanya field yang disertakan yang akan diubah. Setidaknya satu field harus disertakan.',
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
        summary: 'Delete Node | Hapus Node',
        description:
          '**[EN]** Delete a node. Use `mode=subtree` (default) to delete the node and all its descendants, or `mode=node` to delete only the node and reparent its children.\n**[ID]** Menghapus sebuah node. Gunakan `mode=subtree` (bawaan) untuk menghapus node beserta semua keturunannya, atau `mode=node` untuk menghapus hanya node tersebut dan memindahkan anak-anaknya ke induk (parent) lain.',
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
        summary: 'Get Node Tree | Ambil Pohon Node',
        description:
          '**[EN]** Retrieve the full recursive tree structure starting from the specified node. Optionally limit the depth of traversal.\n**[ID]** Mengambil seluruh struktur pohon rekursif dimulai dari node yang ditentukan. Secara opsional, batasi kedalaman penelusuran (depth).',
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
        summary: 'Get Direct Children | Ambil Anak Langsung',
        description:
          '**[EN]** Retrieve only the direct (immediate) children of the specified node, without recursive traversal.\n**[ID]** Mengambil hanya anak langsung (immediate children) dari node yang ditentukan, tanpa penelusuran rekursif.',
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
        summary: 'Add Children to Node | Tambahkan Anak ke Node',
        description:
          '**[EN]** Add one or more child nodes to an existing parent node. Children can be nested recursively.\n**[ID]** Menambahkan satu atau lebih node anak ke node induk (parent) yang ada. Anak dapat disarangkan (nested) secara rekursif.',
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
        summary: 'Move Node | Pindahkan Node',
        description:
          '**[EN]** Move a node to a new parent. Set `new_parent_id` to a valid UUID to reparent, or `null` to make it a root node.\n**[ID]** Memindahkan node ke induk (parent) baru. Atur `new_parent_id` ke UUID yang valid untuk memindahkan induk, atau `null` untuk menjadikannya node root.',
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

    // ─── File Uploads ──────────────────────────────────────────────────
    '/nodes/{id}/files': {
      get: {
        operationId: 'getNodeFiles',
        summary: 'Get Node Files | Ambil File Node',
        description: `**[EN]** Retrieve only the file URLs attached to a node.
      You can use the \`?type=\` query parameter to filter by file type:
      - \`?type=pdf\`: Returns only PDF URLs
      - \`?type=image\`: Returns only Image URLs
      - \`?type=video\`: Returns only Video URLs
      If \`type\` is omitted, it returns all file URLs (pdfs, images, videos).

      **[ID]** Mengambil hanya URL file yang terlampir pada node.
      Anda dapat menggunakan query parameter \`?type=\` untuk menyaring berdasarkan jenis file:
      - \`?type=pdf\`: Hanya mengembalikan URL PDF
      - \`?type=image\`: Hanya mengembalikan URL Gambar
      - \`?type=video\`: Hanya mengembalikan URL Video
      Jika \`type\` tidak disertakan, API akan mengembalikan semua URL file.`,
        tags: ['Nodes'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the node',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter files by type (`pdf`, `image`, or `video`)',
            schema: { type: 'string', enum: ['pdf', 'image', 'video'] },
          },
        ],
        responses: {
          '200': {
            description: 'File URLs retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        pdfs: { type: 'array', items: { type: 'string', format: 'uri' } },
                        images: { type: 'array', items: { type: 'string', format: 'uri' } },
                        videos: { type: 'array', items: { type: 'string', format: 'uri' } },
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
      post: {
        operationId: 'uploadNodeFiles',
        summary: 'Upload Node Files | Unggah File Node',
        description: '**[EN]** Upload multiple files (pdfs, images, videos) and attach them to a node. Accepts `multipart/form-data`.\n**[ID]** Mengunggah beberapa file (PDF, gambar, video) dan melampirkannya ke node. Menerima `multipart/form-data`.',
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
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  'pdfs[]': {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'PDF documents (max 20MB each)',
                  },
                  'images[]': {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Image files (JPEG/PNG/WebP/GIF, max 10MB each)',
                  },
                  'videos[]': {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                    description: 'Video files (MP4/WebM/MOV, max 200MB each)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Files uploaded successfully',
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
            description: 'Validation error or invalid file type/size',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        operationId: 'deleteNodeFiles',
        summary: 'Delete Node Files | Hapus File Node',
        description: '**[EN]** Remove specific file URLs from a node and delete them from disk.\n**[ID]** Menghapus URL file tertentu dari node dan menghapusnya dari disk.',
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
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pdfs: { type: 'array', items: { type: 'string', format: 'uri' } },
                  images: { type: 'array', items: { type: 'string', format: 'uri' } },
                  videos: { type: 'array', items: { type: 'string', format: 'uri' } },
                },
              },
              example: {
                pdfs: ['/uploads/pdfs/document.pdf'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Files deleted successfully',
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
          pdfs: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            example: ['/uploads/pdfs/xxx.pdf'],
          },
          images: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            example: ['/uploads/images/xxx.jpg'],
          },
          videos: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            example: ['/uploads/videos/xxx.mp4'],
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
          pdfs: { type: 'array', items: { type: 'string', format: 'uri' } },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          videos: { type: 'array', items: { type: 'string', format: 'uri' } },
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
