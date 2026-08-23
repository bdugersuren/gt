# GURVAN TAMIR POLYTECHNIC COLLEGE LMS - TECHNICAL SPECIFICATION & ARCHITECTURE SPECIFICATION (GEMINI.MD)
# Version: 2.1.0 (Production Dual-Network & Reverse-Proxy Ready)

## 1. PROJECT OVERVIEW & BRANDING INTEGRATION
- **Target Organization**: Gurvan Tamir Polytechnic College (Архангай аймаг дахь "Гурвантамир" Политехник Коллеж)
- **Domain**: https://gurvantamir.know.mn
- **Frontend Port Mapping**: Exposed on Host Port `3001:3000` (Connecting to host `shared-net` bridge for central reverse proxy/Nginx routing).
- **Purpose**: A specialized, competency-based Distance & Blended Learning Management System (LMS) engineered for Vocational Education and Training (VET / TVET) & Polytechnic colleges in Mongolia.
- **Key Educational Pillars**:
  - **CBT / CBA Compliance**: Full support for Competency-Based Training & Assessment standard (Чадамжид суурилсан сургалт, үнэлгээний систем).
  - **Dual-Training System (Хосмог тогтолцоо)**: Direct integration with industry partners, enterprise mentors, and on-site internship verification.
  - **Offline & Low-Bandwidth Resilience**: Offline-first architecture for students in rural bag/soum areas.
- **Design System & Visual Identity**:
  - Primary Accent: Deep Navy Blue (`#1E3A8A` / `#0F172A`)
  - Secondary Accent: Emerald Green / Teal (`#0D9488` / `#059669`)
  - Warm Background Neutral: Soft Pearl/Off-White (`#F8FAFC` / `#F1F5F9`)
  - Typography: Inter / Sans-serif with native Cyrillic UTF-8 (Mongolian) support.
  - Interactive components with subtle rounded borders (`rounded-xl`), soft shadows (`shadow-sm`), dark mode readiness, and responsive mobile-first UI via Tailwind CSS & Shadcn UI.

---

## 2. DUAL-NETWORK TOPOLOGY & INFRASTRUCTURE ARCHITECTURE

The deployment isolates private services inside a dedicated internal network (`lms-net`) while bridging the Next.js frontend to the host-wide shared reverse proxy network (`shared-net`).

```
┌────────────────────────────────────────────────────────────────────────┐
│   HOST REVERSE PROXY / NGINX GATEWAY (SSL Termination, Port 80/443)    │
│   Domain Target: gurvantamir.know.mn                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Proxied to Host Port 3001
════════════════════════════════════╪═════════════════════════════════════
   SHARED REVERSE PROXY NETWORK (`shared-net` - External Docker Network)
════════════════════════════════════╪═════════════════════════════════════
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    FRONTEND CONTAINER (Next.js 14+ PWA)                │
│   Container Port: 3000 | Host Port: 3001                               │
│   Networks: [ shared-net, lms-net ]                                    │
│   State: Zustand | Server Cache: TanStack Query v5 | Offline: Dexie.js │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Internal API Requests
════════════════════════════════════╪═════════════════════════════════════
   ISOLATED SECURE BACKEND NETWORK (`lms-net` - Internal Bridge Network)
════════════════════════════════════╪═════════════════════════════════════
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
┌──────▼────────────────────┐┌──────▼────────────────────┐┌──────▼────────────────────┐
│    BACKEND API SERVICE    ││    REDIS & BULLMQ QUEUE   ││   MINIO OBJECT STORAGE   │
│ Node.js/NestJS + PrismaORM││ In-memory Cache & Sessions││ S3 Media, Video & Docs   │
│ Port: 5000 (Internal Only)││ Port: 6379 (Internal Only)││ Port: 9000 (Internal Only)│
└──────┬────────────────────┘└──────┬────────────────────┘└───────────────────────────┘
       │                            │
       │ Database Access            │ Background Transcode Job
┌──────▼────────────────────┐┌──────▼────────────────────┐
│     POSTGRESQL 16+ DB     ││   FFMPEG VIDEO WORKER     │
│ Relational Schema & CBT   ││ BullMQ Worker (HLS Chunks)│
│ Port: 5432 (Internal Only)││ Network: lms-net          │
└───────────────────────────┘└───────────────────────────┘
```

