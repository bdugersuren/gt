import { PrismaClient, Role, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production seed is disabled');
  }
  console.log('Seeding database with TVET VET & ELE pilot run data...');

  // 1. Hash passwords
  const requireSeedPassword = (name: string) => {
    const value = process.env[name];
    if (!value || value.length < 12) throw new Error(`${name} must be set and at least 12 characters`);
    return value;
  };
  const adminPasswordHash = await bcrypt.hash(requireSeedPassword('SEED_ADMIN_PASSWORD'), 10);
  const managerPasswordHash = await bcrypt.hash(requireSeedPassword('SEED_MANAGER_PASSWORD'), 10);
  const teacherPasswordHash = await bcrypt.hash(requireSeedPassword('SEED_TEACHER_PASSWORD'), 10);
  const mentorPasswordHash = await bcrypt.hash(requireSeedPassword('SEED_MENTOR_PASSWORD'), 10);
  const studentPasswordHash = await bcrypt.hash(requireSeedPassword('SEED_STUDENT_PASSWORD'), 10);

  // 2. Create Departments
  const deptAgr = await prisma.department.upsert({
    where: { code: 'VET-AGR' },
    update: {},
    create: {
      name: 'Хөдөө аж ахуй (Мал эмнэлэг)',
      code: 'VET-AGR',
    },
  });

  const deptEle = await prisma.department.upsert({
    where: { code: 'VET-ELE' },
    update: {},
    create: {
      name: 'Барилгын цахилгаан техник',
      code: 'VET-ELE',
    },
  });

  console.log('Departments created/upserted:', [deptAgr.code, deptEle.code]);

  // 3. Create Class Groups
  const classAgr3A = await prisma.classGroup.upsert({
    where: { code: 'CLASS-AGR-3A' },
    update: {},
    create: {
      name: 'Малын эмч 3A',
      code: 'CLASS-AGR-3A',
      academicYear: '2026-2027',
      departmentId: deptAgr.id,
    },
  });

  const classEle2B = await prisma.classGroup.upsert({
    where: { code: 'CLASS-ELE-2B' },
    update: {},
    create: {
      name: 'Барилгын цахилгаан монтаж 2B',
      code: 'CLASS-ELE-2B',
      academicYear: '2026-2027',
      departmentId: deptEle.id,
    },
  });

  console.log('Class Groups created/upserted:', [classAgr3A.code, classEle2B.code]);

  // 4. Create Users (RBAC role matrix mapping)
  const userAdmin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@gurvantamir.edu.mn',
      passwordHash: adminPasswordHash,
      fullName: 'Батбаяр Эрдэнэ (Админ)',
      code: 'STAFF-ADMIN-01',
      roles: [Role.ADMIN],
      phone: '99112233',
    },
  });

  const userManager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {},
    create: {
      username: 'manager',
      email: 'manager@gurvantamir.edu.mn',
      passwordHash: managerPasswordHash,
      fullName: 'Саруул Туяа (Сургалтын алба)',
      code: 'STAFF-MGR-01',
      roles: [Role.MANAGER],
      phone: '99223344',
      departmentId: deptAgr.id,
    },
  });

  // Seed teacher with dual roles (TEACHER and MANAGER) to test selectors/switchers
  const userTeacher = await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      email: 'teacher@gurvantamir.edu.mn',
      passwordHash: teacherPasswordHash,
      fullName: 'Ганболд Мөнх-Эрдэнэ (Багш)',
      code: 'STAFF-TCH-01',
      roles: [Role.TEACHER, Role.MANAGER],
      phone: '99334455',
      departmentId: deptAgr.id,
    },
  });

  const userMentor = await prisma.user.upsert({
    where: { username: 'mentor' },
    update: {},
    create: {
      username: 'mentor',
      email: 'mentor@industry.mn',
      passwordHash: mentorPasswordHash,
      fullName: 'Төмөр Баатар (Дадлага удирдагч)',
      code: 'MENTOR-01',
      roles: [Role.ENTERPRISE_MENTOR],
      phone: '99445566',
      companyName: 'Архангай Импекс ХХК',
    },
  });

  const userStudentAgr = await prisma.user.upsert({
    where: { username: 'student' },
    update: {},
    create: {
      username: 'student',
      email: 'student@gurvantamir.edu.mn',
      passwordHash: studentPasswordHash,
      fullName: 'Төгөлдөр Батсуурь (Оюутан - Малын эмч)',
      code: 'STUDENT-AGR-001',
      roles: [Role.STUDENT],
      registerNumber: 'АЕ06231234',
      phone: '99556677',
      departmentId: deptAgr.id,
      classGroupId: classAgr3A.id,
    },
  });

  const userStudentEle = await prisma.user.upsert({
    where: { username: 'student_ele' },
    update: {},
    create: {
      username: 'student_ele',
      email: 'student_ele@gurvantamir.edu.mn',
      passwordHash: studentPasswordHash,
      fullName: 'Бат-Эрдэнэ Болд (Оюутан - Цахилгаанчин)',
      code: 'STUDENT-ELE-002',
      roles: [Role.STUDENT],
      registerNumber: 'ФМ05245678',
      phone: '99667788',
      departmentId: deptEle.id,
      classGroupId: classEle2B.id,
    },
  });

  console.log('Users seeded successfully');

  // 5. Create Courses
  const courseAgr = await prisma.course.upsert({
    where: { code: 'VET-AGR-101' },
    update: {},
    create: {
      title: 'Мал эмнэлгийн анхан шатны тусламж',
      code: 'VET-AGR-101',
      description: 'Чадамжийн нэгж 1: Малын өвчнөөс урьдчилан сэргийлэх, оношлох, анхан шатны тусламж үзүүлэх технологиуд.',
      isCBT: true,
      departmentId: deptAgr.id,
      teachers: {
        connect: { id: userTeacher.id }
      },
    },
  });

  const courseEle = await prisma.course.upsert({
    where: { code: 'VET-ELE-201' },
    update: {},
    create: {
      title: 'Барилгын цахилгаан угсралт',
      code: 'VET-ELE-201',
      description: 'Чадамжийн нэгж 1: Барилгын дотор болон гадна цахилгаан монтаж угсралтын зураг төсөл, гүйцэтгэх арга аргачлалууд.',
      isCBT: true,
      departmentId: deptEle.id,
      teachers: {
        connect: { id: userTeacher.id }
      },
    },
  });

  console.log('Courses seeded:', [courseAgr.title, courseEle.title]);

  // 6. Create Modules and Lessons for Veterinary
  const moduleAgr1 = await prisma.module.create({
    data: {
      title: 'Чадамжийн нэгж 1: Малын өвчнөөс урьдчилан сэргийлэх',
      order: 1,
      courseId: courseAgr.id,
    },
  });

  // Lesson 1: Safety and Tools (Contains KaTeX and Mermaid)
  const lessonAgr1 = await prisma.lesson.create({
    data: {
      title: 'Чадамжийн элемент 1.1: Аюулгүй ажиллагаа ба багаж хэрэгсэл',
      order: 1,
      contentType: 'MARKDOWN',
      contentBody: `
# Аюулгүй ажиллагааны ерөнхий шаардлага

Малын эмнэлгийн анхан шатны тусламж үзүүлэхэд ХАБЭА-н дүрмийг чанд баримтлах шаардлагатай.

## 1. Шаардлагатай багаж хэрэгсэл
Малын биеийн температурыг хэмжих томьёог бодоход дараах хамаарлыг авч үзнэ:
Үүнд малын биеийн температурын хэлбэлзэл $T$ нь дараах байдалтай байна:
$$T_{normal} = 38.5^\\circ \\text{C} \\pm 0.5^\\circ \\text{C}$$

## 2. Ажилбарын дараалал
Ажлын урсгалыг доорх Mermaid диаграммаар харуулав:

\`\`\`mermaid
graph TD
  A[Аюулгүй хувцас өмсөх] --> B[Багаж хэрэгслийг ариутгах]
  B --> C[Малыг бэхлэх хаших]
  C --> D[Ажилбарыг гүйцэтгэх]
  D --> E[Багаж цэвэрлэх]
\`\`\`
`,
      moduleId: moduleAgr1.id,
    },
  });

  // Lesson 2: Injection technique (Contains custom widgets: check-point, flashcard)
  const lessonAgr2 = await prisma.lesson.create({
    data: {
      title: 'Чадамжийн элемент 1.2: Малд тарилга хийх технологи',
      order: 2,
      contentType: 'MARKDOWN',
      contentBody: `
# Малд тарилга хийх техникүүд

Малд эм тариа хийхдээ булчингийн эсвэл арьсан доорх тарилгын аргыг зөв сонгож хийнэ.

<flashcard front="Малын арьсан доорх тарилгыг ямар өнцгөөр хийх вэ?" back="45 градусын өнцгөөр хийнэ." />

<flashcard front="Булчингийн тарилгыг ямар өнцгөөр хийх вэ?" back="90 градусын өнцгөөр хийнэ." />

<checkpoint question="Малын булчинд тарилга хийхэд хамгийн тохиромжтой хэсэг аль нь вэ?" options="Хүзүүний булчин, Гуяны булчин, Сүүлний уг, Дээрх бүгд" answer="Хүзүүний булчин" />
`,
      moduleId: moduleAgr1.id,
    },
  });

  // 7. Create dependency (DAG prerequisite check)
  // Lesson 2 requires Lesson 1 to be completed first
  await prisma.lessonPrerequisite.create({
    data: {
      lessonId: lessonAgr2.id,
      prerequisiteId: lessonAgr1.id,
    },
  });

  console.log('Veterinary Lessons and DAG dependencies seeded successfully');

  // 8. Create Module and Lessons for Electrical (Contains Blueprint widget)
  const moduleEle1 = await prisma.module.create({
    data: {
      title: 'Чадамжийн нэгж 1: Цахилгаан сүлжээний монтаж',
      order: 1,
      courseId: courseEle.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: 'Чадамжийн элемент 1.1: Цахилгаан хэлхээний зураг төсөл унших',
      order: 1,
      contentType: 'MARKDOWN',
      contentBody: `
# Цахилгаан хэлхээний зураг төсөл

Барилгын дотор сүлжээний угсралтыг хийхдээ зураг төслийн стандартыг дагаж ажиллана.

Доорх хэлхээний зургийг сайтар судалж бэлтгэл хангана уу.

<blueprint title="Амины сууцны цахилгаан монтажийн бүдүүвч зураг" imageUrl="https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=800&auto=format&fit=crop" downloadUrl="https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80" />
`,
      moduleId: moduleEle1.id,
    },
  });

  console.log('Electrical Lessons and Blueprint seeded successfully');

  // 9. Create Questions & Quiz under Lesson 1 (Veterinary)
  const q1 = await prisma.question.create({
    data: {
      courseId: courseAgr.id,
      text: 'Мал эмнэлэгт ариутгал хийх хамгийн найдвартай арга юу вэ?',
      type: QuestionType.MULTIPLE_CHOICE,
      optionsJson: ['Буцалгах автоклавт ариутгах', 'Усаар угаах', 'Хуурай алчуураар арчих', 'Нарны гэрэлд тавих'] as any,
      correctAnswer: 'Буцалгах автоклавт ариутгах',
      explanation: 'Өндөр даралттай уурын автоклав нь бактерийн споруудыг бүрэн устгадаг тул хамгийн найдвартай ариутгалын арга юм.',
      points: 10.0,
    },
  });

  const q2 = await prisma.question.create({
    data: {
      courseId: courseAgr.id,
      text: 'Малын температур хэмжихэд шулуун гэдсээр (ректаль) хэмжих нь хамгийн үнэн зөв байдаг уу?',
      type: QuestionType.TRUE_FALSE,
      optionsJson: ['Тийм', 'Үгүй'] as any,
      correctAnswer: 'Тийм',
      explanation: 'Малын дотоод биеийн температурыг шулуун гэдсээр хэмжих нь хамгийн найдвартай байдаг.',
      points: 5.0,
    },
  });

  const q3 = await prisma.question.create({
    data: {
      courseId: courseAgr.id,
      text: 'Малын арьсан доорх тарилгыг хийх өнцгийг тоогоор бичнэ үү (градусаар)',
      type: QuestionType.SHORT_ANSWER,
      optionsJson: [] as any,
      correctAnswer: '45',
      explanation: 'Арьсан доорх тарилгыг 45 градусын налуу өнцгөөр хийдэг.',
      points: 5.0,
    },
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: 'Аюулгүй ажиллагаа ба багажны сорил',
      timeLimitMin: 20,
      passScore: 60.0,
      lessonId: lessonAgr1.id,
    },
  });

  await prisma.quizQuestion.createMany({
    data: [
      { quizId: quiz.id, questionId: q1.id, order: 1 },
      { quizId: quiz.id, questionId: q2.id, order: 2 },
      { quizId: quiz.id, questionId: q3.id, order: 3 },
    ],
  });

  console.log('Quiz and Questions seeded successfully');

  // 10. Create Assignment with Rubric Matrix under Lesson 2 (Veterinary)
  const assignment = await prisma.assignment.create({
    data: {
      title: 'Малд тарилга хийх видео тайлан даалгавар',
      description: 'Оюутнууд үхэр эсвэл хонинд булчингийн тарилга зөв хийж буй видео бичлэгийг ХАБЭА дүрмийн дагуу бэлтгэж ирүүлнэ үү.',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
      isCBTRequired: true,
      maxScore: 40.0,
      lessonId: lessonAgr2.id,
    },
  });

  const rubric1 = await prisma.rubric.create({
    data: {
      assignmentId: assignment.id,
      title: 'ХАБЭА дүрэм мөрдөлт (30%)',
      weight: 30.0,
    },
  });

  const rubric2 = await prisma.rubric.create({
    data: {
      assignmentId: assignment.id,
      title: 'Багаж бэлтгэл ба ариутгал (30%)',
      weight: 30.0,
    },
  });

  const rubric3 = await prisma.rubric.create({
    data: {
      assignmentId: assignment.id,
      title: 'Тарилгын гүйцэтгэх технологи (40%)',
      weight: 40.0,
    },
  });

  await prisma.rubricCriteria.createMany({
    data: [
      {
        rubricId: rubric1.id,
        description: 'Хамгаалалтын бээлий, маск, ажлын хувцас бүрэн өмссөн байдал',
        points: 10.0,
      },
      {
        rubricId: rubric2.id,
        description: 'Шприц, тарианы шилийг зөв ариутгаж зүүг угсарсан байдал',
        points: 10.0,
      },
      {
        rubricId: rubric3.id,
        description: 'Булчингийн тарилга хийх хүзүүний хэсгийг зөв сонгон 90 градусын өнцгөөр тарьсан байдал',
        points: 20.0,
      },
    ],
  });

  console.log('CBT Assignment Rubrics and Criteria seeded successfully');

  // 11. Enroll Students in Courses
  await prisma.enrollment.createMany({
    data: [
      {
        type: 'CLASS_BATCH',
        courseId: courseAgr.id,
        studentId: userStudentAgr.id,
        classGroupId: classAgr3A.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
        isActive: true,
      },
      {
        type: 'CLASS_BATCH',
        courseId: courseEle.id,
        studentId: userStudentEle.id,
        classGroupId: classEle2B.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year
        isActive: true,
      },
    ],
  });

  console.log('Students enrolled in pilot courses successfully');

  // 12. Create Seed Messages
  await prisma.message.createMany({
    data: [
      {
        content: 'Сайн байна уу, багшаа? Маргаашийн малын эмнэлгийн дадлага дээр ямар багаж бэлдэх вэ?',
        senderId: userStudentAgr.id,
        receiverId: userTeacher.id,
        courseId: courseAgr.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        content: 'Сайн уу? Дадлагад хэрэглэх мэс заслын болон боолтын иж бүрдэл багаж бэлдээрэй. Мөн ХАБЭА хувцасаа өмсөхөө мартав аа.',
        senderId: userTeacher.id,
        receiverId: userStudentAgr.id,
        courseId: courseAgr.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1 hour ago
      },
      {
        content: 'Ойлголоо багшаа, бэлдчихлээ.',
        senderId: userStudentAgr.id,
        receiverId: userTeacher.id,
        courseId: courseAgr.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      },
      // Student and Student chat (classmate chat)
      {
        content: 'Цахилгаан монтажийн даалгавраа хийсэн үү? Хэцүү байна уу?',
        senderId: userStudentEle.id,
        receiverId: userStudentAgr.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
      },
      {
        content: 'Аа хийсэн шүү, малын эмчийн дадлагын дэвтэр бас бичих ажилтай байгаад байна.',
        senderId: userStudentAgr.id,
        receiverId: userStudentEle.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
      }
    ]
  });

  // 13. Create Seed Announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Улирлын нэгдсэн шалгалтын хуваарь гарлаа',
        content: 'Хүндэт багш, сурагчид аа, энэ улирлын онол болон практикийн нэгдсэн үнэлгээнүүд ирэх сарын 1-нээс эхэлнэ. Бэлтгэлээ бүрэн хангана уу.',
        senderId: userManager.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      },
      {
        title: 'Барилгын цахилгааны ангид зориулсан ХАБЭА зааварчилгаа',
        content: 'Барилгын цахилгаан монтаж 2B ангийнханд зориулсан дадлагын талбай дээрх аюулгүй ажиллагааны зааварчилгааг системд орууллаа. Заавал уншиж танилцана уу.',
        senderId: userManager.id,
        targetRole: Role.STUDENT,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
      }
    ]
  });

  console.log('Seed messages and announcements created successfully');
  console.log('Database Seeding finished successfully! 🚀');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
