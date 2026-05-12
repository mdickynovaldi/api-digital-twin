export const anomalyOpenApiTags = [
  {
    name: 'Auth',
    description: 'Bearer token authentication and role sessions',
  },
  {
    name: 'Anomalies',
    description: 'Digital twin anomaly workflow for operator and maintenance',
  },
  {
    name: 'Notifications',
    description: 'Role-based anomaly notifications',
  },
  {
    name: 'Unity',
    description: 'Lightweight anomaly state endpoints for Unity polling',
  },
] as const;

export const anomalyOpenApiSecuritySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'opaque-token',
  },
} as const;

const bearerSecurity = [{ bearerAuth: [] }];

const anomalyResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { $ref: '#/components/schemas/Anomaly' },
  },
};

export const anomalyOpenApiPaths = {
  '/auth/register': {
    post: {
      operationId: 'register',
      summary: 'Register auth user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterInput' },
          },
        },
      },
      responses: {
        '201': {
          description: 'User registered and token returned',
        },
      },
    },
  },
  '/auth/login': {
    post: {
      operationId: 'login',
      summary: 'Login and receive bearer token',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginInput' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Token returned',
        },
      },
    },
  },
  '/auth/me': {
    get: {
      operationId: 'me',
      summary: 'Get authenticated user',
      tags: ['Auth'],
      security: bearerSecurity,
      responses: { '200': { description: 'Current auth user' } },
    },
  },
  '/auth/logout': {
    post: {
      operationId: 'logout',
      summary: 'Revoke current bearer token',
      tags: ['Auth'],
      security: bearerSecurity,
      responses: { '200': { description: 'Token revoked' } },
    },
  },
  '/anomalies': {
    post: {
      operationId: 'createAnomaly',
      summary: 'Create anomaly from Unity/operator',
      tags: ['Anomalies'],
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/CreateAnomalyMultipart' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Anomaly created',
          content: {
            'application/json': {
              schema: anomalyResponse,
            },
          },
        },
      },
    },
    get: {
      operationId: 'listAnomalies',
      summary: 'List anomalies for maintenance dashboard',
      tags: ['Anomalies'],
      security: bearerSecurity,
      parameters: [
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/AnomalyListStatus' } },
        { name: 'severity', in: 'query', schema: { $ref: '#/components/schemas/AnomalySeverity' } },
        { name: 'asset_node_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'assigned_to', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest'], default: 'newest' } },
      ],
      responses: {
        '200': {
          description: 'Paginated anomalies',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Anomaly' },
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
      },
    },
  },
  '/anomalies/{id}': {
    get: {
      operationId: 'getAnomaly',
      summary: 'Get anomaly detail',
      tags: ['Anomalies'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        '200': {
          description: 'Anomaly detail',
          content: {
            'application/json': {
              schema: anomalyResponse,
            },
          },
        },
      },
    },
  },
  '/anomalies/{id}/acknowledge': {
    patch: {
      operationId: 'acknowledgeAnomaly',
      summary: 'Acknowledge anomaly',
      tags: ['Anomalies'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AcknowledgeAnomalyInput' },
          },
        },
      },
      responses: { '200': { description: 'Anomaly acknowledged' } },
    },
  },
  '/anomalies/{id}/status': {
    patch: {
      operationId: 'updateAnomalyStatus',
      summary: 'Update anomaly status manually',
      tags: ['Anomalies'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateAnomalyStatusInput' },
          },
        },
      },
      responses: { '200': { description: 'Status updated' } },
    },
  },
  '/anomalies/{id}/resolve': {
    post: {
      operationId: 'resolveAnomaly',
      summary: 'Resolve anomaly with field result',
      tags: ['Anomalies'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: { $ref: '#/components/schemas/ResolveAnomalyMultipart' },
          },
        },
      },
      responses: { '200': { description: 'Anomaly resolved' } },
    },
  },
  '/nodes/{asset_node_id}/anomalies/active': {
    get: {
      operationId: 'getActiveAnomaliesByAsset',
      summary: 'Get active anomalies for a node',
      tags: ['Unity'],
      security: bearerSecurity,
      parameters: [
        { name: 'asset_node_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { '200': { description: 'Active anomalies' } },
    },
  },
  '/nodes/{asset_node_id}/anomalies/latest': {
    get: {
      operationId: 'getLatestAnomalyByAsset',
      summary: 'Get latest anomaly state for a node',
      tags: ['Unity'],
      security: bearerSecurity,
      parameters: [
        { name: 'asset_node_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { '200': { description: 'Latest anomaly or null' } },
    },
  },
  '/notifications': {
    get: {
      operationId: 'listNotifications',
      summary: 'List role notifications',
      tags: ['Notifications'],
      security: bearerSecurity,
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['maintenance', 'operator', 'admin'], default: 'maintenance' } },
        { name: 'is_read', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
      ],
      responses: { '200': { description: 'Paginated notifications' } },
    },
  },
  '/notifications/{id}/read': {
    patch: {
      operationId: 'markNotificationRead',
      summary: 'Mark notification as read',
      tags: ['Notifications'],
      security: bearerSecurity,
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: { '200': { description: 'Notification marked read' } },
    },
  },
  '/notifications/unread-count': {
    get: {
      operationId: 'unreadNotificationCount',
      summary: 'Get unread notification count',
      tags: ['Notifications'],
      security: bearerSecurity,
      parameters: [
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['maintenance', 'operator', 'admin'], default: 'maintenance' } },
      ],
      responses: { '200': { description: 'Unread count' } },
    },
  },
  '/unity/anomalies/sync': {
    get: {
      operationId: 'syncUnityAnomalies',
      summary: 'Sync anomaly state changes for Unity',
      tags: ['Unity'],
      security: bearerSecurity,
      parameters: [
        { name: 'since', in: 'query', schema: { type: 'string', format: 'date-time' } },
      ],
      responses: { '200': { description: 'Changed anomaly states' } },
    },
  },
} as const;

