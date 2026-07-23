import { prisma } from "./utils";
import { Decimal } from "decimal.js";
import {
  faker,
  getRandomItem,
  generateUniqueSKU,
  randomIdrAmount,
  randomProductDescription,
  randomProductName,
} from "./bulk_utils";

export async function seedInventory() {
  console.log("Menyiapkan modul persediaan...");

  const warehouses = [
    {
      name: "Gudang Pusat",
      location: "Jakarta",
    },
    {
      name: "Gudang Cabang Bandung",
      location: "Bandung",
    },
  ];

  for (const warehouse of warehouses) {
    await prisma.warehouse.upsert({
      where: { name: warehouse.name },
      update: {},
      create: {
        name: warehouse.name,
        location: warehouse.location,
      },
    });
  }

  // Migrasi gudang lama berbahasa Inggris
  const legacyWarehouses: Record<string, { name: string; location: string }> = {
    "Main Warehouse": warehouses[0],
    "West Coast Hub": warehouses[1],
  };
  for (const [oldName, data] of Object.entries(legacyWarehouses)) {
    const legacy = await prisma.warehouse.findUnique({ where: { name: oldName } });
    if (legacy) {
      // Jika nama baru sudah ada, biarkan; jika belum, rename
      const target = await prisma.warehouse.findUnique({ where: { name: data.name } });
      if (!target) {
        await prisma.warehouse.update({
          where: { id: legacy.id },
          data: { name: data.name, location: data.location },
        });
      }
    }
  }

  const units = [
    { name: "Buah", symbol: "PCS" },
    { name: "Dus", symbol: "BOX" },
    { name: "Kilogram", symbol: "KG" },
    { name: "Liter", symbol: "L" },
    { name: "Set", symbol: "SET" },
  ];

  for (const unit of units) {
    const bySymbol = await prisma.unit.findUnique({ where: { symbol: unit.symbol } });
    if (bySymbol) {
      await prisma.unit.update({
        where: { id: bySymbol.id },
        data: { name: unit.name },
      });
    } else {
      const byName = await prisma.unit.findUnique({ where: { name: unit.name } });
      if (byName) {
        await prisma.unit.update({
          where: { id: byName.id },
          data: { symbol: unit.symbol },
        });
      } else {
        // Coba nama lama Inggris
        const englishNames: Record<string, string> = {
          Buah: "Pieces",
          Dus: "Box",
        };
        const oldName = englishNames[unit.name];
        const old = oldName
          ? await prisma.unit.findUnique({ where: { name: oldName } })
          : null;
        if (old) {
          await prisma.unit.update({
            where: { id: old.id },
            data: { name: unit.name, symbol: unit.symbol },
          });
        } else {
          await prisma.unit.create({
            data: {
              name: unit.name,
              symbol: unit.symbol,
            },
          });
        }
      }
    }
  }

  const categories = [
    {
      name: "Elektronik",
      description: "Perangkat elektronik dan aksesoris",
    },
    {
      name: "Furnitur",
      description: "Perabot kantor dan rumah",
    },
    {
      name: "Alat Tulis Kantor",
      description: "Kertas, pena, dan perlengkapan kantor",
    },
    {
      name: "Pakaian",
      description: "Pakaian dan aksesoris",
    },
    {
      name: "Sembako",
      description: "Makanan dan minuman",
    },
  ];

  const legacyCategories: Record<string, string> = {
    Electronics: "Elektronik",
    Furniture: "Furnitur",
    "Office Supplies": "Alat Tulis Kantor",
    Clothing: "Pakaian",
    Groceries: "Sembako",
  };

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: {
        name: category.name,
        description: category.description,
      },
    });
  }

  for (const [oldName, newName] of Object.entries(legacyCategories)) {
    const legacy = await prisma.category.findUnique({ where: { name: oldName } });
    const target = await prisma.category.findUnique({ where: { name: newName } });
    if (legacy && !target) {
      await prisma.category.update({
        where: { id: legacy.id },
        data: { name: newName },
      });
    }
  }

  const getCategory = async (name: string) =>
    prisma.category.findUnique({ where: { name } });
  const getUnit = async (symbol: string) =>
    prisma.unit.findUnique({ where: { symbol } });
  const getWarehouse = async (name: string) =>
    prisma.warehouse.findUnique({ where: { name } });

  const catElectronics = await getCategory("Elektronik");
  const catFurniture = await getCategory("Furnitur");
  const catSupplies = await getCategory("Alat Tulis Kantor");

  const unitPcs = await getUnit("PCS");
  const unitBox = await getUnit("BOX");

  const mainWarehouse =
    (await getWarehouse("Gudang Pusat")) ||
    (await getWarehouse("Main Warehouse"));

  if (
    catElectronics &&
    catFurniture &&
    catSupplies &&
    unitPcs &&
    unitBox &&
    mainWarehouse
  ) {
    const products = [
      {
        sku: "ELEC-001",
        name: "Laptop Pro 15",
        description: "Laptop performa tinggi untuk kerja profesional",
        categoryId: catElectronics.id,
        price: 18_500_000,
        cost: 14_200_000,
        baseUnitId: unitPcs.id,
        minStock: 10,
        stock: 50,
      },
      {
        sku: "FURN-001",
        name: "Kursi Ergonomis",
        description: "Kursi kantor ergonomis untuk kerja jangka panjang",
        categoryId: catFurniture.id,
        price: 2_750_000,
        cost: 1_650_000,
        baseUnitId: unitPcs.id,
        minStock: 5,
        stock: 20,
      },
      {
        sku: "SUPP-001",
        name: "Kertas A4 Rim",
        description: "Kertas A4 standar (500 lembar)",
        categoryId: catSupplies.id,
        price: 55_000,
        cost: 38_000,
        baseUnitId: unitPcs.id,
        minStock: 100,
        stock: 500,
      },
      {
        sku: "ELEC-002",
        name: "Mouse Nirkabel",
        description: "Mouse nirkabel ergonomis",
        categoryId: catElectronics.id,
        price: 185_000,
        cost: 95_000,
        baseUnitId: unitPcs.id,
        minStock: 20,
        stock: 100,
      },
      {
        sku: "FURN-002",
        name: "Meja Kerja Standing",
        description: "Meja kerja standing desk adjustable",
        categoryId: catFurniture.id,
        price: 4_250_000,
        cost: 2_800_000,
        baseUnitId: unitPcs.id,
        minStock: 2,
        stock: 10,
      },
    ];

    for (const prod of products) {
      const product = await prisma.product.upsert({
        where: { sku: prod.sku },
        update: {
          name: prod.name,
          description: prod.description,
          categoryId: prod.categoryId,
          price: prod.price,
          cost: prod.cost,
          baseUnitId: prod.baseUnitId,
          minStock: prod.minStock,
        },
        create: {
          sku: prod.sku,
          name: prod.name,
          description: prod.description,
          categoryId: prod.categoryId,
          price: prod.price,
          cost: prod.cost,
          baseUnitId: prod.baseUnitId,
          minStock: prod.minStock,
        },
      });

      const inventoryItem = await prisma.inventory.findFirst({
        where: {
          warehouseId: mainWarehouse.id,
          productId: product.id,
        },
      });

      if (!inventoryItem) {
        await prisma.inventory.create({
          data: {
            warehouseId: mainWarehouse.id,
            productId: product.id,
            quantity: prod.stock,
            unitCost: new Decimal(prod.cost),
            reorderPoint: prod.minStock,
          },
        });
      }
    }
  }
}

