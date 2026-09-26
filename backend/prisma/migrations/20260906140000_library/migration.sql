CREATE TYPE "LibraryBookStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "LibraryAccessAction" AS ENUM ('VIEW', 'DOWNLOAD');

CREATE TABLE "LibraryBook" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "author" TEXT,
  "isbn" TEXT,
  "publisher" TEXT,
  "publishedYear" INTEGER,
  "language" TEXT NOT NULL DEFAULT 'mn',
  "description" TEXT,
  "coverAssetId" TEXT,
  "pdfAssetId" TEXT NOT NULL,
  "status" "LibraryBookStatus" NOT NULL DEFAULT 'DRAFT',
  "downloadAllowed" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "LibraryBook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryBookCourse" (
  "bookId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  CONSTRAINT "LibraryBookCourse_pkey" PRIMARY KEY ("bookId","courseId")
);

CREATE TABLE "LibraryBookProgram" (
  "bookId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  CONSTRAINT "LibraryBookProgram_pkey" PRIMARY KEY ("bookId","programId")
);

CREATE TABLE "LibraryCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryBookCategory" (
  "bookId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "LibraryBookCategory_pkey" PRIMARY KEY ("bookId","categoryId")
);

CREATE TABLE "LibraryTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LibraryBookTag" (
  "bookId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "LibraryBookTag_pkey" PRIMARY KEY ("bookId","tagId")
);

CREATE TABLE "LibraryBookAccessLog" (
  "id" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" "LibraryAccessAction" NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibraryBookAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryBook_isbn_key" ON "LibraryBook"("isbn");
CREATE INDEX "LibraryBook_status_createdAt_idx" ON "LibraryBook"("status","createdAt");
CREATE INDEX "LibraryBook_title_idx" ON "LibraryBook"("title");
CREATE INDEX "LibraryBook_author_idx" ON "LibraryBook"("author");
CREATE INDEX "LibraryBook_isbn_idx" ON "LibraryBook"("isbn");
CREATE INDEX "LibraryBookCourse_courseId_idx" ON "LibraryBookCourse"("courseId");
CREATE INDEX "LibraryBookProgram_programId_idx" ON "LibraryBookProgram"("programId");
CREATE UNIQUE INDEX "LibraryCategory_code_key" ON "LibraryCategory"("code");
CREATE UNIQUE INDEX "LibraryTag_name_key" ON "LibraryTag"("name");
CREATE INDEX "LibraryBookAccessLog_bookId_action_createdAt_idx" ON "LibraryBookAccessLog"("bookId","action","createdAt");
CREATE INDEX "LibraryBookAccessLog_userId_createdAt_idx" ON "LibraryBookAccessLog"("userId","createdAt");

ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_pdfAssetId_fkey" FOREIGN KEY ("pdfAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryBook" ADD CONSTRAINT "LibraryBook_coverAssetId_fkey" FOREIGN KEY ("coverAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryBookCourse" ADD CONSTRAINT "LibraryBookCourse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookCourse" ADD CONSTRAINT "LibraryBookCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookProgram" ADD CONSTRAINT "LibraryBookProgram_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookProgram" ADD CONSTRAINT "LibraryBookProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookCategory" ADD CONSTRAINT "LibraryBookCategory_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookCategory" ADD CONSTRAINT "LibraryBookCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LibraryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookTag" ADD CONSTRAINT "LibraryBookTag_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookTag" ADD CONSTRAINT "LibraryBookTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "LibraryTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookAccessLog" ADD CONSTRAINT "LibraryBookAccessLog_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibraryBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryBookAccessLog" ADD CONSTRAINT "LibraryBookAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
