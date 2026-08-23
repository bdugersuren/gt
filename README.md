# Гурвантамир Политехник Коллеж LMS (Learning Management System)

Энэхүү систем нь Архангай аймаг дахь **"Гурвантамир" Политехник Коллеж**-д зориулан бүтээгдсэн, чадамжид суурилсан сургалт, үнэлгээ (CBT / CBA)-ний систем болон үйлдвэрлэлийн хосмог дадлага (Dual-Training)-ыг дэмжсэн зайн болон холимог сургалтын удирдлагын систем юм.

---

## 1. Системийн Технологийн Стек (Tech Stack)

* **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Shadcn UI
* **State & Cache**: Zustand, TanStack Query v5, Dexie.js (IndexedDB - offline-first)
* **Backend API**: Node.js/NestJS, Prisma ORM, PostgreSQL 16+
* **Cache & Queues**: Redis 7+, BullMQ (видео хөрвүүлэлт, audit logs)
* **Storage & Processing**: MinIO S3 Object Storage, FFmpeg (HLS .m3u8 streaming)
* **Infrastructure**: Docker, Docker Compose, Dual-Network Isolation (`shared-net` & `lms-net`)

---

## 2. Хавтасны бүтэц (Codebase Layout)

```
pk/
├── frontend/                       # Next.js 14+ PWA Client
├── backend/                        # Node.js API Service & Business Logic
├── workers/                        # Background Microservices (FFmpeg Transcoder)
├── postgres/                       # PostgreSQL Database тохиргоо
├── redis/                          # Redis cache & message broker тохиргоо
├── minio/                          # S3-compatible media storage тохиргоо
├── docs/                           # Системийн баримтжуулалт (ADR, ERD, Tasks)
├── docker-compose.yml              # Production Compose тохиргоо
└── docker-compose.dev.yml          # Local development Compose тохиргоо
```

---

## 3. Суулгах болон Ажиллуулах заавар (Setup Runbook)

### Алхам 1: Host Сүлжээг Бэлдэх
Контейнеруудыг ажиллуулахаас өмнө reverse proxy холболтод зориулж `shared-net` нэртэй Docker сүлжээ үүссэн эсэхийг шалгана:
```bash
docker network inspect shared-net >/dev/null 2>&1 || docker network create shared-net
```

### Алхам 2: Environment Тохиргоо
Холболтын нууц үг болон хаягуудыг тохируулахын тулд `.env.example` файлыг `.env` болгон хуулж засварлана:
```bash
cp .env.example .env
nano .env
```

### Алхам 3: Контейнеруудыг Эхлүүлэх
Хөгжүүлэлтийн (local development) горимд дараах тушаалаар контейнеруудыг эхлүүлнэ:
```bash
docker compose -f docker-compose.dev.yml up -d --build
```
*Эсвэл production горимд ажиллуулах бол:*
```bash
docker compose up -d --build
```

### Алхам 4: Өгөгдлийн Сангийн Шилжилт (Prisma Migrate & Seed)
Контейнер амжилттай ажиллаж эхэлсний дараа өгөгдлийн сангийн хүснэгтүүдийг үүсгэж, анхны админ болон тэнхимийн өгөгдлийг seed хийнэ:
```bash
# Prisma migration deploy хийх
docker exec -it pk_backend npx prisma migrate deploy

# Анхны өгөгдөл оруулах (Seed)
docker exec -it pk_backend npm run seed
```

---

## 4. Портын Хуваарилалт (Port Mapping)

* **Frontend**: `http://localhost:3001` (Docker дотор `3000` портыг `3001` руу гаргасан)
* **Backend API**: `http://localhost:5000`
* **MinIO Console**: `http://localhost:9001` (Console) болон `http://localhost:9000` (API)
* **PostgreSQL**: `localhost:5432` (Зөвхөн дотоод сүлжээнээс хандана)
* **Redis**: `localhost:6379` (Зөвхөн дотоод сүлжээнээс хандана)
