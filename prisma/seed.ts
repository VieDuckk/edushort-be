import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding EduShort real database...');

  // 1. Create Owner & User
  const passwordHash = await bcrypt.hash('123456', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@edushort.com' },
    update: {},
    create: {
      email: 'owner@edushort.com',
      username: 'owner',
      passwordHash: passwordHash,
      name: 'Owner EduShort',
      role: UserRole.OWNER,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'hocvien@edushort.com' },
    update: {},
    create: {
      email: 'hocvien@edushort.com',
      username: 'hocvien',
      passwordHash: passwordHash,
      name: 'Học Viên EduShort',
      role: UserRole.USER,
    },
  });

  console.log('Created Users:', owner.email, demoUser.email);

  // 2. Create Categories
  const catPhysics = await prisma.category.upsert({
    where: { slug: 'vat-ly' },
    update: {},
    create: { name: 'Vật Lý', slug: 'vat-ly' },
  });

  const catMath = await prisma.category.upsert({
    where: { slug: 'toan-hoc' },
    update: {},
    create: { name: 'Toán Học', slug: 'toan-hoc' },
  });

  const catChemistry = await prisma.category.upsert({
    where: { slug: 'hoa-hoc' },
    update: {},
    create: { name: 'Hóa Học', slug: 'hoa-hoc' },
  });

  const catBiology = await prisma.category.upsert({
    where: { slug: 'sinh-hoc' },
    update: {},
    create: { name: 'Sinh Học', slug: 'sinh-hoc' },
  });

  console.log('Created Categories: Vat Ly, Toan Hoc, Hoa Hoc, Sinh Hoc');

  // 3. Create Videos
  const videoData = [
    {
      title: 'Định luật Vạn Vật Hấp Dẫn của Newton 🍎',
      description: 'Khám phá bí ẩn tại sao quả táo lại rơi xuống đất và trái đất quay quanh mặt trời qua nhân vật hoạt hình vui nhộn!',
      videoKey: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailKey: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=600&q=80',
      categoryId: catPhysics.id,
      authorId: owner.id,
      views: 1240,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Định lý Pitago trong Tam Giác Vuông 📐',
      description: 'Công thức a² + b² = c² hoạt động thế nào trong thực tế? Xem ngay hoạt hình minh họa trực quan siêu dễ hiểu!',
      videoKey: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailKey: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&q=80',
      categoryId: catMath.id,
      authorId: owner.id,
      views: 980,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Cấu trúc Nguyên Tử & Electron ⚛️',
      description: 'Hạt nhân, Proton, Neutron và các Electron di chuyển ra sao? Tìm hiểu qua cuộc phiêu lưu hoạt hình tí hon!',
      videoKey: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailKey: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&q=80',
      categoryId: catChemistry.id,
      authorId: owner.id,
      views: 1560,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Quá trình Quang Hợp ở Cây Xanh 🍃',
      description: 'Cây cối biến ánh sáng mặt trời thành năng lượng và oxy như thế nào? Video giải thích siêu ngộ nghĩnh!',
      videoKey: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoylikes.mp4',
      thumbnailKey: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&q=80',
      categoryId: catBiology.id,
      authorId: owner.id,
      views: 2100,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Thuyết Tương Đối Hẹp của Einstein ⏳',
      description: 'Thời gian trôi chậm lại khi bạn chuyển động nhanh? Giải thích vật lý hiện đại dễ hiểu nhất!',
      videoKey: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      thumbnailKey: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
      categoryId: catPhysics.id,
      authorId: owner.id,
      views: 3400,
      status: 'PUBLISHED' as const,
    },
    {
      title: 'Phương trình Bậc 2 & Công thức Đenta 🧮',
      description: 'Mẹo nhớ công thức x1, x2 thần tốc với bài hát hoạt hình sôi động!',
      videoKey: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      thumbnailKey: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80',
      categoryId: catMath.id,
      authorId: owner.id,
      views: 890,
      status: 'PUBLISHED' as const,
    },
  ];

  for (const v of videoData) {
    const existing = await prisma.video.findFirst({ where: { title: v.title } });
    if (!existing) {
      await prisma.video.create({ data: v });
    }
  }

  console.log('Seeded Videos successfully');

  // 4. Create Questions & Options
  const questionsData = [
    {
      content: 'Lực nào giữ Trái Đất quay xung quanh Mặt Trời theo Định luật Newton?',
      categoryId: catPhysics.id,
      options: [
        { label: 'A', content: 'Lực hấp dẫn', isCorrect: true },
        { label: 'B', content: 'Lực ma sát', isCorrect: false },
        { label: 'C', content: 'Lực đàn hồi', isCorrect: false },
        { label: 'D', content: 'Lực điện từ', isCorrect: false },
      ],
    },
    {
      content: 'Trong tam giác vuông có hai cạnh góc vuông a = 3 và b = 4, độ dài cạnh huyền c là bao nhiêu?',
      categoryId: catMath.id,
      options: [
        { label: 'A', content: '5', isCorrect: true },
        { label: 'B', content: '6', isCorrect: false },
        { label: 'C', content: '7', isCorrect: false },
        { label: 'D', content: '25', isCorrect: false },
      ],
    },
    {
      content: 'Hạt nào mang điện tích âm nằm ở vỏ nguyên tử?',
      categoryId: catChemistry.id,
      options: [
        { label: 'A', content: 'Proton', isCorrect: false },
        { label: 'B', content: 'Electron', isCorrect: true },
        { label: 'C', content: 'Neutron', isCorrect: false },
        { label: 'D', content: 'Photon', isCorrect: false },
      ],
    },
    {
      content: 'Khí nào được cây xanh giải phóng ra môi trường trong quá trình quang hợp?',
      categoryId: catBiology.id,
      options: [
        { label: 'A', content: 'Khí Cacbonic (CO2)', isCorrect: false },
        { label: 'B', content: 'Khí Oxy (O2)', isCorrect: true },
        { label: 'C', content: 'Khí Nito (N2)', isCorrect: false },
        { label: 'D', content: 'Khí Metan (CH4)', isCorrect: false },
      ],
    },
    {
      content: 'Công thức tính Delta (Δ) của phương trình bậc hai ax² + bx + c = 0 là gì?',
      categoryId: catMath.id,
      options: [
        { label: 'A', content: 'Δ = b² - 4ac', isCorrect: true },
        { label: 'B', content: 'Δ = b² + 4ac', isCorrect: false },
        { label: 'C', content: 'Δ = 2b - 4ac', isCorrect: false },
        { label: 'D', content: 'Δ = a² - 4bc', isCorrect: false },
      ],
    },
  ];

  for (const q of questionsData) {
    const existing = await prisma.question.findFirst({ where: { content: q.content } });
    if (!existing) {
      await prisma.question.create({
        data: {
          content: q.content,
          categoryId: q.categoryId,
          options: {
            create: q.options,
          },
        },
      });
    }
  }

  console.log('Seeded Questions & Options successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