### Stack Components:
- **Frontend**: Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Shadcn UI / Radix Primitives.
- **Client Data & Offline Management**:
  - **Zustand**: Lightweight global client state (Auth state, theme, playback status, active modals).
  - **TanStack Query v5 (React Query)**: Highly optimized server-state caching, optimistic updates, and background revalidation.
  - **Dexie.js (IndexedDB)**: Client-side offline cache for downloadable lectures, practical checklists, and offline sync queue.
  - **Workbox Service Worker**: PWA caching strategy for static assets and offline shell.
- **Content Rendering Pipeline**:
  - Markdown Parser (`react-markdown`, `remark-gfm`, `rehype-raw`)
  - Mathematical Notation (`KaTeX` via `rehype-katex`)
  - Flowcharts & Schematics (`Mermaid.js` dynamic client rendering)
  - Video Player: Video.js / Hls.js with multi-bitrate HLS streaming (`.m3u8`).
- **Backend API Layer**: Node.js / NestJS or Next.js Route Handlers with Prisma ORM.
- **Database**: PostgreSQL 16+ with ACID compliance, JSONB indexing, and automated backup hooks.
- **Caching & Job Queue**: Redis 7+ with BullMQ (Background tasks, video compression, notification dispatch, attendance telemetry).
- **Media Transcoder Service**: FFmpeg worker container automatically converting uploaded practical videos (1080p/4K) to low-bandwidth adaptive HLS (480p, 720p).
- **Object Storage**: MinIO (S3-compatible self-hosted secure object storage).

---

## 3. USER ROLES & PERMISSION MATRIX (RBAC)

The system enforces a 5-tier Role-Based Access Control (RBAC) customized for Mongolian Polytechnic Colleges and Dual-Training (Хосмог сургалт) partnerships:

| Feature / Module | System Admin (IT) | Academic Manager (Сургалтын алба) | Teacher (Багш) | Enterprise Mentor (Дадлага удирдагч) | Student (Суралцагч) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Server Logs & System Security | **FULL** | None | None | None | None |
| DB Backup & Disaster Recovery | **FULL** | None | None | None | None |
| Batch User Import (ESIS/Excel) | Read/Write | **FULL** | None | None | None |
| Academic Plan, Terms & Classes | Read | **FULL** | None | None | None |
| Course & Section Management | Read | **FULL** | Read/Update | None | None |
| Content Creation (MD, Video) | Read | Read | **FULL** | None | Read |
| Question Bank & CBT Rubrics | None | Read | **FULL** | None | None |
| Theory Homework & Quiz Grading | None | Read | **FULL** | None | Submit/Self |
| Practical Skill & Video Assessment | None | Audit | **FULL** | **Mentor Sign-off** | Upload Evidence |
| On-site Internship Logbook (Дадлага) | Read | Audit | Read/Approve | **Direct Review** | Daily Fill |
| Micro-Credentials & Skill Badges | Read | **Issue/Audit** | Recommend | Validate | Earn / View |
| Analytics & Official Transcript | System-wide | College-wide | Class-wide | Assigned Interns | Personal Only |

---

## 4. CORE TVET & POLYTECHNIC SPECIALIZED MODULES

### 1. Competency-Based Training & Assessment (CBT / CBA Engine)
- **Standard**: Full alignment with Mongolian TVET Competency Standards (Чадамжийн нэгж, Чадамжийн элемент).
- **Evaluation Outputs**:
  - `COMPETENT (C)`: All critical rubric performance criteria met.
  - `NOT_YET_COMPETENT (NYC)`: Requires targeted remediation.
- **Re-Assessment Workflow (Дахин үнэлгээний урсгал)**: Allows students receiving NYC to resubmit failed elements with instructor feedback without invalidating previously passed units.

