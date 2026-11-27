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
  console.log("Bắt đầu khởi tạo dữ liệu mẫu BRD TanNhienExport-CRM...");

  await prisma.orderPayment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.customerActivity.deleteMany();
  await prisma.customerContact.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. 4 Nhân viên theo đúng BRD (Trưởng phòng/Admin, Sales Admin, 2 Sale Export)
  const admin = await prisma.user.create({
    data: {
      name: "Nguyễn Minh Quân",
      email: "quan.nguyen@tannhien.vn",
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Trần Thu Hương",
      email: "huong.tran@tannhien.vn",
      role: "MANAGER",
    },
  });

  const salesAdmin = await prisma.user.create({
    data: {
      name: "Võ Thị Mỹ Linh",
      email: "linh.vo@tannhien.vn",
      role: "SALES_ADMIN",
    },
  });

  const sale1 = await prisma.user.create({
    data: {
      name: "Lê Hoàng Hải",
      email: "hai.le@tannhien.vn",
      role: "SALE",
    },
  });

  const sale2 = await prisma.user.create({
    data: {
      name: "Phạm Ngọc Linh",
      email: "linh.pham@tannhien.vn",
      role: "SALE",
    },
  });

  // 2. Thư viện Sản phẩm chuẩn (Product Master) theo đúng BRD Bánh tráng Tân Nhiên
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "SKU-BT22-300",
        name: "Bánh tráng siêu mỏng 22cm 300g",
        category: "Siêu Mỏng",
        specification: "40 gói/thùng • Túi PA/PE hút chân không",
        unit: "Thùng",
        netWeightGrams: 300,
        packsPerCarton: 40,
        cartonDimensions: "46 x 37 x 34",
        cbm: 0.058,
        capacity20ft: 480,
        capacity40hc: 1150,
        costPrice: 38.5,
        minMarginPercent: 15,
        basePrice: 48.8, // $1.22/gói x 40 gói
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-BT16-200",
        name: "Bánh tráng tròn 16cm 200g",
        category: "Cuốn",
        specification: "50 gói/thùng • Nhãn phụ đa ngôn ngữ",
        unit: "Thùng",
        netWeightGrams: 200,
        packsPerCarton: 50,
        cartonDimensions: "41 x 23 x 34",
        cbm: 0.032,
        capacity20ft: 850,
        capacity40hc: 2000,
        costPrice: 34.0,
        minMarginPercent: 15,
        basePrice: 44.0, // $0.88/gói x 50 gói
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-BT22-120",
        name: "Bánh tráng không nhúng nước 120g",
        category: "Đa nem",
        specification: "60 gói/thùng • Tiện lợi ăn liền",
        unit: "Thùng",
        netWeightGrams: 120,
        packsPerCarton: 60,
        cartonDimensions: "41 x 23 x 34",
        cbm: 0.032,
        capacity20ft: 850,
        capacity40hc: 2000,
        costPrice: 31.0,
        minMarginPercent: 15,
        basePrice: 39.6,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-OEM-V22",
        name: "Bánh tráng OEM 22x22cm 250g",
        category: "OEM",
        specification: "48 gói/thùng • Túi zip theo thiết kế khách",
        unit: "Thùng",
        netWeightGrams: 250,
        packsPerCarton: 48,
        cartonDimensions: "46 x 37 x 34",
        cbm: 0.058,
        capacity20ft: 480,
        capacity40hc: 1150,
        costPrice: 44.0,
        minMarginPercent: 16,
        basePrice: 56.64, // $1.18/gói x 48 gói
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-BT-CHILI-150",
        name: "Bánh tráng trộn vị Tỏi Ớt 150g",
        category: "Trộn / Gia vị",
        specification: "40 gói/thùng • Đạt chuẩn FDA / HACCP",
        unit: "Thùng",
        netWeightGrams: 150,
        packsPerCarton: 40,
        cartonDimensions: "44 x 34 x 32",
        cbm: 0.048,
        capacity20ft: 580,
        capacity40hc: 1350,
        costPrice: 28.0,
        minMarginPercent: 15,
        basePrice: 36.0,
      },
    }),
  ]);

  const [bt22_300, bt16_200, bt22_120, oem_v22, bt_chili] = products;

  const now = new Date();
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
  const daysAhead = (d: number) =>
    new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // 3. Danh sách Khách hàng (gồm 5 khách mẫu từ BRD + 10 khách mở rộng)
  const customersSpec = [
    {
      customerCode: "CUS-001",
      companyName: "Amazing Oriental B.V.",
      countryRegion: "Hà Lan - Châu Âu",
      portOfDestination: "Rotterdam",
      channel: "SUPERMARKET" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: sale2.id,
      pipelineStage: "ACTIVE_WON" as const,
      lastActivityAt: daysAgo(2),
      nextFollowUpDate: daysAhead(14),
      contacts: [
        {
          name: "Mr. Jan Van Dijk",
          position: "Buyer",
          email: "jan@amazingoriental.nl",
          phoneWhatsAppWeChat: "+31 10 555 0142 (WhatsApp)",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Khách mua định kỳ 2 tháng/lần. Đã xác nhận lịch đặt cont tháng 12.",
        nextFollowUpDate: daysAhead(14),
      },
    },
    {
      customerCode: "CUS-002",
      companyName: "Asia Food GmbH",
      countryRegion: "Đức - Châu Âu",
      portOfDestination: "Hamburg",
      channel: "IMPORTER" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: sale1.id,
      pipelineStage: "NEGOTIATING" as const,
      lastActivityAt: daysAgo(1),
      nextFollowUpDate: daysAhead(2),
      contacts: [
        {
          name: "Ms. Anna Müller",
          position: "Procurement Lead",
          email: "anna@asiafood.de",
          phoneWhatsAppWeChat: "+49 40 5550188 (WhatsApp)",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "WhatsApp",
        summary: "Đang chốt giá cont 40HC tháng 12 kèm nhãn phụ tiếng Đức.",
        nextFollowUpDate: daysAhead(2),
      },
    },
    {
      customerCode: "CUS-003",
      companyName: "K-Mart Imports Co.",
      countryRegion: "Hàn Quốc - Châu Á",
      portOfDestination: "Busan",
      channel: "OEM" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: sale2.id,
      pipelineStage: "QUOTED" as const,
      // Quá 7 ngày không cập nhật -> kích hoạt cảnh báo đỏ cho Trưởng phòng!
      lastActivityAt: daysAgo(9),
      nextFollowUpDate: daysAgo(1),
      contacts: [
        {
          name: "Mr. Park Min-ho",
          position: "OEM Sourcing Manager",
          email: "park@kmartimports.kr",
          phoneWhatsAppWeChat: "+82 10-4821-9034",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Đã gửi mẫu 22cm túi zip ngày 18/11, chờ kết quả test vi sinh HQ.",
        nextFollowUpDate: daysAgo(1),
      },
    },
    {
      customerCode: "CUS-004",
      companyName: "Pacific Rim Foods LLC",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Los Angeles",
      channel: "DISTRIBUTOR" as const,
      source: "WEBSITE" as const,
      salesRepId: sale1.id,
      pipelineStage: "QUOTED" as const,
      // Quá 7 ngày không cập nhật -> kích hoạt cảnh báo đỏ!
      lastActivityAt: daysAgo(8),
      nextFollowUpDate: daysAhead(3),
      contacts: [
        {
          name: "Mr. David Carter",
          position: "Import Director",
          email: "david@pacificrimfoods.com",
          phoneWhatsAppWeChat: "+1 310-555-0192 (WhatsApp)",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Đã gửi báo giá FOB HCM, hẹn follow-up 30/11.",
        nextFollowUpDate: daysAhead(3),
      },
    },
    {
      customerCode: "CUS-005",
      companyName: "EuroSnack Trading SAS",
      countryRegion: "Pháp - Châu Âu",
      portOfDestination: "Le Havre",
      channel: "TRADING" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: sale2.id,
      pipelineStage: "LOST" as const,
      lostReason: "Giá cao hơn đối thủ 6% (Target: $1.15/gói)",
      lastActivityAt: daysAgo(5),
      contacts: [
        {
          name: "Ms. Claire Moreau",
          position: "Buyer",
          email: "claire@eurosnack.fr",
          phoneWhatsAppWeChat: "+33 4 72 55 01 44",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Call",
        summary: "Khách báo target $1.15/gói, chưa đạt biên lợi nhuận tối thiểu.",
      },
    },
    {
      customerCode: "CUS-006",
      companyName: "Tokyo Maruichi Foods",
      countryRegion: "Nhật Bản - Châu Á",
      portOfDestination: "Yokohama",
      channel: "IMPORTER" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: sale1.id,
      pipelineStage: "ACTIVE_WON" as const,
      lastActivityAt: daysAgo(3),
      nextFollowUpDate: daysAhead(10),
      contacts: [
        {
          name: "Mr. Kenji Sato",
          position: "Purchasing Manager",
          email: "k.sato@maruichi.jp",
          phoneWhatsAppWeChat: "+81 3-5550-1823",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Đã chốt đơn bánh tráng 16cm và 22cm giao Yokohama.",
        nextFollowUpDate: daysAhead(10),
      },
    },
    {
      customerCode: "CUS-007",
      companyName: "Golden Gate Asian Market",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Oakland",
      channel: "SUPERMARKET" as const,
      source: "REFERRAL" as const,
      salesRepId: sale1.id,
      pipelineStage: "NEW_LEAD" as const,
      lastActivityAt: daysAgo(2),
      nextFollowUpDate: daysAhead(1),
      contacts: [
        {
          name: "Mr. Kevin Nguyen",
          position: "Category Buyer",
          email: "kevin@ggmarket.us",
          phoneWhatsAppWeChat: "+1 415-555-0162",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "WhatsApp",
        summary: "Khách hỏi chứng nhận FDA và quy cách đóng thùng 40HC.",
        nextFollowUpDate: daysAhead(1),
      },
    },
    {
      customerCode: "CUS-008",
      companyName: "Seoul Fresh Mart Co., Ltd",
      countryRegion: "Hàn Quốc - Châu Á",
      portOfDestination: "Incheon",
      channel: "SUPERMARKET" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: manager.id,
      pipelineStage: "ACTIVE_WON" as const,
      lastActivityAt: daysAgo(4),
      nextFollowUpDate: daysAhead(7),
      contacts: [
        {
          name: "Ms. Kim Ji-soo",
          position: "Senior Buyer",
          email: "jisoo@seoulfresh.kr",
          phoneWhatsAppWeChat: "+82 10-7712-3309",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Đang chuẩn bị đơn hàng tái đặt quý 1.",
        nextFollowUpDate: daysAhead(7),
      },
    },
    {
      customerCode: "CUS-009",
      companyName: "Sydney Harbour Asian Pantry",
      countryRegion: "Úc - Châu Đại Dương",
      portOfDestination: "Sydney",
      channel: "DISTRIBUTOR" as const,
      source: "WEBSITE" as const,
      salesRepId: sale2.id,
      pipelineStage: "NEW_LEAD" as const,
      lastActivityAt: daysAgo(3),
      nextFollowUpDate: daysAhead(4),
      contacts: [
        {
          name: "Mr. Liam O'Connor",
          position: "Import Manager",
          email: "liam@harbourpantry.com.au",
          phoneWhatsAppWeChat: "+61 2 8000 5512",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Đã gửi catalogue Tân Nhiên và bảng giá tham khảo.",
        nextFollowUpDate: daysAhead(4),
      },
    },
    {
      customerCode: "CUS-010",
      companyName: "Thames Valley Oriental Foods",
      countryRegion: "Anh - Châu Âu",
      portOfDestination: "Felixstowe",
      channel: "IMPORTER" as const,
      source: "CUSTOMS_DATA" as const,
      salesRepId: sale1.id,
      pipelineStage: "NEW_LEAD" as const,
      lastActivityAt: daysAgo(1),
      contacts: [
        {
          name: "Mr. Oliver Bennett",
          position: "Buyer",
          email: "oliver@thamesoriental.co.uk",
          phoneWhatsAppWeChat: "+44 20 7946 0821",
          isPrimary: true,
        },
      ],
    },
    {
      customerCode: "CUS-011",
      companyName: "Maple Leaf Mekong Foods",
      countryRegion: "Canada - Bắc Mỹ",
      portOfDestination: "Vancouver",
      channel: "DISTRIBUTOR" as const,
      source: "TRADE_FAIR" as const,
      salesRepId: sale2.id,
      pipelineStage: "ACTIVE_WON" as const,
      lastActivityAt: daysAgo(110),
      nextFollowUpDate: daysAhead(0),
      contacts: [
        {
          name: "Ms. Emily Watson",
          position: "Purchasing",
          email: "emily@mapleleafmekong.ca",
          phoneWhatsAppWeChat: "+1 604-555-0185",
          isPrimary: true,
        },
      ],
      activity: {
        channel: "Email",
        summary: "Khách đã mua từ tháng 7, cần hỏi thăm nhu cầu tái đặt hàng.",
        nextFollowUpDate: daysAhead(0),
      },
    },
    {
      customerCode: "CUS-012",
      companyName: "Midwest Bulk Asian Goods",
      countryRegion: "Mỹ - Bắc Mỹ",
      portOfDestination: "Savannah",
      channel: "IMPORTER" as const,
      source: "B2B_PLATFORM" as const,
      salesRepId: sale1.id,
      pipelineStage: "LOST" as const,
      lostReason: "Không đáp ứng MOQ 1 container 40HC cho hàng OEM",
      lastActivityAt: daysAgo(12),
      contacts: [
        {
          name: "Mr. Robert Miller",
          position: "Director",
          email: "rmiller@midwestbulk.us",
          phoneWhatsAppWeChat: "+1 312-555-0129",
          isPrimary: true,
        },
      ],
    },
  ];

  const createdCustomers = [];
  for (const c of customersSpec) {
    const { contacts, activity, ...rest } = c;
    const created = await prisma.customer.create({
      data: {
        ...rest,
        contacts: { create: contacts },
        ...(activity
          ? {
              activities: {
                create: {
                  userId: rest.salesRepId,
                  channel: activity.channel,
                  summary: activity.summary,
                  nextFollowUpDate: activity.nextFollowUpDate ?? null,
                },
              },
            }
          : {}),
      },
    });
    createdCustomers.push(created);
  }

  const [cus1, cus2, cus3, cus4, , cus6, , cus8] = createdCustomers;

  // 4. Phiếu Báo giá & Check Specs theo đúng BRD (Phần 2.3)
  await prisma.quotation.create({
    data: {
      quoteCode: "QT-2601",
      version: 2,
      customerId: cus1.id,
      salesRepId: sale2.id,
      quoteType: "STANDARD",
      incoterm: "FOB",
      portName: "Cát Lái, HCM",
      exchangeRate: 25400,
      marginPercent: 21.1,
      totalAmount: 56120,
      specsNotes: "SKU-BT22-300 (Hàng chuẩn)",
      specsCheckStatus: "NOT_REQUIRED",
      approvalStatus: "AUTO_APPROVED",
      approvedById: manager.id,
      items: {
        create: [
          {
            productId: bt22_300.id,
            quantity: 1150,
            unitPrice: 48.8,
            subtotal: 56120,
          },
        ],
      },
    },
  });

  await prisma.quotation.create({
    data: {
      quoteCode: "QT-2602",
      version: 1,
      customerId: cus2.id,
      salesRepId: sale1.id,
      quoteType: "STANDARD",
      incoterm: "CIF",
      portName: "Hamburg",
      exchangeRate: 25400,
      packagingCost: 450,
      seaFreight: 3200,
      localCharges: 380,
      marginPercent: 18.5,
      totalAmount: 88000,
      specsNotes: "SKU-BT16-200 (Nhãn phụ tiếng Đức)",
      specsCheckStatus: "FEASIBLE",
      moq: "2,000 thùng (1x40HC)",
      leadTimeDays: 14,
      approvalStatus: "APPROVED",
      approvedById: manager.id,
      items: {
        create: [
          {
            productId: bt16_200.id,
            quantity: 2000,
            unitPrice: 44.0,
            subtotal: 88000,
          },
        ],
      },
    },
  });

  await prisma.quotation.create({
    data: {
      quoteCode: "QT-2603",
      version: 1,
      customerId: cus3.id,
      salesRepId: sale2.id,
      quoteType: "OEM",
      incoterm: "FOB",
      portName: "Cát Lái, HCM",
      exchangeRate: 25400,
      packagingCost: 1200,
      testingCost: 350,
      marginPercent: 14.2, // Dưới định mức 15% & OEM -> Chờ Trưởng phòng duyệt
      totalAmount: 65136,
      specsNotes: "SKU-OEM-V22 (Test vi sinh HQ, túi zip theo thiết kế khách)",
      specsCheckStatus: "FEASIBLE",
      moq: "1 cont 40HC (1,150 thùng)",
      leadTimeDays: 21,
      approvalStatus: "PENDING_APPROVAL",
      items: {
        create: [
          {
            productId: oem_v22.id,
            quantity: 1150,
            unitPrice: 56.64,
            subtotal: 65136,
          },
        ],
      },
    },
  });

  // 5. Đơn hàng & Điều phối 6 bước (Phần 3.2 BRD + dữ liệu Quý 4/2026)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const ordersSpec = [
    {
      orderCode: "ORD-26-011",
      poNumber: "PO-882",
      customerId: cus1.id,
      salesRepId: sale2.id,
      orderType: "STANDARD" as const,
      incoterm: "FOB" as const,
      orderDate: new Date(currentYear, currentMonth - 1, 5),
      contractDate: new Date(currentYear, currentMonth - 1, 5),
      estProductionDate: new Date(currentYear, currentMonth - 1, 15),
      actualProductionDate: new Date(currentYear, currentMonth - 1, 14),
      packagingStatus: "Đủ bao bì",
      qaQcStatus: "Đạt chuẩn xuất",
      stuffingDate: new Date(currentYear, currentMonth - 1, 18),
      etd: new Date(currentYear, currentMonth - 1, 20),
      eta: new Date(currentYear, currentMonth, 22),
      docsStatus: "Đã gửi gốc (DHL)",
      dhlTracking: "DHL-884920112",
      containerCount: 1,
      status: "COMPLETED" as const,
      notes: "1x40HC Bánh tráng 22cm 300g giao Rotterdam",
      items: [{ productId: bt22_300.id, quantity: 1150, unitPrice: 48.8 }],
      payments: [
        {
          paymentType: "DEPOSIT" as const,
          amount: 16836,
          paidDate: new Date(currentYear, currentMonth - 1, 6),
          swiftRef: "SWF-NL-01",
          notes: "Deposit 30%",
        },
        {
          paymentType: "BALANCE" as const,
          amount: 39284,
          paidDate: new Date(currentYear, currentMonth - 1, 25),
          swiftRef: "SWF-NL-02",
          notes: "Balance 70%",
        },
      ],
    },
    {
      orderCode: "ORD-26-014",
      poNumber: "PO-905",
      customerId: cus2.id,
      salesRepId: sale1.id,
      orderType: "STANDARD" as const,
      incoterm: "CIF" as const,
      orderDate: new Date(currentYear, currentMonth - 1, 28),
      contractDate: new Date(currentYear, currentMonth - 1, 28),
      estProductionDate: new Date(currentYear, currentMonth, 10),
      actualProductionDate: new Date(currentYear, currentMonth, 10),
      packagingStatus: "Xong nhãn phụ Đức",
      qaQcStatus: "Đạt chuẩn EU",
      stuffingDate: new Date(currentYear, currentMonth, 16),
      etd: new Date(currentYear, currentMonth, 18),
      eta: new Date(currentYear, currentMonth + 1, 20),
      docsStatus: "B/L Telex, C/O EUR.1 xong",
      containerCount: 1,
      status: "SHIPPED" as const,
      notes: "CIF Hamburg - B/L Telex",
      items: [{ productId: bt16_200.id, quantity: 2000, unitPrice: 44.0 }],
      payments: [
        {
          paymentType: "DEPOSIT" as const,
          amount: 26400,
          paidDate: new Date(currentYear, currentMonth - 1, 29),
          swiftRef: "SWF-DE-01",
          notes: "Deposit 30%",
        },
      ],
    },
    {
      orderCode: "ORD-26-018",
      poNumber: "PO-112",
      customerId: cus4.id,
      salesRepId: sale1.id,
      orderType: "STANDARD" as const,
      incoterm: "FOB" as const,
      orderDate: new Date(currentYear, currentMonth, 15),
      contractDate: new Date(currentYear, currentMonth, 15),
      estProductionDate: new Date(currentYear, currentMonth + 1, 2),
      packagingStatus: "Đang in thùng carton",
      qaQcStatus: "Chờ chạy mẫu đầu chuyền",
      etd: daysAhead(4), // Sắp ETD trong 4 ngày -> kích hoạt cảnh báo!
      eta: daysAhead(32),
      docsStatus: "Chưa làm",
      containerCount: 1,
      status: "IN_PRODUCTION" as const,
      notes: "Đơn đi Los Angeles - cần kiểm tra booking sớm",
      items: [
        { productId: bt22_120.id, quantity: 700, unitPrice: 39.6 },
        { productId: bt_chili.id, quantity: 410.55, unitPrice: 36.0 },
      ],
      payments: [
        {
          paymentType: "DEPOSIT" as const,
          amount: 12750,
          paidDate: new Date(currentYear, currentMonth, 16),
          swiftRef: "SWF-US-01",
          notes: "Deposit 30%",
        },
      ],
    },
    {
      orderCode: "ORD-26-019",
      poNumber: "PO-554",
      customerId: cus6.id,
      salesRepId: sale1.id,
      orderType: "STANDARD" as const,
      incoterm: "CIF" as const,
      orderDate: new Date(currentYear, currentMonth, 6),
      contractDate: new Date(currentYear, currentMonth, 6),
      estProductionDate: new Date(currentYear, currentMonth, 12),
      actualProductionDate: new Date(currentYear, currentMonth, 12),
      packagingStatus: "Đủ bao bì",
      qaQcStatus: "Đạt chuẩn Nhật",
      stuffingDate: new Date(currentYear, currentMonth, 15),
      etd: new Date(currentYear, currentMonth, 17),
      eta: new Date(currentYear, currentMonth, 26),
      docsStatus: "B/L, C/O AJ, Health Cert xong",
      containerCount: 1,
      status: "COMPLETED" as const,
      notes: "CIF Yokohama",
      items: [
        { productId: bt22_300.id, quantity: 600, unitPrice: 49.0 },
        { productId: bt16_200.id, quantity: 900, unitPrice: 44.5 },
      ],
      payments: [
        {
          paymentType: "DEPOSIT" as const,
          amount: 20835,
          paidDate: new Date(currentYear, currentMonth, 7),
          swiftRef: "SWF-JP-01",
          notes: "Deposit 30%",
        },
        {
          paymentType: "BALANCE" as const,
          amount: 48615,
          paidDate: new Date(currentYear, currentMonth, 22),
          swiftRef: "SWF-JP-02",
          notes: "Balance 70%",
        },
      ],
    },
    {
      orderCode: "ORD-26-020",
      poNumber: "PO-719",
      customerId: cus8.id,
      salesRepId: manager.id,
      orderType: "OEM" as const,
      incoterm: "FOB" as const,
      orderDate: new Date(currentYear, currentMonth, 10),
      contractDate: new Date(currentYear, currentMonth, 10),
      estProductionDate: new Date(currentYear, currentMonth, 20),
      packagingStatus: "Đã duyệt file in OEM",
      qaQcStatus: "Đang test vi sinh",
      etd: new Date(currentYear, currentMonth, 27),
      eta: new Date(currentYear, currentMonth + 1, 6),
      docsStatus: "Đang lên Invoice/P/L",
      containerCount: 1,
      status: "CONFIRMED" as const,
      notes: "OEM Seoul Fresh Mart - túi zip 250g",
      items: [{ productId: oem_v22.id, quantity: 1150, unitPrice: 56.64 }],
      payments: [
        {
          paymentType: "DEPOSIT" as const,
          amount: 19540.8,
          paidDate: new Date(currentYear, currentMonth, 12),
          swiftRef: "SWF-KR-01",
          notes: "Deposit 30%",
        },
      ],
    },
  ];

  for (const ord of ordersSpec) {
    const itemsWithSubtotal = ord.items.map((item) => ({
      ...item,
      subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
    }));
    const totalAmount = Number(
      itemsWithSubtotal.reduce((sum, i) => sum + i.subtotal, 0).toFixed(2)
    );
    const paidAmount = Number(
      ord.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)
    );

    await prisma.order.create({
      data: {
        orderCode: ord.orderCode,
        poNumber: ord.poNumber,
        customerId: ord.customerId,
        salesRepId: ord.salesRepId,
        orderType: ord.orderType,
        incoterm: ord.incoterm,
        orderDate: ord.orderDate,
        contractDate: ord.contractDate,
        estProductionDate: ord.estProductionDate,
        actualProductionDate: ord.actualProductionDate ?? null,
        packagingStatus: ord.packagingStatus ?? null,
        qaQcStatus: ord.qaQcStatus ?? null,
        stuffingDate: ord.stuffingDate ?? null,
        etd: ord.etd ?? null,
        eta: ord.eta ?? null,
        docsStatus: ord.docsStatus ?? null,
        dhlTracking: ord.dhlTracking ?? null,
        containerCount: ord.containerCount,
        status: ord.status,
        totalAmount,
        paidAmount,
        notes: ord.notes,
        items: { create: itemsWithSubtotal },
        payments: { create: ord.payments },
      },
    });
  }

  // Silence unused warning
  void admin;
  void salesAdmin;

  console.log(
    "Đã seed xong dữ liệu BRD: 5 nhân viên, 5 SKU bánh tráng, 12 khách hàng + Activity Log, 3 báo giá, 5 đơn hàng điều phối."
  );
}

main()
  .catch((e) => {
    console.error("Lỗi khi seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
