# Хийх ажлын жагсаалт (task.md)

- [x] **1. Өгөгдлийн сангийн бүтэц шинэчлэх (Prisma DB Updates)**
  - [x] `backend/prisma/schema.prisma` дээр `Message` болон `Announcement` моделиудыг нэмэх
  - [x] `User` модель дээр `Message` болон `Announcement` холбоосуудыг нэмэх
  - [x] `Lesson` модель дээр `isApproved Boolean @default(true)` талбар нэмэх
  - [x] `DATABASE_URL=postgresql://postgres:secure_postgres_password_change_me@localhost:5432/gt_lms?schema=public npx prisma db push` ажиллуулж баазыг шинэчлэх
  - [x] `backend/node_modules` болон host-ийн `node_modules` руу Prisma Client-ийг дахин generate хийж хуулах
  - [x] `backend/prisma/seed.ts` файлыг шинэчлэн шинэ моделиудын өгөгдлийг нэмэх
  - [x] `npx prisma db seed` ажиллуулж өгөгдлийг оруулах

- [x] **2. Backend API хөгжүүлэлт (Messages & Announcements APIs)**
  - [x] Чат/Зурвасын үйлчилгээ болон контроллер хэрэгжүүлэх (`POST /messages`, `GET /messages/:userId`)
  - [x] Зарлалын үйлчилгээ болон контроллер хэрэгжүүлэх (`POST /announcements`, `GET /announcements`)
  - [x] `backend/src/app.module.ts` эсвэл харгалзах модулиудад шинэ үйлчилгээнүүдийг бүртгэх

- [x] **3. Сурагчийн Хэсэг (Student Portal - frontend)**
  - [x] `frontend/src/app/(student)/courses/[id]/page.tsx` хуудсанд "Үнэлгээ" болон "Харилцах" табуудыг нэмэх
  - [x] "Үнэлгээ" таб дээр сорил, дадлага, рубрик онооны задаргаа, багшийн feedback, CBT статусыг харуулах
  - [x] "Харилцах" таб дээр багш болон бусад оюутнуудтай чатлах интерактив хэсэг үүсгэх

- [x] **4. Менежерийн Хэсэг (Manager Portal - frontend)**
  - [x] Менежерийн layout (`frontend/src/app/manager/layout.tsx`) хамгаалалттайгаар үүсгэх
  - [x] Менежерийн нэгдсэн хянах самбар (`frontend/src/app/manager/page.tsx`) үүсгэх (хичээл үүсгэх, багш оноох, оюутан бүртгэх, явц хянах, зарлал оруулах)

- [x] **5. Багшийн Хэсэг (Teacher Portal - frontend)**
  - [x] Лекцийн агуулга (видео, аудио, PDF, markdown) оруулах болон менежерийн зөвшөөрөл шаардах тохиргоо нэмэх
  - [x] Оюутны даалгаврыг рубрикийн шалгуурын дагуу үнэлэх, санал хүсэлт өгөх, CBT статус сонгох модуль хэрэгжүүлэх
  - [x] Багшийн чатын хуудас нэмэх

- [x] **6. Менторын Хэсэг (Mentor Portal - frontend)**
  - [x] Менторын layout (`frontend/src/app/mentor/layout.tsx`) үүсгэх
  - [x] Өөрийн дадлагажигч оюутнуудын ирүүлсэн дадлагын өдрийн тэмдэглэлийг хянан үнэлж, батлах самбар (`frontend/src/app/mentor/page.tsx`) хөгжүүлэх (хуваарилагдсан оюутны дадлага үнэлэх, заавар нийтлэх, чатлах)

- [x] **7. Эдмины Хэсэг (Admin Portal - frontend)**
  - [x] Эдмины layout (`frontend/src/app/admin/layout.tsx`) үүсгэх
  - [x] Эдмины самбар (`frontend/src/app/admin/page.tsx`) үүсгэх (DB & MinIO backup, Audit Log шүүж харах, CSV-ээр оюутан/багш импортлох)

- [x] **8. Баталгаажуулалт & Build шалгалт**
  - [x] Backend болон Frontend-ийг алдаагүй build хийж шалгах
  - [x] Системийг ажиллуулж турших