export async function seedBulkInventory(count: number) {
  console.log(`Menyiapkan ${count} produk massal...`);

  const categories = await prisma.category.findMany();
  const units = await prisma.unit.findMany();
  const warehouses = await prisma.warehouse.findMany();

  if (categories.length === 0 || units.length === 0 || warehouses.length === 0) {
    console.warn(
      "Kategori, satuan, atau gudang belum tersedia. Lewati persediaan massal.",
    );
    return;
  }

  const products = [];
  for (let i = 0; i < count; i++) {
    const price = randomIdrAmount(50_000, 25_000_000);
    const cost = Math.round(price * 0.65 / 100) * 100;
    const category = getRandomItem(categories);
    const unit = getRandomItem(units);
    const sku = generateUniqueSKU(
      category.name.substring(0, 3).toUpperCase(),
      i + 100,
    );

    products.push({
      sku,
      name: randomProductName(),
      description: randomProductDescription(),
      categoryId: category.id,
      price: new Decimal(price),
      cost: new Decimal(cost),
      baseUnitId: unit.id,
      minStock: faker.number.int({ min: 5, max: 100 }),
    });
  }

  await prisma.product.createMany({
    data: products,
    skipDuplicates: true,
  });

  console.log("Menginisialisasi stok produk massal...");
  const allProducts = await prisma.product.findMany({
    where: { sku: { contains: "-" } },
    take: count,
    orderBy: { createdAt: "desc" },
  });

  const inventoryData = allProducts.map((p) => ({
    warehouseId: getRandomItem(warehouses).id,
    productId: p.id,
    quantity: faker.number.int({ min: 10, max: 500 }),
    unitCost: p.cost,
    reorderPoint: p.minStock,
  }));

  await prisma.inventory.createMany({
    data: inventoryData,
    skipDuplicates: true,
  });
}
