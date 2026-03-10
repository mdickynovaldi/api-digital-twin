import { prisma } from '@/src/lib/prisma';
import type { Prisma, AssetNode } from '@prisma/client';

// Type for a node with recursively loaded children
export type NodeWithChildren = AssetNode & {
  children: NodeWithChildren[];
};

/**
 * Repository layer — all direct database access for AssetNode.
 */
export const nodeRepository = {
  /**
   * Find a single node by ID.
   */
  async findById(id: string): Promise<AssetNode | null> {
    return prisma.assetNode.findUnique({ where: { id } });
  },

  /**
   * Find a node by ID with direct children (1 level deep).
   */
  async findWithDirectChildren(id: string): Promise<NodeWithChildren | null> {
    return prisma.assetNode.findUnique({
      where: { id },
      include: { children: true },
    }) as Promise<NodeWithChildren | null>;
  },

  /**
   * List nodes with optional filtering.
   */
  async findMany(options?: {
    rootOnly?: boolean;
    status?: string;
    company?: string;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ nodes: AssetNode[]; total: number }> {
    const where: Prisma.AssetNodeWhereInput = {};

    if (options?.rootOnly) {
      where.parentId = null;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.company) {
      where.company = options.company;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [nodes, total] = await Promise.all([
      prisma.assetNode.findMany({
        where,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        skip: options?.skip,
        take: options?.take,
        include: { children: { select: { id: true } } },
      }),
      prisma.assetNode.count({ where }),
    ]);

    return { nodes: nodes as AssetNode[], total };
  },

  /**
   * Recursively fetch a node and all its descendants as a tree.
   * Uses iterative depth-first loading to handle unlimited depth.
   */
  async findTreeRecursive(
    id: string,
    maxDepth?: number
  ): Promise<NodeWithChildren | null> {
    const root = await prisma.assetNode.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!root) return null;

    const result: NodeWithChildren = { ...root, children: [...root.children].map(c => ({ ...c, children: [] })) };

    // BFS approach to load children level by level
    const queue: { node: NodeWithChildren; depth: number }[] = result.children.map(
      (child) => ({ node: child as NodeWithChildren, depth: 2 })
    );

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Stop if max depth reached
      if (maxDepth !== undefined && current.depth >= maxDepth) continue;

      const childrenFromDb = await prisma.assetNode.findMany({
        where: { parentId: current.node.id },
        orderBy: [{ name: 'asc' }],
      });

      current.node.children = childrenFromDb.map((c) => ({
        ...c,
        children: [],
      }));

      for (const child of current.node.children) {
        queue.push({ node: child, depth: current.depth + 1 });
      }
    }

    return result;
  },

  /**
   * Create a single node.
   */
  async create(data: Prisma.AssetNodeUncheckedCreateInput): Promise<AssetNode> {
    return prisma.assetNode.create({ data });
  },

  /**
   * Update a node by ID.
   */
  async update(
    id: string,
    data: Prisma.AssetNodeUncheckedUpdateInput
  ): Promise<AssetNode> {
    return prisma.assetNode.update({ where: { id }, data });
  },

  /**
   * Delete a single node. Children are orphaned (parentId set to null by onDelete: SetNull).
   */
  async deleteNode(id: string): Promise<AssetNode> {
    return prisma.assetNode.delete({ where: { id } });
  },

  /**
   * Get all descendant IDs of a node (for circular ref check and subtree deletion).
   * Uses iterative BFS.
   */
  async getDescendantIds(id: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue: string[] = [id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await prisma.assetNode.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });

      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }

    return descendants;
  },

  /**
   * Delete a node and all its descendants (subtree deletion).
   * Deletes bottom-up to respect foreign key constraints.
   */
  async deleteSubtree(id: string): Promise<number> {
    const descendantIds = await this.getDescendantIds(id);
    const allIds = [id, ...descendantIds];

    // Delete in reverse order (deepest first) to avoid FK issues
    // Since we use onDelete: SetNull, we can also delete all at once
    const result = await prisma.assetNode.deleteMany({
      where: { id: { in: allIds } },
    });

    return result.count;
  },

  /**
   * Update levels for a node and all its descendants recursively.
   */
  async updateLevelsRecursive(id: string, newLevel: number): Promise<void> {
    await prisma.assetNode.update({
      where: { id },
      data: { level: newLevel },
    });

    const children = await prisma.assetNode.findMany({
      where: { parentId: id },
      select: { id: true },
    });

    for (const child of children) {
      await this.updateLevelsRecursive(child.id, newLevel + 1);
    }
  },

  /**
   * Get direct children of a node.
   */
  async getDirectChildren(parentId: string): Promise<AssetNode[]> {
    return prisma.assetNode.findMany({
      where: { parentId },
      orderBy: [{ name: 'asc' }],
    });
  },

  /**
   * Upsert a node (create or update).
   */
  async upsert(
    id: string,
    createData: Prisma.AssetNodeUncheckedCreateInput,
    updateData: Prisma.AssetNodeUncheckedUpdateInput
  ): Promise<AssetNode> {
    return prisma.assetNode.upsert({
      where: { id },
      create: createData,
      update: updateData,
    });
  },

  /**
   * Check if a node exists.
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.assetNode.count({ where: { id } });
    return count > 0;
  },
};
