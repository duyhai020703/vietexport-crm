import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Bắt đầu khởi tạo dữ liệu mẫu Export CRM trên Neon DB...");

  // Clear existing data in dependency order
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Nhân viên (ADMIN, MANAGER, SALE)
  const admin = await prisma.user.create({
    data: {
      name: "Nguyễn Minh Quân",
      email: "quan.nguyen@vietexport.vn",
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Trần Thu Hương",
      email: "huong.tran@vietexport.vn",
      role: "MANAGER",
    },
  });

  const sale1 = await prisma.user.create({
    data: {
      name: "Lê Hoàng Nam",
      email: "nam.le@vietexport.vn",
      role: "SALE",
    },
  });

  const sale2 = await prisma.user.create({
    data: {
      name: "Phạm Ngọc Anh",
      email: "anh.pham@vietexport.vn",
      role: "SALE",
    },
  });

  // 2. 6 Mã sản phẩm xuất khẩu
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "CAS-W320-2268",
        name: "Hạt điều nhân trắng W320",
        specification: "Thùng carton 22.68 kg (hút chân không 2 túi PE)",
        unit: "Tấn",
        basePrice: 6450,
      },
    }),
    prisma.product.create({
      data: {
        sku: "COF-ROB-G1-60",
        name: "Cà phê Robusta nhân xanh Grade 1",
        specification: "Bao đay 60 kg, độ ẩm max 12.5%, sàng 18",
        unit: "Tấn",
        basePrice: 4180,
      },
    }),
    prisma.product.create({
      data: {
        sku: "PEP-BLK-550GL",
        name: "Hồ tiêu đen FAQ 550g/l",
        specification: "Bao PP/Kraft 25 kg hoặc 50 kg",
        unit: "Tấn",
        basePrice: 5800,
      },
    }),
    prisma.product.create({
      data: {
        sku: "RICE-ST25-25KG",
        name: "Gạo thơm ST25 Xuất khẩu",
        specification: "Túi PA/PE 25 kg (hoặc 5 kg x 4 túi/thùng)",
        unit: "Tấn",
        basePrice: 980,
      },
    }),
    prisma.product.create({
      data: {
        sku: "CIN-TUBE-10KG",
        name: "Quế ống điếu (Cinnamon Split/Tube)",
        specification: "Thùng carton 10 kg lót nilon chống ẩm",
        unit: "Tấn",
        basePrice: 3650,
      },
    }),
    prisma.product.create({
      data: {
        sku: "TEA-BLK-OP-20",
        name: "Chè đen OP Xuất khẩu",
        specification: "Bao Kraft 20 kg lót giấy bạc chống ẩm",
        unit: "Tấn",
        basePrice: 2450,
      },
    }),
  ]);

  const [cashew, coffee, pepper, rice, cinnamon, tea] = products;

  // 3. 20 Khách hàng xuất khẩu trải đều 9 giai đoạn Pipeline & nhiều thị trường
  const customersData = [
    {
      customerCode: "CUS-001",
      companyName: "Pacific Rim Foods LLC",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Los Angeles",
      channel: "IMPORTER" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: sale1.id,
      pipelineStage: "ACTIVE_WON" as const,
      contacts: [
        {
          name: "Michael Carter",
          position: "Purchasing Director",
          email: "m.carter@pacificrimfoods.com",
          phoneWhatsAppWeChat: "+1 310-555-0148 (WhatsApp)",
          isPrimary: true,
        },
        {
          name: "Elena Gomez",
          position: "Import Logistics Coordinator",
          email: "elena@pacificrimfoods.com",
          phoneWhatsAppWeChat: "+1 310-555-0199",
          isPrimary: false,
        },
      ],
    },
    {
      customerCode: "CUS-002",
      companyName: "Hanseatic Spice & Nut GmbH",
      countryRegion: "Đức - Châu Âu",
      portOfDestination: "Hamburg",
      channel: "DISTRIBUTOR" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: sale1.id,
      pipelineStage: "ACTIVE_WON" as const,
      contacts: [
        {
          name: "Lukas Weber",
          position: "Head of Procurement",
          email: "l.weber@hanseatic-spice.de",
          phoneWhatsAppWeChat: "+49 40 5550192 (WhatsApp)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-003",
      companyName: "Seoul Fresh Mart Co., Ltd",
      countryRegion: "Hàn Quốc - Châu Á",
      portOfDestination: "Busan",
      channel: "SUPERMARKET" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: manager.id,
      pipelineStage: "ACTIVE_WON" as const,
      contacts: [
        {
          name: "Kim Min-jun",
          position: "Senior Category Buyer",
          email: "mj.kim@seoulfreshmart.kr",
          phoneWhatsAppWeChat: "+82 10-4821-9034 (WhatsApp/Kakao)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-004",
      companyName: "Atlantic Agro Trading Corp",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "New York",
      channel: "TRADING" as const,
      source: "WEBSITE" as const,
      salesRepId: sale1.id,
      pipelineStage: "NEGOTIATING" as const,
      contacts: [
        {
          name: "Sarah Jenkins",
          position: "VP of Sourcing",
          email: "sjenkins@atlanticagro.us",
          phoneWhatsAppWeChat: "+1 212-555-0173",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-005",
      companyName: "Rheinland Bio-Roastery GmbH",
      countryRegion: "Đức - Châu Âu",
      portOfDestination: "Rotterdam",
      channel: "OEM" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: manager.id,
      pipelineStage: "SAMPLE_SENT" as const,
      contacts: [
        {
          name: "Hannah Becker",
          position: "Quality & Sourcing Manager",
          email: "h.becker@rheinland-bio.de",
          phoneWhatsAppWeChat: "+49 221 5550821",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-006",
      companyName: "K-Food Global Import Inc.",
      countryRegion: "Hàn Quốc - Châu Á",
      portOfDestination: "Incheon",
      channel: "IMPORTER" as const,
      source: "REFERRAL" as const,
      salesRepId: sale1.id,
      pipelineStage: "QUOTED" as const,
      contacts: [
        {
          name: "Park Ji-hoon",
          position: "Managing Director",
          email: "jh.park@kfoodglobal.kr",
          phoneWhatsAppWeChat: "+82 10-7712-3309 (WeChat)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-007",
      companyName: "Golden Gate Specialty Foods",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Oakland",
      channel: "DISTRIBUTOR" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: manager.id,
      pipelineStage: "INQUIRY_QUALIFIED" as const,
      contacts: [
        {
          name: "David Chen",
          position: "Import Buyer",
          email: "dchen@ggspecialty.com",
          phoneWhatsAppWeChat: "+1 415-555-0162 (WeChat)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-008",
      companyName: "Bavaria Gourmet Ingredients",
      countryRegion: "Đức - Châu Âu",
      portOfDestination: "Hamburg",
      channel: "OEM" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: sale1.id,
      pipelineStage: "CONTACTED" as const,
      contacts: [
        {
          name: "Maximilian Hoffmann",
          position: "Procurement Specialist",
          email: "m.hoffmann@bavariagourmet.de",
          phoneWhatsAppWeChat: "+49 89 5550412",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-009",
      companyName: "Busan Port Commodities Ltd",
      countryRegion: "Hàn Quốc - Châu Á",
      portOfDestination: "Busan",
      channel: "TRADING" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: admin.id,
      pipelineStage: "NEW_LEAD" as const,
      contacts: [
        {
          name: "Choi Soo-jin",
          position: "Trade Executive",
          email: "sj.choi@busancommodities.kr",
          phoneWhatsAppWeChat: "+82 10-9120-5581",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-010",
      companyName: "Midwest Bulk Nut Wholesalers",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Savannah",
      channel: "IMPORTER" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: sale1.id,
      pipelineStage: "LOST" as const,
      lostReason: "Khách yêu cầu thanh toán L/C trả chậm 90 ngày, chưa đáp ứng điều khoản tín dụng.",
      contacts: [
        {
          name: "Robert Miller",
          position: "Purchasing Manager",
          email: "rmiller@midwestbulknut.com",
          phoneWhatsAppWeChat: "+1 312-555-0129",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-011",
      companyName: "Tokyo Maruichi Trading Co., Ltd",
      countryRegion: "Nhật Bản - Châu Á",
      portOfDestination: "Yokohama",
      channel: "IMPORTER" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: sale2.id,
      pipelineStage: "ACTIVE_WON" as const,
      contacts: [
        {
          name: "Kenji Takahashi",
          position: "Import Manager",
          email: "k.takahashi@maruichi.jp",
          phoneWhatsAppWeChat: "+81 3-5550-1823",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-012",
      companyName: "Rotterdam EuroSpices B.V.",
      countryRegion: "Hà Lan - Châu Âu",
      portOfDestination: "Rotterdam",
      channel: "DISTRIBUTOR" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: sale2.id,
      pipelineStage: "NEGOTIATING" as const,
      contacts: [
        {
          name: "Pieter Van Der Berg",
          position: "Commercial Director",
          email: "pieter@eurospices.nl",
          phoneWhatsAppWeChat: "+31 10 555 0194 (WhatsApp)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-013",
      companyName: "Thames Valley Fine Foods Ltd",
      countryRegion: "Anh - Châu Âu",
      portOfDestination: "Felixstowe",
      channel: "SUPERMARKET" as const,
      source: "WEBSITE" as const,
      salesRepId: sale2.id,
      pipelineStage: "QUOTED" as const,
      contacts: [
        {
          name: "Oliver Bennett",
          position: "Category Buyer",
          email: "o.bennett@thamesfinefoods.co.uk",
          phoneWhatsAppWeChat: "+44 20 7946 0821",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-014",
      companyName: "Sydney Harbour Pantry Pty",
      countryRegion: "Úc - Châu Đại Dương",
      portOfDestination: "Sydney",
      channel: "IMPORTER" as const,
      source: "REFERRAL" as const,
      salesRepId: sale2.id,
      pipelineStage: "SAMPLE_SENT" as const,
      contacts: [
        {
          name: "Liam O'Connor",
          position: "Supply Chain Lead",
          email: "liam@harbourpantry.com.au",
          phoneWhatsAppWeChat: "+61 2 8000 5512 (WhatsApp)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-015",
      companyName: "Lyon Saveurs & Café SAS",
      countryRegion: "Pháp - Châu Âu",
      portOfDestination: "Le Havre",
      channel: "OEM" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: manager.id,
      pipelineStage: "DORMANT" as const,
      contacts: [
        {
          name: "Claire Moreau",
          position: "Head Roaster & Buyer",
          email: "c.moreau@lyonsaveurs.fr",
          phoneWhatsAppWeChat: "+33 4 72 55 01 44",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-016",
      companyName: "Maple Leaf Organic Imports",
      countryRegion: "Canada - Bắc Mỹ",
      portOfDestination: "Vancouver",
      channel: "DISTRIBUTOR" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: sale1.id,
      pipelineStage: "INQUIRY_QUALIFIED" as const,
      contacts: [
        {
          name: "Emily Watson",
          position: "Sourcing Specialist",
          email: "ewatson@mapleleaforganic.ca",
          phoneWhatsAppWeChat: "+1 604-555-0185",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-017",
      companyName: "Merlion Straits Commodities",
      countryRegion: "Singapore - Châu Á",
      portOfDestination: "Singapore",
      channel: "TRADING" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: sale2.id,
      pipelineStage: "ACTIVE_WON" as const,
      contacts: [
        {
          name: "Tan Wei Ming",
          position: "Trading Director",
          email: "wm.tan@merlionstraits.sg",
          phoneWhatsAppWeChat: "+65 9123 4567 (WhatsApp)",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-018",
      companyName: "Osaka Kansai Grain Corp",
      countryRegion: "Nhật Bản - Châu Á",
      portOfDestination: "Osaka",
      channel: "IMPORTER" as const,
      source: "WEBSITE" as const,
      salesRepId: sale2.id,
      pipelineStage: "CONTACTED" as const,
      contacts: [
        {
          name: "Yuki Sato",
          position: "Procurement Officer",
          email: "y.sato@kansaigrain.jp",
          phoneWhatsAppWeChat: "+81 6-5550-9910",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-019",
      companyName: "Texas Lone Star Spices Inc.",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Houston",
      channel: "OEM" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: sale1.id,
      pipelineStage: "NEW_LEAD" as const,
      contacts: [
        {
          name: "Daniel Brooks",
          position: "Operations Manager",
          email: "dbrooks@lonestarspices.us",
          phoneWhatsAppWeChat: "+1 713-555-0144",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-020",
      companyName: "Nordic Coffee Roasters AB",
      countryRegion: "Thụy Điển - Châu Âu",
      portOfDestination: "Gothenburg",
      channel: "OEM" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: sale2.id,
      pipelineStage: "LOST" as const,
      lostReason: "Khách chuyển sang nguồn cung Brazil do thời gian tàu về Bắc Âu ngắn hơn.",
      contacts: [
        {
          name: "Erik Lindqvist",
          position: "Green Coffee Buyer",
          email: "erik@nordicroasters.se",
          phoneWhatsAppWeChat: "+46 31 555 0178",
          isPrimary: true,
        },
      ],
    },
  ];

  const createdCustomers = [];
  for (const c of customersData) {
    const { contacts, ...customerFields } = c;
    const created = await prisma.customer.create({
      data: {
        ...customerFields,
        contacts: { create: contacts },
      },
    });
    createdCustomers.push(created);
  }

  const [
    cus1,
    cus2,
    cus3,
    cus4,
    cus5,
    cus6,
    ,
    ,
    ,
    ,
    cus11,
    cus12,
    cus13,
    cus14,
    cus15,
    ,
    cus17,
  ] = createdCustomers;

  // 4. 12 Đơn hàng mẫu (tháng hiện tại & tháng trước)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const ym = `${currentYear}${String(currentMonth + 1).padStart(2, "0")}`;

  const prevDate = new Date(currentYear, currentMonth - 1, 15);
  const prevYm = `${prevDate.getFullYear()}${String(
    prevDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const ordersSpec = [
    {
      orderCode: `ORD-${ym}-001`,
      customerId: cus1.id,
      salesRepId: sale1.id,
      orderDate: new Date(currentYear, currentMonth, 2),
      status: "COMPLETED" as const,
      notes: "FOB Cát Lái - 1x40ft HC",
      items: [
        { productId: cashew.id, quantity: 16, unitPrice: 6400 },
        { productId: pepper.id, quantity: 5, unitPrice: 5750 },
      ],
    },
    {
      orderCode: `ORD-${ym}-002`,
      customerId: cus2.id,
      salesRepId: sale1.id,
      orderDate: new Date(currentYear, currentMonth, 5),
      status: "SHIPPED" as const,
      notes: "CIF Hamburg - Chứng từ EUR.1",
      items: [
        { productId: pepper.id, quantity: 14, unitPrice: 5820 },
        { productId: cinnamon.id, quantity: 6, unitPrice: 3600 },
      ],
    },
    {
      orderCode: `ORD-${ym}-003`,
      customerId: cus3.id,
      salesRepId: manager.id,
      orderDate: new Date(currentYear, currentMonth, 8),
      status: "COMPLETED" as const,
      notes: "CIF Busan - Bao bì tiếng Hàn",
      items: [
        { productId: rice.id, quantity: 48, unitPrice: 975 },
        { productId: cashew.id, quantity: 8, unitPrice: 6500 },
      ],
    },
    {
      orderCode: `ORD-${ym}-004`,
      customerId: cus11.id,
      salesRepId: sale2.id,
      orderDate: new Date(currentYear, currentMonth, 11),
      status: "COMPLETED" as const,
      notes: "CIF Yokohama - Kiểm dịch thực vật Nhật Bản",
      items: [
        { productId: tea.id, quantity: 12, unitPrice: 2480 },
        { productId: cashew.id, quantity: 10, unitPrice: 6480 },
      ],
    },
    {
      orderCode: `ORD-${ym}-005`,
      customerId: cus17.id,
      salesRepId: sale2.id,
      orderDate: new Date(currentYear, currentMonth, 14),
      status: "SHIPPED" as const,
      notes: "FOB Cát Lái - Trung chuyển Singapore",
      items: [
        { productId: coffee.id, quantity: 20, unitPrice: 4160 },
        { productId: rice.id, quantity: 25, unitPrice: 960 },
      ],
    },
    {
      orderCode: `ORD-${ym}-006`,
      customerId: cus1.id,
      salesRepId: sale1.id,
      orderDate: new Date(currentYear, currentMonth, 16),
      status: "CONFIRMED" as const,
      notes: "Đơn tái đặt hàng tháng 11",
      items: [{ productId: coffee.id, quantity: 19.2, unitPrice: 4150 }],
    },
    {
      orderCode: `ORD-${ym}-007`,
      customerId: cus2.id,
      salesRepId: sale1.id,
      orderDate: new Date(currentYear, currentMonth, 19),
      status: "COMPLETED" as const,
      notes: "Giao hàng đợt 2 - Hamburg",
      items: [
        { productId: coffee.id, quantity: 18, unitPrice: 4200 },
        { productId: cinnamon.id, quantity: 8, unitPrice: 3680 },
      ],
    },
    {
      orderCode: `ORD-${ym}-008`,
      customerId: cus4.id,
      salesRepId: sale1.id,
      orderDate: new Date(currentYear, currentMonth, 21),
      status: "QUOTED" as const,
      notes: "Báo giá CIF New York hiệu lực 14 ngày",
      items: [{ productId: cashew.id, quantity: 15.88, unitPrice: 6450 }],
    },
    {
      orderCode: `ORD-${ym}-009`,
      customerId: cus5.id,
      salesRepId: manager.id,
      orderDate: new Date(currentYear, currentMonth, 23),
      status: "QUOTED" as const,
      notes: "Báo giá thử nghiệm sau khi gửi mẫu",
      items: [{ productId: coffee.id, quantity: 10, unitPrice: 4250 }],
    },
    {
      orderCode: `ORD-${ym}-010`,
      customerId: cus12.id,
      salesRepId: sale2.id,
      orderDate: new Date(currentYear, currentMonth, 24),
      status: "CONFIRMED" as const,
      notes: "CIF Rotterdam - L/C at sight",
      items: [
        { productId: pepper.id, quantity: 12, unitPrice: 5850 },
        { productId: cinnamon.id, quantity: 5, unitPrice: 3700 },
      ],
    },
    {
      orderCode: `ORD-${ym}-011`,
      customerId: cus13.id,
      salesRepId: sale2.id,
      orderDate: new Date(currentYear, currentMonth, 25),
      status: "QUOTED" as const,
      notes: "Báo giá CIF Felixstowe",
      items: [{ productId: tea.id, quantity: 15, unitPrice: 2450 }],
    },
    {
      orderCode: `ORD-${prevYm}-001`,
      customerId: cus6.id,
      salesRepId: sale1.id,
      orderDate: new Date(prevDate.getFullYear(), prevDate.getMonth(), 25),
      status: "COMPLETED" as const,
      notes: "Đơn hàng tháng trước - Incheon",
      items: [
        { productId: rice.id, quantity: 25, unitPrice: 990 },
        { productId: pepper.id, quantity: 4, unitPrice: 5700 },
      ],
    },
  ];

  for (const ord of ordersSpec) {
    const itemsWithSubtotal = ord.items.map((item) => ({
      ...item,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
    }));
    const totalAmount = itemsWithSubtotal.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    await prisma.order.create({
      data: {
        orderCode: ord.orderCode,
        customerId: ord.customerId,
        salesRepId: ord.salesRepId,
        orderDate: ord.orderDate,
        status: ord.status,
        totalAmount: Number(totalAmount.toFixed(2)),
        notes: ord.notes,
        items: {
          create: itemsWithSubtotal,
        },
      },
    });
  }

  // unused vars silence check
  void cus14;
  void cus15;

  console.log(
    "Đã seed thành công lên Neon DB: 4 nhân viên, 6 sản phẩm, 20 khách hàng, 12 đơn hàng."
  );
}

main()
  .catch((e) => {
    console.error("Lỗi khi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
