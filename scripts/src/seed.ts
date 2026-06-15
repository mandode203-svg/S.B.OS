import { db } from "@workspace/db";
import {
  businessesTable, productsTable, ordersTable,
  reservationsTable, clientsTable, transactionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const BUSINESS_ID = "demo-le-baobab-001";
const BUSINESS_SLUG = "le-baobab";

async function seed() {
  console.log("🌱 Seeding Restaurant Le Baobab...");

  // Clean existing demo data
  await db.delete(transactionsTable).where(eq(transactionsTable.businessId, BUSINESS_ID));
  await db.delete(ordersTable).where(eq(ordersTable.businessId, BUSINESS_ID));
  await db.delete(reservationsTable).where(eq(reservationsTable.businessId, BUSINESS_ID));
  await db.delete(clientsTable).where(eq(clientsTable.businessId, BUSINESS_ID));
  await db.delete(productsTable).where(eq(productsTable.businessId, BUSINESS_ID));
  await db.delete(businessesTable).where(eq(businessesTable.id, BUSINESS_ID));

  // 1. Business
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await db.insert(businessesTable).values({
    id: BUSINESS_ID,
    slug: BUSINESS_SLUG,
    name: "Restaurant Le Baobab",
    type: "restaurant",
    email: "contact@lebaobab.sn",
    phone: "+221 77 123 45 67",
    address: "Avenue Cheikh Anta Diop, Dakar, Sénégal",
    plan: "pro",
    passwordHash,
  });
  console.log("✅ Business created — email: contact@lebaobab.sn / password: demo1234");

  // 2. Products (20)
  const products = [
    // Entrées
    { id: randomUUID(), name: "Nem au poulet", category: "Entrées", price: 2500, description: "Rouleaux de printemps croustillants au poulet et légumes frais", stockQty: 50 },
    { id: randomUUID(), name: "Salade de gésiers", category: "Entrées", price: 3000, description: "Gésiers de volaille confits sur lit de salade verte", stockQty: 30 },
    { id: randomUUID(), name: "Soupe kandia", category: "Entrées", price: 2000, description: "Soupe traditionnelle sénégalaise à l'huile de palme", stockQty: 40 },

    // Plats principaux
    { id: randomUUID(), name: "Thiéboudienne", category: "Plats", price: 4500, description: "Le plat national sénégalais — riz au poisson braisé et légumes", stockQty: 30 },
    { id: randomUUID(), name: "Poulet yassa", category: "Plats", price: 5000, description: "Poulet mariné aux oignons et citron, sauce yassa maison", stockQty: 25 },
    { id: randomUUID(), name: "Mafé d'agneau", category: "Plats", price: 5500, description: "Ragoût d'agneau à la pâte d'arachide, légumes de saison", stockQty: 20 },
    { id: randomUUID(), name: "Ceebu Yapp", category: "Plats", price: 4800, description: "Riz à la viande de bœuf, recette traditionnelle wolof", stockQty: 25 },
    { id: randomUUID(), name: "Thiou poulet", category: "Plats", price: 4200, description: "Ragoût de poulet à la tomate et aux épices africaines", stockQty: 30 },
    { id: randomUUID(), name: "Grillades mixtes", category: "Plats", price: 7500, description: "Assortiment de viandes grillées — poulet, agneau, merguez", stockQty: 15 },
    { id: randomUUID(), name: "Poisson braisé entier", category: "Plats", price: 6500, description: "Poisson frais du jour braisé, sauce tomate-oignons", stockQty: 15 },

    // Snacks
    { id: randomUUID(), name: "Chawarma poulet", category: "Snacks", price: 3500, description: "Pain pita, poulet grillé, légumes, sauce blanche", stockQty: 40 },
    { id: randomUUID(), name: "Burger baobab", category: "Snacks", price: 4000, description: "Notre burger signature — steak haché, fromage, sauce secrète", stockQty: 35 },
    { id: randomUUID(), name: "Accras de haricots", category: "Snacks", price: 1500, description: "Beignets de haricots niébé épicés, sauce pimentée", stockQty: 60 },

    // Desserts
    { id: randomUUID(), name: "Thiakry", category: "Desserts", price: 1500, description: "Dessert traditionnel — couscous de mil au lait caillé sucré", stockQty: 30 },
    { id: randomUUID(), name: "Fondant chocolat", category: "Desserts", price: 2500, description: "Coulant au chocolat noir 70%, crème anglaise vanille", stockQty: 20 },
    { id: randomUUID(), name: "Salade de fruits tropicaux", category: "Desserts", price: 2000, description: "Mangue, ananas, papaye, banane — sirop de menthe", stockQty: 25 },

    // Boissons
    { id: randomUUID(), name: "Jus de bissap", category: "Boissons", price: 1000, description: "Jus d'hibiscus maison, sucré au gingembre", stockQty: 80 },
    { id: randomUUID(), name: "Jus de ditax", category: "Boissons", price: 1200, description: "Boisson traditionnelle à base de tamarin", stockQty: 60 },
    { id: randomUUID(), name: "Eau minérale", category: "Boissons", price: 500, description: "Bouteille 50cl", stockQty: 200 },
    { id: randomUUID(), name: "Café touba", category: "Boissons", price: 800, description: "Café sénégalais aux épices — clou de girofle et poivre", stockQty: 100 },
  ];

  const insertedProducts = await db.insert(productsTable).values(
    products.map(p => ({
      id: p.id,
      businessId: BUSINESS_ID,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      available: true,
      stockQty: p.stockQty,
    }))
  ).returning();
  console.log(`✅ ${insertedProducts.length} products created`);

  // 3. Clients (15)
  const clientsData = [
    { name: "Aminata Diallo", phone: "+221 77 210 34 56", email: "aminata@email.com", totalOrders: 8, totalSpent: 42000 },
    { name: "Moussa Ndiaye", phone: "+221 76 345 67 89", email: "moussa.ndiaye@gmail.com", totalOrders: 12, totalSpent: 68500 },
    { name: "Fatou Sow", phone: "+221 70 456 78 90", email: null, totalOrders: 5, totalSpent: 27500 },
    { name: "Ibrahima Traoré", phone: "+221 77 567 89 01", email: "ibra.traore@work.sn", totalOrders: 3, totalSpent: 15000 },
    { name: "Rokhaya Fall", phone: "+221 76 678 90 12", email: null, totalOrders: 7, totalSpent: 38000 },
    { name: "Omar Sarr", phone: "+221 70 789 01 23", email: "omar.sarr@email.com", totalOrders: 15, totalSpent: 85000 },
    { name: "Aissatou Balde", phone: "+221 77 890 12 34", email: null, totalOrders: 2, totalSpent: 9500 },
    { name: "Cheikh Diop", phone: "+221 76 901 23 45", email: "cheikh.diop@sn.com", totalOrders: 9, totalSpent: 51000 },
    { name: "Mariama Ba", phone: "+221 70 012 34 56", email: null, totalOrders: 4, totalSpent: 21000 },
    { name: "Souleymane Sy", phone: "+221 77 123 56 78", email: "s.sy@entreprise.sn", totalOrders: 6, totalSpent: 33500 },
    { name: "Ndéye Mbaye", phone: "+221 76 234 67 89", email: null, totalOrders: 11, totalSpent: 61000 },
    { name: "Assane Gueye", phone: "+221 70 345 78 90", email: "assane.g@gmail.com", totalOrders: 1, totalSpent: 5000 },
    { name: "Mame Diarra Diouf", phone: "+221 77 456 89 01", email: null, totalOrders: 3, totalSpent: 16500 },
    { name: "Lamine Faye", phone: "+221 76 567 90 12", email: "l.faye@work.com", totalOrders: 8, totalSpent: 44000 },
    { name: "Djenaba Koné", phone: "+221 70 678 01 23", email: null, totalOrders: 5, totalSpent: 28000 },
  ];

  const insertedClients = await db.insert(clientsTable).values(
    clientsData.map(c => ({
      id: randomUUID(),
      businessId: BUSINESS_ID,
      name: c.name,
      phone: c.phone,
      email: c.email,
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      lastOrderAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    }))
  ).returning();
  console.log(`✅ ${insertedClients.length} clients created`);

  // 4. Orders (30)
  const STATUSES = ["reçue", "confirmée", "en_preparation", "prête", "livrée", "annulée"];
  const ORDER_TYPES = ["dine-in", "takeaway", "delivery", "preorder"];

  const ordersData: Array<{
    clientIdx: number;
    items: Array<{ productIdx: number; qty: number }>;
    status: string;
    orderType: string;
    daysAgo: number;
  }> = [
    { clientIdx: 0, items: [{ productIdx: 3, qty: 2 }, { productIdx: 16, qty: 2 }], status: "livrée", orderType: "dine-in", daysAgo: 25 },
    { clientIdx: 1, items: [{ productIdx: 4, qty: 1 }, { productIdx: 13, qty: 2 }], status: "livrée", orderType: "takeaway", daysAgo: 23 },
    { clientIdx: 2, items: [{ productIdx: 5, qty: 1 }, { productIdx: 18, qty: 3 }], status: "livrée", orderType: "dine-in", daysAgo: 21 },
    { clientIdx: 3, items: [{ productIdx: 10, qty: 2 }, { productIdx: 17, qty: 2 }], status: "livrée", orderType: "delivery", daysAgo: 19 },
    { clientIdx: 4, items: [{ productIdx: 3, qty: 1 }, { productIdx: 8, qty: 1 }, { productIdx: 16, qty: 2 }], status: "livrée", orderType: "dine-in", daysAgo: 17 },
    { clientIdx: 5, items: [{ productIdx: 6, qty: 2 }, { productIdx: 13, qty: 1 }], status: "livrée", orderType: "dine-in", daysAgo: 15 },
    { clientIdx: 6, items: [{ productIdx: 11, qty: 1 }, { productIdx: 19, qty: 2 }], status: "livrée", orderType: "takeaway", daysAgo: 13 },
    { clientIdx: 7, items: [{ productIdx: 4, qty: 2 }, { productIdx: 14, qty: 1 }], status: "livrée", orderType: "dine-in", daysAgo: 11 },
    { clientIdx: 8, items: [{ productIdx: 9, qty: 1 }, { productIdx: 16, qty: 1 }], status: "livrée", orderType: "dine-in", daysAgo: 10 },
    { clientIdx: 9, items: [{ productIdx: 7, qty: 1 }, { productIdx: 13, qty: 1 }, { productIdx: 17, qty: 1 }], status: "livrée", orderType: "delivery", daysAgo: 9 },
    { clientIdx: 10, items: [{ productIdx: 3, qty: 3 }, { productIdx: 18, qty: 3 }], status: "livrée", orderType: "dine-in", daysAgo: 8 },
    { clientIdx: 11, items: [{ productIdx: 4, qty: 1 }, { productIdx: 16, qty: 2 }], status: "annulée", orderType: "takeaway", daysAgo: 7 },
    { clientIdx: 12, items: [{ productIdx: 5, qty: 1 }, { productIdx: 13, qty: 2 }], status: "livrée", orderType: "dine-in", daysAgo: 6 },
    { clientIdx: 13, items: [{ productIdx: 8, qty: 1 }, { productIdx: 17, qty: 2 }], status: "livrée", orderType: "dine-in", daysAgo: 5 },
    { clientIdx: 14, items: [{ productIdx: 6, qty: 2 }, { productIdx: 19, qty: 2 }], status: "livrée", orderType: "delivery", daysAgo: 4 },
    { clientIdx: 0, items: [{ productIdx: 3, qty: 1 }, { productIdx: 15, qty: 1 }], status: "livrée", orderType: "dine-in", daysAgo: 3 },
    { clientIdx: 1, items: [{ productIdx: 4, qty: 2 }, { productIdx: 13, qty: 1 }], status: "livrée", orderType: "takeaway", daysAgo: 3 },
    { clientIdx: 2, items: [{ productIdx: 9, qty: 1 }, { productIdx: 16, qty: 2 }], status: "livrée", orderType: "dine-in", daysAgo: 2 },
    { clientIdx: 5, items: [{ productIdx: 7, qty: 1 }, { productIdx: 14, qty: 1 }, { productIdx: 17, qty: 1 }], status: "livrée", orderType: "dine-in", daysAgo: 2 },
    { clientIdx: 7, items: [{ productIdx: 3, qty: 2 }, { productIdx: 18, qty: 2 }], status: "livrée", orderType: "delivery", daysAgo: 1 },
    { clientIdx: 10, items: [{ productIdx: 4, qty: 1 }, { productIdx: 11, qty: 1 }], status: "livrée", orderType: "dine-in", daysAgo: 1 },
    { clientIdx: 13, items: [{ productIdx: 5, qty: 1 }, { productIdx: 16, qty: 2 }], status: "livrée", orderType: "takeaway", daysAgo: 1 },
    // Today's orders in various statuses
    { clientIdx: 3, items: [{ productIdx: 3, qty: 2 }, { productIdx: 16, qty: 2 }], status: "livrée", orderType: "dine-in", daysAgo: 0 },
    { clientIdx: 6, items: [{ productIdx: 4, qty: 1 }, { productIdx: 17, qty: 1 }], status: "en_preparation", orderType: "dine-in", daysAgo: 0 },
    { clientIdx: 8, items: [{ productIdx: 5, qty: 2 }, { productIdx: 13, qty: 1 }], status: "confirmée", orderType: "takeaway", daysAgo: 0 },
    { clientIdx: 9, items: [{ productIdx: 10, qty: 1 }, { productIdx: 19, qty: 2 }], status: "prête", orderType: "takeaway", daysAgo: 0 },
    { clientIdx: 11, items: [{ productIdx: 8, qty: 1 }, { productIdx: 14, qty: 1 }], status: "reçue", orderType: "delivery", daysAgo: 0 },
    { clientIdx: 12, items: [{ productIdx: 7, qty: 1 }, { productIdx: 16, qty: 1 }, { productIdx: 19, qty: 1 }], status: "reçue", orderType: "dine-in", daysAgo: 0 },
    { clientIdx: 14, items: [{ productIdx: 3, qty: 1 }, { productIdx: 6, qty: 1 }], status: "en_preparation", orderType: "dine-in", daysAgo: 0 },
    { clientIdx: 4, items: [{ productIdx: 9, qty: 1 }, { productIdx: 15, qty: 2 }], status: "reçue", orderType: "preorder", daysAgo: 0 },
  ];

  const orderInserts = ordersData.map(o => {
    const client = insertedClients[o.clientIdx];
    const items = o.items.map(i => {
      const p = insertedProducts[i.productIdx];
      return { productId: p.id, name: p.name, price: p.price, quantity: i.qty };
    });
    const total = items.reduce((s, item) => s + item.price * item.quantity, 0);
    const ts = new Date();
    ts.setDate(ts.getDate() - o.daysAgo);
    ts.setHours(Math.floor(Math.random() * 12) + 9); // 9am–9pm
    ts.setMinutes(Math.floor(Math.random() * 60));

    return {
      id: randomUUID(),
      businessId: BUSINESS_ID,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email ?? null,
      items,
      total,
      depositAmount: 0,
      status: o.status,
      orderType: o.orderType,
      scheduledAt: null,
      notes: null,
      createdAt: ts,
    };
  });

  const insertedOrders = await db.insert(ordersTable).values(orderInserts).returning();
  console.log(`✅ ${insertedOrders.length} orders created`);

  // 5. Reservations (5)
  const now = new Date();
  const reservationsData = [
    {
      clientName: "Moussa Ndiaye",
      clientPhone: "+221 76 345 67 89",
      dateTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      partySize: 4, tableOrRoom: "Table 5", depositAmount: 10000, status: "confirmed",
      notes: "Anniversaire de mariage — décoration fleurs SVP",
    },
    {
      clientName: "Omar Sarr",
      clientPhone: "+221 70 789 01 23",
      dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000),
      partySize: 8, tableOrRoom: "Salle privée", depositAmount: 25000, status: "confirmed",
      notes: "Dîner d'affaires — menu à définir",
    },
    {
      clientName: "Rokhaya Fall",
      clientPhone: "+221 76 678 90 12",
      dateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000),
      partySize: 2, tableOrRoom: "Table terrasse", depositAmount: 0, status: "pending",
      notes: null,
    },
    {
      clientName: "Cheikh Diop",
      clientPhone: "+221 76 901 23 45",
      dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000),
      partySize: 12, tableOrRoom: "Salle de fête", depositAmount: 50000, status: "confirmed",
      notes: "Baptême — menu africain traditionnel",
    },
    {
      clientName: "Ndéye Mbaye",
      clientPhone: "+221 76 234 67 89",
      dateTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      partySize: 6, tableOrRoom: "Table 3 et 4", depositAmount: 15000, status: "pending",
      notes: "Réunion de famille",
    },
  ];

  const insertedReservations = await db.insert(reservationsTable).values(
    reservationsData.map(r => ({ id: randomUUID(), businessId: BUSINESS_ID, ...r }))
  ).returning();
  console.log(`✅ ${insertedReservations.length} reservations created`);

  // 6. Transactions for completed orders
  const completedOrders = insertedOrders.filter(o => (o as unknown as typeof orderInserts[0]).status === "livrée");
  const methods = ["espèces", "wave", "orange_money", "mobile_money", "espèces", "espèces"];
  const txns = (completedOrders as Array<{ id: string; total: number }>).map((o, i) => ({
    id: randomUUID(),
    businessId: BUSINESS_ID,
    orderId: o.id,
    amount: o.total,
    method: methods[i % methods.length],
    status: "completed" as const,
  }));
  await db.insert(transactionsTable).values(txns);
  console.log(`✅ ${txns.length} transactions created`);

  console.log("\n🎉 Seed complete!");
  console.log("   Login: contact@lebaobab.sn / demo1234");
  console.log("   Order page: /order/le-baobab");
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
