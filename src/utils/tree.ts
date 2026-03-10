import type { AssetNode } from '@prisma/client';

/**
 * Transforms a flat database AssetNode row into the Unity-friendly
 * response format with nested coordinate objects.
 */
export function transformNodeToResponse(node: AssetNode & { children?: AssetNode[] }): Record<string, unknown> {
  return {
    id: node.id,
    name: node.name,
    status: node.status,
    company: node.company,
    color: node.color,
    level: node.level,
    is_active: node.isActive,
    icon: node.icon,
    description: node.description,
    coordinate: {
      x: node.coordinateX,
      y: node.coordinateY,
      z: node.coordinateZ,
    },
    line_coordinate: {
      x: node.lineCoordinateX,
      y: node.lineCoordinateY,
      z: node.lineCoordinateZ,
    },
    rotate_xyz: {
      x: node.rotateX,
      y: node.rotateY,
      z: node.rotateZ,
    },
    size: node.size,
    parent_id: node.parentId,
    tags: node.tags,
    categories: node.categories,
    dependent_category: node.dependentCategory,
    created_at: node.createdAt.toISOString(),
    updated_at: node.updatedAt.toISOString(),
    children: (node.children || []).map((child: AssetNode & { children?: AssetNode[] }) =>
      transformNodeToResponse(child)
    ),
  };
}

/**
 * Transforms a node without children (for flat list/detail views).
 */
export function transformNodeFlat(node: AssetNode): Record<string, unknown> {
  const result = transformNodeToResponse({ ...node, children: [] });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { children: _, ...rest } = result;
  return rest;
}

/**
 * Builds a tree from a flat array of nodes (all must share common ancestor).
 * Useful when you fetch all nodes in one query and want to assemble the tree in memory.
 */
export function buildTreeFromFlat(
  nodes: AssetNode[],
  rootId: string | null = null
): (AssetNode & { children: AssetNode[] })[] {
  const nodeMap = new Map<string, AssetNode & { children: AssetNode[] }>();

  // Initialize all nodes with empty children array
  for (const node of nodes) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  const roots: (AssetNode & { children: AssetNode[] })[] = [];

  // Build parent-child relationships
  for (const node of nodes) {
    const current = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(current);
    } else if (node.parentId === rootId || node.id === rootId) {
      roots.push(current);
    }
  }

  // If rootId specified, return only that node
  if (rootId && nodeMap.has(rootId)) {
    return [nodeMap.get(rootId)!];
  }

  return roots;
}