export const anomalyOpenApiSchemas = {
  RegisterInput: {
    type: 'object',
    required: ['username', 'password', 'role'],
    properties: {
      username: { type: 'string', example: 'operator1' },
      password: { type: 'string', format: 'password', example: 'secret123' },
      display_name: { type: 'string', example: 'Operator 1' },
      role: {
        type: 'string',
        enum: ['operator', 'maintenance', 'admin', 'unity-client'],
      },
    },
  },
  LoginInput: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', example: 'operator1' },
      password: { type: 'string', format: 'password', example: 'secret123' },
    },
  },
  AnomalyStatus: {
    type: 'string',
    enum: ['open', 'acknowledged', 'in_progress', 'resolved', 'rejected'],
  },
  AnomalyListStatus: {
    type: 'string',
    enum: ['open', 'acknowledged', 'in_progress', 'resolved'],
  },
  AnomalySeverity: {
    type: 'string',
    enum: ['low', 'medium', 'high', 'critical'],
  },
  AnomalyType: {
    type: 'string',
    enum: ['temperature', 'vibration', 'leak', 'noise', 'visual', 'electrical', 'mechanical', 'other'],
  },
  CreateAnomalyMultipart: {
    type: 'object',
    required: ['asset_node_id', 'title', 'description', 'anomaly_type', 'severity', 'screenshot'],
    properties: {
      asset_node_id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      description: { type: 'string' },
      anomaly_type: { $ref: '#/components/schemas/AnomalyType' },
      severity: { $ref: '#/components/schemas/AnomalySeverity' },
      captured_at: { type: 'string', format: 'date-time' },
      reported_by: { type: 'string' },
      metadata: { type: 'string', description: 'JSON object string' },
      screenshot: { type: 'string', format: 'binary' },
    },
  },
  AcknowledgeAnomalyInput: {
    type: 'object',
    required: ['acknowledged_by'],
    properties: {
      acknowledged_by: { type: 'string' },
      assigned_to: { type: 'string' },
      note: { type: 'string' },
    },
  },
  UpdateAnomalyStatusInput: {
    type: 'object',
    required: ['status', 'updated_by'],
    properties: {
      status: { $ref: '#/components/schemas/AnomalyStatus' },
      note: { type: 'string' },
      updated_by: { type: 'string' },
    },
  },
  ResolveAnomalyMultipart: {
    type: 'object',
    required: ['resolution_note', 'resolved_by', 'resolution_photo'],
    properties: {
      resolution_note: { type: 'string' },
      resolved_by: { type: 'string' },
      metadata: { type: 'string', description: 'JSON object string' },
      resolution_photo: { type: 'string', format: 'binary' },
    },
  },
  Anomaly: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      asset_node_id: { type: 'string', format: 'uuid' },
      asset_node: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          status: { type: 'string' },
        },
      },
      title: { type: 'string' },
      description: { type: 'string' },
      anomaly_type: { $ref: '#/components/schemas/AnomalyType' },
      severity: { $ref: '#/components/schemas/AnomalySeverity' },
      status: { $ref: '#/components/schemas/AnomalyStatus' },
      marker_state: { type: 'string', enum: ['none', 'active_anomaly', 'resolved'] },
      screenshot_url: { type: 'string' },
      captured_at: { type: 'string', format: 'date-time', nullable: true },
      reported_by: { type: 'string', nullable: true },
      acknowledged_by: { type: 'string', nullable: true },
      acknowledged_at: { type: 'string', format: 'date-time', nullable: true },
      assigned_to: { type: 'string', nullable: true },
      resolution_note: { type: 'string', nullable: true },
      resolution_photo_url: { type: 'string', nullable: true },
      resolved_by: { type: 'string', nullable: true },
      resolved_at: { type: 'string', format: 'date-time', nullable: true },
      metadata: { type: 'object', nullable: true, additionalProperties: true },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  },
  Notification: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      user_role: { type: 'string', enum: ['maintenance', 'operator', 'admin'] },
      anomaly_id: { type: 'string', format: 'uuid' },
      asset_node_id: { type: 'string', format: 'uuid' },
      type: {
        type: 'string',
        enum: ['anomaly_created', 'anomaly_acknowledged', 'anomaly_resolved'],
      },
      title: { type: 'string' },
      message: { type: 'string' },
      is_read: { type: 'boolean' },
      created_at: { type: 'string', format: 'date-time' },
      read_at: { type: 'string', format: 'date-time', nullable: true },
    },
  },
} as const;