### 2. Dual-Track Practical & Theoretical Assessment with Rubrics
- **Theory Track**: Auto-graded quizzes, formula checks (KaTeX), interactive flashcards.
- **Practical Track**: Video/Photo evidence submission (e.g., хөдөлгүүрийн оношилгоо, цахилгаан угсралт, мал эмнэлгийн анхан шатны тусламж).
- **Rubric Matrix**: Multi-criteria weighted rubrics (e.g., ХАБЭА дүрэм мөрдөлт 30%, Багаж зөв сонголт 30%, Технологийн гүйцэтгэл 40%). Includes time-stamped video annotations by instructors.

### 3. Enterprise Mentor & On-Site Internship Portal (Үйлдвэрлэлийн дадлагын дэвтэр)
- Designated login for industry engineers and supervisors (`ENTERPRISE_MENTOR`).
- Real-time logging of internship hours, workplace safety compliance, and direct sign-offs on student competencies in the workplace.

### 4. Interactive Lesson Builder
- Rich Markdown with syntax highlighting and interactive components.
- Math formula rendering (`$E=mc^2$` via KaTeX).
- Flowcharts, circuit diagrams, and organizational charts via Mermaid.js.
- In-lesson interactive widgets: self-check checkpoints, matching games, and downloadable blueprints.

### 5. Multi-Bitrate Video Pipeline & Rural Bandwidth Optimization
- Automated FFmpeg transcoding upon student/teacher video upload.
- Low-bitrate HLS chunks (`.m3u8`) ensuring seamless streaming on 3G/4G cellular connections in rural soums.

### 6. Offline-First PWA (Progressive Web Application)
- Powered by Dexie.js (IndexedDB) & Service Workers.
- Allows students to cache course text, downloadable PDFs, and complete offline quizzes. Syncs background progress upon reconnecting.

### 7. ESIS / TVET-MIS Compatibility Export Engine
- Standardized data mapping for student national registry codes (РД), department codes, and semester competency transcripts for direct export to ministry databases.

---

## 5. DATABASE SCHEMA DESIGN (PRISMA ORM)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  MANAGER
  TEACHER
  ENTERPRISE_MENTOR
  STUDENT
}

enum EnrollmentType {
  INDIVIDUAL
  CLASS_BATCH
}

enum CBTStatus {
  NOT_EVALUATED
  COMPETENT           // C - Чадамж эзэмшсэн
  NOT_YET_COMPETENT   // NYC - Хараахан чадамж эзэмшээгүй
  RE_ASSESSMENT_REQ   // Дахин үнэлгээ хүссэн
}

enum SubmissionType {
  TEXT
  FILE
  LINK
  PRACTICAL_VIDEO
  PRACTICAL_PHOTO
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
  MATCHING
}

