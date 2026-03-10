import { v4 as uuidv4 } from 'uuid';
import { nodeRepository } from '@/src/repositories/node.repository';
import type {
  CreateNodeInput,
  UpdateNodeInput,
  MoveNodeInput,
  BulkUpsertNodeInput,
} from '@/src/schemas/node.schema';
import { transformNodeToResponse, transformNodeFlat } from '@/src/utils/tree';
import { AppError } from '@/src/middleware';
import type { AssetNode } from '@prisma/client';

/**
 * Service layer — all business logic for AssetNode operations.
 */
export const nodeService = {
  /**
   * Create a node with optional recursive children.
   * Automatically calculates level based on parent.
   */
  async createNode(
    input: CreateNodeInput,
    parentIdOverride?: string
  ): Promise<Record<string, unknown>> {
    const parentId = parentIdOverride ?? input.parent_id ?? null;
    let level = 1;

    // Calculate level from parent
    if (parentId) {
      const parent = await nodeRepository.findById(parentId);
      if (!parent) {
        throw new AppError('Parent node not found', 404, 'PARENT_NOT_FOUND');
      }
      level = parent.level + 1;
    }

    // Use provided level or calculated level
    const nodeLevel = input.level ?? level;

    const nodeId = uuidv4();

    const createdNode = await nodeRepository.create({
      id: nodeId,
      name: input.name,
      status: input.status,
      company: input.company,
      color: input.color,
      level: nodeLevel,
      isActive: input.is_active,
      icon: input.icon,
      description: input.description,
      coordinateX: input.coordinate.x,
      coordinateY: input.coordinate.y,
      coordinateZ: input.coordinate.z,
      lineCoordinateX: input.line_coordinate.x,
      lineCoordinateY: input.line_coordinate.y,
      lineCoordinateZ: input.line_coordinate.z,
      rotateX: input.rotate_xyz.x,
      rotateY: input.rotate_xyz.y,
      rotateZ: input.rotate_xyz.z,
      size: input.size,
      parentId: parentId,
      tags: input.tags,
      categories: input.categories,
      dependentCategory: input.dependent_category,
    });

    // Recursively create children
    const childrenResults: Record<string, unknown>[] = [];
    if (input.children && input.children.length > 0) {
      for (const childInput of input.children) {
        const childResult = await this.createNode(childInput, nodeId);
        childrenResults.push(childResult);
      }
    }

    return {
      ...transformNodeFlat(createdNode),
      children: childrenResults,
    };
  },

  /**
   * Get a single node detail (without full subtree).
   */
  async getNode(id: string): Promise<Record<string, unknown>> {
    const node = await nodeRepository.findWithDirectChildren(id);
    if (!node) {
      throw new AppError('Node not found', 404, 'NOT_FOUND');
    }
    return transformNodeToResponse(node as AssetNode & { children?: AssetNode[] });
  },

  /**
   * Get a node with full recursive tree of all descendants.
   */
  async getNodeTree(
    id: string,
    maxDepth?: number
  ): Promise<Record<string, unknown>> {
    const tree = await nodeRepository.findTreeRecursive(id, maxDepth);
    if (!tree) {
      throw new AppError('Node not found', 404, 'NOT_FOUND');
    }
    return transformNodeToResponse(tree as AssetNode & { children?: AssetNode[] });
  },

  /**
   * List nodes with optional filtering.
   */
  async listNodes(options?: {
    rootOnly?: boolean;
    status?: string;
    company?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    nodes: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const skip = (page - 1) * limit;

    const { nodes, total } = await nodeRepository.findMany({
      rootOnly: options?.rootOnly,
      status: options?.status,
      company: options?.company,
      isActive: options?.isActive,
      skip,
      take: limit,
    });

    return {
      nodes: nodes.map((node) => transformNodeFlat(node)),
      total,
      page,
      limit,
    };
  },

  /**
   * Partial update of a node's fields.
   * Does not affect children or subtree structure.
   */
  async updateNode(
    id: string,
    input: UpdateNodeInput
  ): Promise<Record<string, unknown>> {
    const existing = await nodeRepository.findById(id);
    if (!existing) {
      throw new AppError('Node not found', 404, 'NOT_FOUND');
    }

    // Build update data from input
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.company !== undefined) updateData.company = input.company;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.is_active !== undefined) updateData.isActive = input.is_active;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.size !== undefined) updateData.size = input.size;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.categories !== undefined) updateData.categories = input.categories;
    if (input.dependent_category !== undefined) updateData.dependentCategory = input.dependent_category;

    // Handle coordinate updates (partial merge)
    if (input.coordinate) {
      if (input.coordinate.x !== undefined) updateData.coordinateX = input.coordinate.x;
      if (input.coordinate.y !== undefined) updateData.coordinateY = input.coordinate.y;
      if (input.coordinate.z !== undefined) updateData.coordinateZ = input.coordinate.z;
    }
    if (input.line_coordinate) {
      if (input.line_coordinate.x !== undefined) updateData.lineCoordinateX = input.line_coordinate.x;
      if (input.line_coordinate.y !== undefined) updateData.lineCoordinateY = input.line_coordinate.y;
      if (input.line_coordinate.z !== undefined) updateData.lineCoordinateZ = input.line_coordinate.z;
    }
    if (input.rotate_xyz) {
      if (input.rotate_xyz.x !== undefined) updateData.rotateX = input.rotate_xyz.x;
      if (input.rotate_xyz.y !== undefined) updateData.rotateY = input.rotate_xyz.y;
      if (input.rotate_xyz.z !== undefined) updateData.rotateZ = input.rotate_xyz.z;
    }

    const updated = await nodeRepository.update(id, updateData);
    return transformNodeFlat(updated);
  },

  /**
   * Delete a node.
   * mode = 'node': delete only this node, children become orphans (parentId = null) and their levels are recalculated.
   * mode = 'subtree': delete this node and all descendants.
   */
  async deleteNode(
    id: string,
    mode: 'node' | 'subtree' = 'subtree'
  ): Promise<{ deleted: number; mode: string }> {
    const existing = await nodeRepository.findById(id);
    if (!existing) {
      throw new AppError('Node not found', 404, 'NOT_FOUND');
    }

    if (mode === 'subtree') {
      const count = await nodeRepository.deleteSubtree(id);
      return { deleted: count, mode: 'subtree' };
    }

    // mode === 'node': reassign children to grandparent, then delete
    const children = await nodeRepository.getDirectChildren(id);
    const grandparentId = existing.parentId;
    const grandparentLevel = grandparentId
      ? (await nodeRepository.findById(grandparentId))?.level ?? 0
      : 0;

    for (const child of children) {
      await nodeRepository.update(child.id, { parentId: grandparentId });
      await nodeRepository.updateLevelsRecursive(
        child.id,
        grandparentLevel + 1
      );
    }

    await nodeRepository.deleteNode(id);
    return { deleted: 1, mode: 'node' };
  },

  /**
   * Add one or many children to a node, with recursive child support.
   */
  async addChildren(
    parentId: string,
    children: CreateNodeInput[]
  ): Promise<Record<string, unknown>[]> {
    const parent = await nodeRepository.findById(parentId);
    if (!parent) {
      throw new AppError('Parent node not found', 404, 'PARENT_NOT_FOUND');
    }

    const results: Record<string, unknown>[] = [];
    for (const childInput of children) {
      const result = await this.createNode(childInput, parentId);
      results.push(result);
    }

    return results;
  },

  /**
   * Get direct children of a node.
   */
  async getDirectChildren(
    parentId: string
  ): Promise<Record<string, unknown>[]> {
    const parent = await nodeRepository.findById(parentId);
    if (!parent) {
      throw new AppError('Parent node not found', 404, 'PARENT_NOT_FOUND');
    }

    const children = await nodeRepository.getDirectChildren(parentId);
    return children.map((child) => transformNodeFlat(child));
  },

  /**
   * Move a node to a new parent.
   * Prevents circular references (node can't be its own child or descend to its descendant).
   * Recalculates levels for the moved subtree.
   */
  async moveNode(
    id: string,
    input: MoveNodeInput
  ): Promise<Record<string, unknown>> {
    const node = await nodeRepository.findById(id);
    if (!node) {
      throw new AppError('Node not found', 404, 'NOT_FOUND');
    }

    const newParentId = input.new_parent_id;

    // Prevent self-reference
    if (newParentId === id) {
      throw new AppError(
        'A node cannot be its own parent',
        400,
        'CIRCULAR_REFERENCE'
      );
    }

    // If moving to a parent, validate the target
    if (newParentId) {
      const newParent = await nodeRepository.findById(newParentId);
      if (!newParent) {
        throw new AppError(
          'Target parent node not found',
          404,
          'PARENT_NOT_FOUND'
        );
      }

      // Prevent circular reference: newParent must not be a descendant of this node
      const descendantIds = await nodeRepository.getDescendantIds(id);
      if (descendantIds.includes(newParentId)) {
        throw new AppError(
          'Cannot move a node to one of its own descendants (circular reference)',
          400,
          'CIRCULAR_REFERENCE'
        );
      }
    }

    // Update parentId
    await nodeRepository.update(id, { parentId: newParentId });

    // Recalculate levels
    let newLevel: number;
    if (newParentId) {
      const newParent = await nodeRepository.findById(newParentId);
      newLevel = (newParent?.level ?? 0) + 1;
    } else {
      newLevel = 1; // Becoming a root node
    }

    await nodeRepository.updateLevelsRecursive(id, newLevel);

    // Return updated node
    const updated = await nodeRepository.findById(id);
    return transformNodeFlat(updated!);
  },

  /**
   * Bulk upsert a tree structure.
   * Creates or updates nodes recursively.
   */
  async bulkUpsertTree(
    nodes: BulkUpsertNodeInput[],
    parentId: string | null = null,
    level: number = 1
  ): Promise<Record<string, unknown>[]> {
    const results: Record<string, unknown>[] = [];

    for (const nodeInput of nodes) {
      const nodeId = nodeInput.id || uuidv4();
      const nodeLevel = nodeInput.level ?? level;

      const nodeData = {
        id: nodeId,
        name: nodeInput.name,
        status: nodeInput.status,
        company: nodeInput.company,
        color: nodeInput.color,
        level: nodeLevel,
        isActive: nodeInput.is_active,
        icon: nodeInput.icon,
        description: nodeInput.description,
        coordinateX: nodeInput.coordinate.x,
        coordinateY: nodeInput.coordinate.y,
        coordinateZ: nodeInput.coordinate.z,
        lineCoordinateX: nodeInput.line_coordinate.x,
        lineCoordinateY: nodeInput.line_coordinate.y,
        lineCoordinateZ: nodeInput.line_coordinate.z,
        rotateX: nodeInput.rotate_xyz.x,
        rotateY: nodeInput.rotate_xyz.y,
        rotateZ: nodeInput.rotate_xyz.z,
        size: nodeInput.size,
        parentId: parentId,
        tags: nodeInput.tags,
        categories: nodeInput.categories,
        dependentCategory: nodeInput.dependent_category,
      };

      const upserted = await nodeRepository.upsert(
        nodeId,
        nodeData,
        { ...nodeData, id: undefined } // Remove id from update data
      );

      // Recursively upsert children
      let childResults: Record<string, unknown>[] = [];
      if (nodeInput.children && nodeInput.children.length > 0) {
        childResults = await this.bulkUpsertTree(
          nodeInput.children,
          nodeId,
          nodeLevel + 1
        );
      }

      results.push({
        ...transformNodeFlat(upserted),
        children: childResults,
      });
    }

    return results;
  },
};
