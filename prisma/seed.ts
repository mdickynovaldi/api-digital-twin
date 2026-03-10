import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.assetNode.deleteMany();

  // Root node IDs
  const rootId = uuidv4();
  const motorId = uuidv4();
  const pumpId = uuidv4();
  const bearingId = uuidv4();
  const shaftId = uuidv4();
  const impellerId = uuidv4();
  const sealId = uuidv4();

  // Create root machine node
  await prisma.assetNode.create({
    data: {
      id: rootId,
      name: 'BLP_01',
      status: 'Machine',
      company: 'PARAGON_DT',
      color: '#000000',
      level: 1,
      isActive: true,
      icon: 'tabler:settings',
      description: 'Blower machine unit 01',
      coordinateX: -2.43221,
      coordinateY: 0,
      coordinateZ: 5.023538,
      size: 1,
      tags: ['blower', 'production'],
      categories: ['rotating-equipment'],
      dependentCategory: [],
    },
  });

  // Create Motor (level 2)
  await prisma.assetNode.create({
    data: {
      id: motorId,
      name: 'Motor',
      status: 'Part',
      company: 'PARAGON_DT',
      color: '#111111',
      level: 2,
      isActive: true,
      icon: 'tabler:engine',
      description: 'Main drive motor',
      coordinateX: 1,
      coordinateY: 2,
      coordinateZ: 3,
      size: 0.8,
      parentId: rootId,
      tags: ['motor', 'electrical'],
      categories: ['drive-system'],
      dependentCategory: ['rotating-equipment'],
    },
  });

  // Create Pump (level 2)
  await prisma.assetNode.create({
    data: {
      id: pumpId,
      name: 'Pump',
      status: 'Part',
      company: 'PARAGON_DT',
      color: '#333333',
      level: 2,
      isActive: true,
      icon: 'tabler:droplet',
      description: 'Hydraulic pump unit',
      coordinateX: 4,
      coordinateY: 0,
      coordinateZ: 2,
      size: 0.6,
      parentId: rootId,
      tags: ['pump', 'hydraulic'],
      categories: ['fluid-system'],
      dependentCategory: ['rotating-equipment'],
    },
  });

  // Create Bearing (level 3 - child of Motor)
  await prisma.assetNode.create({
    data: {
      id: bearingId,
      name: 'Bearing',
      status: 'SubPart',
      company: 'PARAGON_DT',
      color: '#222222',
      level: 3,
      isActive: true,
      icon: 'tabler:circle',
      description: 'Motor bearing - drive end',
      coordinateX: 0,
      coordinateY: 0,
      coordinateZ: 0,
      size: 0.3,
      parentId: motorId,
      tags: ['bearing', 'wear-part'],
      categories: ['mechanical'],
      dependentCategory: ['drive-system'],
    },
  });

  // Create Shaft (level 3 - child of Motor)
  await prisma.assetNode.create({
    data: {
      id: shaftId,
      name: 'Shaft',
      status: 'SubPart',
      company: 'PARAGON_DT',
      color: '#444444',
      level: 3,
      isActive: true,
      icon: 'tabler:line',
      description: 'Motor drive shaft',
      coordinateX: 0.5,
      coordinateY: 0,
      coordinateZ: 0,
      size: 0.4,
      parentId: motorId,
      tags: ['shaft'],
      categories: ['mechanical'],
      dependentCategory: ['drive-system'],
    },
  });

  // Create Impeller (level 3 - child of Pump)
  await prisma.assetNode.create({
    data: {
      id: impellerId,
      name: 'Impeller',
      status: 'SubPart',
      company: 'PARAGON_DT',
      color: '#555555',
      level: 3,
      isActive: true,
      icon: 'tabler:propeller',
      description: 'Pump impeller blade',
      coordinateX: 0,
      coordinateY: 0.5,
      coordinateZ: 0,
      size: 0.2,
      parentId: pumpId,
      tags: ['impeller', 'wear-part'],
      categories: ['fluid-system'],
      dependentCategory: ['fluid-system'],
    },
  });

  // Create Seal (level 3 - child of Pump)
  await prisma.assetNode.create({
    data: {
      id: sealId,
      name: 'Mechanical Seal',
      status: 'SubPart',
      company: 'PARAGON_DT',
      color: '#666666',
      level: 3,
      isActive: true,
      icon: 'tabler:lock',
      description: 'Pump mechanical seal',
      coordinateX: 0,
      coordinateY: 0,
      coordinateZ: 0.5,
      size: 0.15,
      parentId: pumpId,
      tags: ['seal', 'wear-part'],
      categories: ['sealing'],
      dependentCategory: ['fluid-system'],
    },
  });

  console.log('✅ Seed data created successfully!');
  console.log(`   Root: BLP_01 (${rootId})`);
  console.log(`   ├── Motor (${motorId})`);
  console.log(`   │   ├── Bearing (${bearingId})`);
  console.log(`   │   └── Shaft (${shaftId})`);
  console.log(`   └── Pump (${pumpId})`);
  console.log(`       ├── Impeller (${impellerId})`);
  console.log(`       └── Mechanical Seal (${sealId})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