model User {
  id              String          @id @default(uuid())
  username        String          @unique
  email           String          @unique
  passwordHash    String
  fullName        String
  registerNumber  String?         // Монгол улсын Регистрийн дугаар (ESIS нийцэл)
  code            String          @unique // Student / Staff ID Code
  role            Role            @default(STUDENT)
  avatarUrl       String?
  phone           String?
  companyName     String?         // Дадлага олгогч ААН-ийн нэр (Enterprise Mentors)
  departmentId    String?
  department      Department?     @relation(fields: [departmentId], references: [id])
  classGroupId    String?
  classGroup      ClassGroup?     @relation(fields: [classGroupId], references: [id])
  enrollments     Enrollment[]
  teachingCourses Course[]        @relation("CourseTeacher")
  submissions     Submission[]
  rubricScores    RubricScore[]
  quizAttempts    QuizAttempt[]
  internshipLogs  InternshipLog[] @relation("StudentInternship")
  mentorLogs      InternshipLog[] @relation("MentorReviewed")
  progressLogs    ProgressLog[]
  auditLogs       AuditLog[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([role, departmentId])
}

model Department {
  id          String       @id @default(uuid())
  name        String       // e.g., Хөдөө аж ахуй, Мэдээлэл технологи, Гагнуур
  code        String       @unique
  users       User[]
  courses     Course[]
  classes     ClassGroup[]
  createdAt   DateTime     @default(now())
}

model ClassGroup {
  id           String       @id @default(uuid())
  name         String       // e.g., Малын эмч 3A, Барилгын цахилгаан 2B
  code         String       @unique
  academicYear String       // e.g., "2025-2026"
  departmentId String
  department   Department   @relation(fields: [departmentId], references: [id])
  students     User[]
  enrollments  Enrollment[]
  createdAt    DateTime     @default(now())
}

model Course {
  id           String         @id @default(uuid())
  title        String
  code         String         @unique // e.g., VET-AGR-201
  description  String?
  coverImage   String?
  isCBT        Boolean        @default(true) // Чадамжид суурилсан эсэх
  departmentId String
  department   Department     @relation(fields: [departmentId], references: [id])
  teacherId    String
  teacher      User           @relation("CourseTeacher", fields: [teacherId], references: [id])
  modules      Module[]
  enrollments  Enrollment[]
  questionBank Question[]
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
}

model Enrollment {
  id           String         @id @default(uuid())
  type         EnrollmentType @default(INDIVIDUAL)
  courseId     String
  course       Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  studentId    String?
  student      User?          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classGroupId String?
  classGroup   ClassGroup?    @relation(fields: [classGroupId], references: [id], onDelete: Cascade)
  startDate    DateTime
  endDate      DateTime
  isActive     Boolean        @default(true)
  cbtStatus    CBTStatus      @default(NOT_EVALUATED)
  createdAt    DateTime       @default(now())

  @@index([studentId, courseId])
}

model Module {
  id          String       @id @default(uuid())
  title       String       // e.g., "Чадамжийн нэгж 1: Хөдөлгүүрийн засвар"
  order       Int
  courseId    String
  course      Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons     Lesson[]
  createdAt   DateTime     @default(now())
}

model Lesson {
  id             String             @id @default(uuid())
  title          String             // e.g., "Чадамжийн элемент 1.1: Аюулгүй ажиллагаа"
  order          Int
  contentType    String             // MARKDOWN, VIDEO_HLS, PDF, QUIZ, PRACTICAL_LAB
  contentBody    String?            // Markdown text with KaTeX / Mermaid
  videoUrl       String?            // Master / HLS Manifest URL (.m3u8)
  pdfUrl         String?            // MinIO PDF object URL
  moduleId       String
  module         Module             @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  prerequisites  LessonPrerequisite[] @relation("DependentLesson")
  requiredFor    LessonPrerequisite[] @relation("RequiredLesson")
  assignments    Assignment[]
  quizzes        Quiz[]
  progressLogs   ProgressLog[]
  createdAt      DateTime           @default(now())
}

model LessonPrerequisite {
  id             String   @id @default(uuid())
  lessonId       String
  lesson         Lesson   @relation("DependentLesson", fields: [lessonId], references: [id], onDelete: Cascade)
  prerequisiteId String
  prerequisite   Lesson   @relation("RequiredLesson", fields: [prerequisiteId], references: [id], onDelete: Cascade)

  @@unique([lessonId, prerequisiteId])
}

model Assignment {
  id             String         @id @default(uuid())
  title          String
  description    String         // Markdown instructions & safety warnings
  dueDate        DateTime
  isCBTRequired  Boolean        @default(true)
  maxScore       Float          @default(100)
  lessonId       String
  lesson         Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  rubrics        Rubric[]
  submissions    Submission[]
  createdAt      DateTime       @default(now())
}

model Rubric {
  id           String           @id @default(uuid())
  assignmentId String
  assignment   Assignment       @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  title        String           // e.g., "ХАБЭА мөрдөлт", "Багаж тохируулга"
  weight       Float            // Percentage weight (e.g., 30.0)
  criteria     RubricCriteria[]
}

model RubricCriteria {
  id           String        @id @default(uuid())
  rubricId     String
  rubric       Rubric        @relation(fields: [rubricId], references: [id], onDelete: Cascade)
  description  String        // Detail of standard to achieve
  points       Float         // Max points for this criteria
  scores       RubricScore[]
}

model Submission {
  id           String         @id @default(uuid())
  type         SubmissionType @default(FILE)
  content      String?
  fileUrl      String?        // MinIO Object URL (Raw or Transcoded)
  hlsStreamUrl String?        // If video, HLS streaming path
  score        Float?         // Numerical score
  cbtResult    CBTStatus      @default(NOT_EVALUATED)
  feedback     String?        // Teacher or Mentor notes
  studentId    String
  student      User           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  assignmentId String
  assignment   Assignment     @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  rubricScores RubricScore[]
  submittedAt  DateTime       @default(now())
}

model RubricScore {
  id           String         @id @default(uuid())
  submissionId String
  submission   Submission     @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  criteriaId   String
  criteria     RubricCriteria @relation(fields: [criteriaId], references: [id], onDelete: Cascade)
  scoreEarned  Float
  evaluatorId  String
  evaluator    User           @relation(fields: [evaluatorId], references: [id])
}

model Question {
  id            String         @id @default(uuid())
  courseId      String
  course        Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  text          String         // Markdown & KaTeX supported
  type          QuestionType   @default(MULTIPLE_CHOICE)
  optionsJson   Json           // Array of option objects
  correctAnswer String
  explanation   String?
  points        Float          @default(1.0)
  quizQuestions QuizQuestion[]
  createdAt     DateTime       @default(now())
}

model Quiz {
  id            String         @id @default(uuid())
  title         String
  timeLimitMin  Int            @default(30)
  passScore     Float          @default(60.0)
  lessonId      String
  lesson        Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  quizQuestions QuizQuestion[]
  attempts      QuizAttempt[]
  createdAt     DateTime       @default(now())
}

model QuizQuestion {
  id         String   @id @default(uuid())
  quizId     String
  quiz       Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  order      Int      @default(1)

  @@unique([quizId, questionId])
}

model QuizAttempt {
  id          String   @id @default(uuid())
  quizId      String
  quiz        Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  studentId   String
  student     User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  score       Float
  passed      Boolean
  cbtResult   CBTStatus @default(NOT_EVALUATED)
  answersJson Json
  startedAt   DateTime @default(now())
  completedAt DateTime @default(now())

  @@index([studentId, quizId])
}

model InternshipLog {
  id            String    @id @default(uuid())
  studentId     String
  student       User      @relation("StudentInternship", fields: [studentId], references: [id], onDelete: Cascade)
  mentorId      String?
  mentor        User?     @relation("MentorReviewed", fields: [mentorId], references: [id])
  logDate       DateTime
  hoursWorked   Float
  workSummary   String    // Өдөрт хийсэн ажлын тайлан
  safetyFollowed Boolean  @default(true) // ХАБЭА дүрэм мөрдсөн эсэх
  mentorFeedback String?  // ААН-ийн менторын үнэлгээ, сэтгэгдэл
  isApproved    Boolean   @default(false)
  createdAt     DateTime  @default(now())
}

model ProgressLog {
  id           String   @id @default(uuid())
  studentId    String
  student      User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  lessonId     String
  lesson       Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  completed    Boolean  @default(false)
  timeSpentSec Int      @default(0)
  lastAccess   DateTime @default(now())

  @@unique([studentId, lessonId])
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action    String   // USER_IMPORT, GRADE_CHANGE, CBT_CERT_ISSUE
  details   Json?
  ipAddress String?
  timestamp DateTime @default(now())
}
```

---

## 6. PROJECT REPOSITORY & CODEBASE LAYOUT

```
pk/
├── docker-compose.yml              # Production Compose (Port 3001, shared-net & lms-net)
├── docker-compose.dev.yml          # Local development hot-reload compose
├── .env.example                    # Production & Local Environment Variables
├── .gitignore                      # Git ignore file
├── README.md                       # Installation and Server Runbook
├── GEMINI.md                       # Technical architecture & specification
│
├── frontend/                       # Next.js 14+ App Router (PWA Client)
│   ├── Dockerfile                  # Standalone multi-stage production build
│   ├── Dockerfile.dev              # Development build
│   ├── package.json
│   ├── next.config.js              # Output: standalone, port configuration
│   ├── tailwind.config.js          # Brand styling theme
│   ├── tsconfig.json
│   ├── public/                     # Icons, PWA manifest.json, branding
│   └── src/
│       ├── app/                    # Next.js App Router (Layouts & Pages)
│       ├── components/             # Shadcn UI & CBT components
│       ├── store/                  # Zustand state stores
│       ├── lib/                    # Dexie.js (Offline DB), TanStack Query client
│       ├── types/                  # TypeScript definitions
│       └── styles/                 # Global styling
│
├── backend/                        # Node.js API Service & Business Logic
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma           # Full VET/CBT database schema
│   │   ├── migrations/             # Migration versions
│   │   └── seed.ts                 # Initial admin, department, course seeder
│   └── src/
│       ├── controllers/            # REST API endpoints
│       ├── services/               # Auth, CBT calculator, S3 MinIO, ESIS batch import
│       ├── queues/                 # BullMQ producers (Video transcoding, Audit logs)
│       ├── middlewares/            # RBAC validation & JWT interceptors
│       └── utils/                  # Telemetry & validation helpers
│
├── workers/                        # Background Microservices
│   ├── transcoder/                 # FFmpeg automated video compressor & HLS builder
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/worker.ts           # BullMQ consumer for video processing
│
├── postgres/                       # PostgreSQL Database configuration
│   ├── Dockerfile
│   ├── init.sql
│   └── postgresql.conf             # Performance tuning (memory, connections)
│
├── redis/                          # Redis cache & message broker
│   ├── Dockerfile
│   └── redis.conf                  # Persistence & eviction policies
│
├── minio/                          # S3-compatible media storage
│   ├── Dockerfile
│   └── create-buckets.sh           # Auto-creates 'videos', 'docs', 'avatars' buckets
│
└── docs/                           # Documentation
    ├── README.md
    ├── TASKS.md                    # Active sprint tasks & development status
    ├── adr/                        # Architecture Decision Records
    └── devops/
        └── backup-and-restore.md   # DB & Object storage backup runbook
```

---

## 7. PRODUCTION DOCKER COMPOSE CONFIGURATION (SHARED-NET & LMS-NET)

```yaml
version: '3.8'

services:
  # 1. Frontend Application (Next.js SSR + PWA)
  # Connected to both shared-net (for host proxy) and lms-net (for internal APIs)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: pk_frontend
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3000
      NEXT_PUBLIC_APP_URL: https://gurvantamir.know.mn
      NEXT_PUBLIC_API_URL: https://gurvantamir.know.mn/api
      INTERNAL_API_URL: http://backend:5000
    ports:
      - "3001:3000"
    networks:
      - shared-net
      - lms-net
    depends_on:
      - backend

  # 2. Backend API Service (Node.js/NestJS + Prisma)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pk_backend
    restart: always
    depends_on:
      - postgres
      - redis
      - minio
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      PUBLIC_APP_URL: https://gurvantamir.know.mn
    expose:
      - "5000"
    networks:
      - lms-net

  # 3. FFmpeg Video Transcoder Worker (BullMQ Consumer)
  transcoder_worker:
    build:
      context: ./workers/transcoder
      dockerfile: Dockerfile
    container_name: pk_transcoder
    restart: always
    depends_on:
      - redis
      - minio
    environment:
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
    networks:
      - lms-net

  # 4. Relational Database (Isolated internal network)
  postgres:
    build:
      context: ./postgres
      dockerfile: Dockerfile
    container_name: pk_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    expose:
      - "5432"
    networks:
      - lms-net

  # 5. Redis Cache & Job Broker (Isolated internal network)
  redis:
    build:
      context: ./redis
      dockerfile: Dockerfile
    container_name: pk_redis
    restart: always
    volumes:
      - redis_data:/data
    expose:
      - "6379"
    networks:
      - lms-net

  # 6. Object Storage Service (MinIO S3 - Isolated internal network)
  minio:
    build:
      context: ./minio
      dockerfile: Dockerfile
    container_name: pk_minio
    restart: always
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    expose:
      - "9000"
      - "9001"
    networks:
      - lms-net

networks:
  # Internal network isolated for LMS micro-services and DB
  lms-net:
    driver: bridge
    name: pk_lms_net

  # External network shared with the host reverse proxy (Nginx / Traefik)
  shared-net:
    external: true
    name: shared-net

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 8. SERVER QUICK-START & DEPLOYMENT RUNBOOK

### Step 1: Ensure Host Network Exists
Before starting the containers, verify that the `shared-net` Docker network exists on the host server:
```bash
docker network inspect shared-net >/dev/null 2>&1 || docker network create shared-net
```

### Step 2: Environment Configuration
Copy and configure the `.env` file:
```bash
cp .env.example .env
# Edit secrets, database passwords, and MinIO credentials
nano .env
```

### Step 3: Launch Containers
```bash
docker compose up -d --build
```

### Step 4: Run Initial DB Migrations & Seeder
```bash
docker exec -it pk_backend npx prisma migrate deploy
docker exec -it pk_backend npm run seed
```

### Step 5: Host Reverse Proxy Nginx Configuration (`gurvantamir.know.mn`)
Add the following block to your host server's Nginx configuration:
```nginx
server {
    listen 80;
    server_name gurvantamir.know.mn;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gurvantamir.know.mn;

    ssl_certificate /etc/letsencrypt/live/gurvantamir.know.mn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gurvantamir.know.mn/privkey.pem;

    client_max_body_size 500M;

    location / {
        # Proxies directly to frontend on port 3001 or via shared-net
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 9. STEP-BY-STEP IMPLEMENTATION ROADMAP (12 WEEKS)

```
  Phase 1: Foundation & Dual-Network Infrastructure (Weeks 1-2)
  ├─ Verify host shared-net integration & local lms-net isolation
  ├─ Deploy Docker Compose stack (Port 3001, Postgres, Redis, MinIO)
  ├─ Apply schema.prisma (CBT, Rubrics, RBAC, DAG Prerequisites)
  └─ Establish Next.js 14 frontend skeleton with Shadcn UI & Tailwind brand theme

  Phase 2: Authentication, RBAC & Batch Student Importer (Weeks 3-4)
  ├─ Multi-role JWT Auth (Admin, Manager, Teacher, Enterprise Mentor, Student)
  ├─ ESIS/TVET-MIS compatible Excel/CSV batch import engine (with RegNo validation)
  ├─ Department, Class Group, and Course allocation dashboard
  └─ Audit logging interceptor for administrative tracking

  Phase 3: Content Builder & Media Streaming Pipeline (Weeks 5-6)
  ├─ Rich Markdown lesson editor (KaTeX formula + Mermaid flowchart support)
  ├─ Interactive widget components (Checkpoints, Flashcards, Blueprints)
  ├─ Build BullMQ + FFmpeg transcoder service (auto HLS chunking for rural 3G/4G)
  └─ Prerequisite DAG verification middleware

  Phase 4: CBT Assessment & Enterprise Mentor System (Weeks 7-8)
  ├─ Question Bank & Quiz Engine (MCQ, True/False, Matching)
  ├─ Dual-track Practical Assignment Engine with Multi-Criteria Rubric Scoring
  ├─ Competency evaluation workflow (Competent / Not Yet Competent / Re-assessment)
  └─ Enterprise Mentor Portal & On-site Internship Logbook (Дадлагын дэвтэр)

  Phase 5: Offline PWA & Rural Optimization (Weeks 9-10)
  ├─ Zustand + TanStack Query server-state architecture
  ├─ Dexie.js (IndexedDB) offline lesson notes & quiz caching engine
  ├─ Background Sync service worker for automatic progress synchronization
  └─ Low-bandwidth mode (Text-first view for soum students)

  Phase 6: Pilot Testing, Hardening & Launch (Weeks 11-12)
  ├─ Pilot launch with 2 Departments: Хөдөө аж ахуй (Мал эмнэлэг) & Цахилгаан
  ├─ Host Nginx SSL verification & Rate Limiting tests
  ├─ Disaster recovery test & automated backup cron jobs
  └─ Production Go-Live at https://gurvantamir.know.mn
```
