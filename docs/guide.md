# Гурвантамир LMS-ийг ажиллуулах дэлгэрэнгүй заавар

Энэ баримт нь системийг Docker Compose ашиглан development, staging болон production орчинд ажиллуулах, менежерээр нэвтрэх, курс үүсгэх, багш хуваарилах, ажиллагааг шалгах үндсэн заавар юм.

> **Өгөгдөл хамгаалах санамж:** өгөгдөлтэй орчинд `docker compose down -v` тушаалыг хэзээ ч бүү ажиллуул. `-v` нь PostgreSQL, Redis, MinIO volume-уудыг устгаж болзошгүй.

## 1. Шаардлагатай програм

Host сервер дээр дараах зүйлс бэлэн байна:

- Linux сервер эсвэл Docker Desktop;
- Docker Engine 24 буюу түүнээс шинэ;
- Docker Compose v2 (`docker compose` тушаал);
- Git;
- development орчинд хамгийн багадаа 4 GB RAM, видео хөрвүүлэх бол 6–8 GB RAM;
- production орчинд domain, HTTPS reverse proxy болон off-host backup.

Хувилбарыг шалгах:

```bash
docker --version
docker compose version
git --version
```

Repository-ийн үндсэн хавтас руу орно:

```bash
cd /home/bd/gt
```

Доорх бүх Compose тушаалыг энэ хавтсаас ажиллуулна.

## 2. Environment тохиргоо

`.env` байхгүй шинэ орчинд template-ээс үүсгэнэ:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Дараах утгуудыг заавал өөрчилнө:

- `POSTGRES_PASSWORD` — PostgreSQL-ийн урт, давтагдашгүй нууц үг;
- `REDIS_PASSWORD` — production Redis-ийн нууц үг;
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` — object storage credential;
- `JWT_SECRET` — хамгийн багадаа 32 тэмдэгттэй random secret;
- `TRANSCODER_SHARED_SECRET` — backend болон worker хоорондын callback secret;
- `CORS_ORIGINS` — frontend-ийн HTTPS origin;
- `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `PUBLIC_APP_URL` — бодит domain;
- `SEED_*_PASSWORD` — зөвхөн шинэ development/test өгөгдөл үүсгэх нууц үг.

Random secret үүсгэх жишээ:

```bash
openssl rand -hex 32
```

`.env`-ийг Git-д commit хийж болохгүй. Бодит secret-ийг чат, log, screenshot эсвэл баримт бичигт хуулж болохгүй.

## 3. Development орчныг ажиллуулах

Development compose дараах хаягуудыг localhost-д нээнэ:

| Үйлчилгээ | Хаяг |
|---|---|
| Frontend | `http://localhost:3001` |
| Backend API | `http://127.0.0.1:5000/api` |
| Backend readiness | `http://127.0.0.1:5000/api/health/ready` |
| MinIO API | `http://127.0.0.1:9000` |
| MinIO Console | `http://127.0.0.1:9001` |
| PostgreSQL | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |

### 3.1 Docker network бэлтгэх

`docker-compose.dev.yml` нь reverse proxy-д зориулсан external `shared-net` сүлжээ шаарддаг:

```bash
docker network inspect shared-net >/dev/null 2>&1 || docker network create shared-net
```

### 3.2 Контейнерүүдийг асаах

Анх удаа эсвэл Dockerfile/dependency өөрчлөгдсөн бол:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Image дахин build хийх шаардлагагүй энгийн асаалт:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Төлөв шалгах:

```bash
docker compose -f docker-compose.dev.yml ps
```

Хэвийн үед дараах зургаан service ажиллана:

- `frontend`;
- `backend`;
- `transcoder_worker`;
- `postgres`;
- `redis`;
- `minio`.

### 3.3 Health болон log шалгах

```bash
curl -fsS http://127.0.0.1:5000/api/health/live
curl -fsS http://127.0.0.1:5000/api/health/ready
```

Readiness хариуны dependency бүр `ok` байх ёстой:

```json
{
  "status": "ready",
  "checks": {
    "postgres": "ok",
    "redis": "ok",
    "minio": "ok"
  }
}
```

Сүүлийн log-уудыг харах:

```bash
docker compose -f docker-compose.dev.yml logs --tail=100 backend
docker compose -f docker-compose.dev.yml logs --tail=100 frontend
docker compose -f docker-compose.dev.yml logs --tail=100 transcoder_worker
```

Log-ийг тасралтгүй дагах:

```bash
docker compose -f docker-compose.dev.yml logs -f backend frontend
```

Зогсоохдоо `-v` хэрэглэхгүй:

```bash
docker compose -f docker-compose.dev.yml down
```

## 4. Өгөгдлийн сан бэлтгэх

### 4.1 Өмнө нь өгөгдөлтэй ажиллаж буй орчин

Одоо ашиглаж буй volume-д өгөгдөл байгаа бол seed, `prisma db push`, migration resolve-ийг дур мэдэн ажиллуулахгүй. Эхлээд:

```bash
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate status
```

Live өгөгдлийн сан migration history-гүй baseline төлөвтэй бол [operations-runbook.md](./operations-runbook.md)-ийн backup болон baseline gate-ийг мөрдөнө. Backup баталгаажаагүй live DB дээр `prisma migrate deploy` ажиллуулахгүй.

### 4.2 Шинэ, хоосон development орчин

Шинэ хоосон database-д migration deploy хийж болно:

```bash
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy
```

Туршилтын хэрэглэгч, тэнхим, курс үүсгэх seed нь таван `SEED_*_PASSWORD` хувьсагчийг шаарддаг. `.env`-ийг shell-д export хийгээд seed ажиллуулна:

```bash
set -a
. ./.env
set +a
docker compose -f docker-compose.dev.yml exec \
  -e SEED_ADMIN_PASSWORD \
  -e SEED_MANAGER_PASSWORD \
  -e SEED_TEACHER_PASSWORD \
  -e SEED_MENTOR_PASSWORD \
  -e SEED_STUDENT_PASSWORD \
  backend npm run seed
unset SEED_ADMIN_PASSWORD SEED_MANAGER_PASSWORD SEED_TEACHER_PASSWORD SEED_MENTOR_PASSWORD SEED_STUDENT_PASSWORD
```

Seed-ийг production орчинд ажиллуулахыг кодоор хориглосон. Seed нь зөвхөн шинэ development/test орчинд зориулагдсан.

## 5. Менежерийн хэсгийг ашиглах

### 5.1 Нэвтрэх

1. Browser-оор `http://localhost:3001/login` нээнэ.
2. Seed ашигласан бол хэрэглэгчийн нэрийг `manager`, нууц үгийг `.env` дэх `SEED_MANAGER_PASSWORD` утгаар оруулна.
3. Олон эрхтэй хэрэглэгч бол эрх сонгох дэлгэцээс `MANAGER` сонгоно.
4. Амжилттай нэвтэрсний дараа `/manager` dashboard нээгдэнэ.

Менежерийн sidebar дараах тусдаа хуудсуудтай:

| Хуудас | Route | Зориулалт |
|---|---|---|
| Хянах самбар | `/manager` | Курс, багш, суралцагч, эрсдэлийн товч үзүүлэлт |
| Курсын удирдлага | `/manager/courses` | Курс хайх, тэнхим/багшаар шүүх |
| Шинэ курс | `/manager/courses/new` | Курс, тэнхим, үндсэн багшийг атомик үүсгэх |
| Багш хуваарилах | `/manager/courses/{courseId}/teachers` | Нэг буюу олон багшийн холбоос шинэчлэх |
| Суралцагч бүртгэх | `/manager/enrollments` | Суралцагчийг хугацаатай курст бүртгэх |
| Зарлан мэдээлэл | `/manager/announcements` | Нийт эсвэл role-д зориулсан зарлал |
| Явц ба эрсдэл | `/manager/risks` | Dropout risk оноо, төлөв |

### 5.2 Шинэ курс үүсгэх

1. `Курсын удирдлага` → `Шинэ курс` сонгоно.
2. Курсын нэр оруулна.
3. 2–20 тэмдэгттэй, давхардахгүй курсын код оруулна. Код автоматаар том үсэг болно.
4. API-аас ирсэн бодит тэнхим сонгоно.
5. `TEACHER` эрхтэй үндсэн багш сонгоно.
6. CBT курс эсэхийг сонгоно.
7. Тайлбар оруулаад `Курс үүсгэх` дарна.

Амжилттай бол курсын жагсаалт руу буцаж, шинээр үүссэн курс харагдана. Курс багшгүй үүсэхгүй: анхны багш course create үйлдэлтэй хамт холбогдоно.

Түгээмэл алдаа:

- `400` — заавал бөглөх талбар дутуу эсвэл ID буруу;
- `401` — token дууссан, дахин нэвтэрнэ;
- `403` — идэвхтэй эрх `MANAGER` биш;
- `404` — сонгосон тэнхим эсвэл багш олдохгүй;
- `409` — курсын код давхардсан;
- `500` — backend log болон request ID-г шалгана.

### 5.3 Курст багш нэмэх, өөрчлөх

1. `/manager/courses` жагсаалтаас курсээ олно.
2. `Багш өөрчлөх` товч дарна.
3. Нэг буюу олон багш сонгоно.
4. `Холболтыг хадгалах` дарна.
5. Амжилтын мэдэгдэл гарсны дараа хуудсыг refresh хийж сонголт хадгалагдсаныг шалгана.

Хамгийн багадаа нэг багш заавал үлдэнэ. Давхардсан, байхгүй эсвэл `TEACHER` эрхгүй хэрэглэгчийн ID-г backend зөвшөөрөхгүй.

## 6. Код өөрчилсний дараах шалгалт

Prisma Client generate болон backend build:

```bash
docker compose -f docker-compose.dev.yml exec backend npm run prisma:generate
docker compose -f docker-compose.dev.yml exec backend npm run build
```

Frontend type-check болон production build:

```bash
docker compose -f docker-compose.dev.yml exec frontend npx tsc --noEmit
docker compose -f docker-compose.dev.yml run --rm --no-deps \
  -e NODE_ENV=production frontend npm run build
```

Production build-ийг ажиллаж буй `frontend` dev container дотор бүү ажиллуул. `next build` болон `next dev` нэг `.next` cache хуваалцвал webpack chunk зөрж, `Cannot find module './xxxx.js'` гэсэн 500 алдаа гардаг. Дээрх `docker compose run --rm` тушаал build-ийг тусдаа түр container болон тусдаа `.next` volume дотор ажиллуулна.

Backend-ийн course request log шалгах:

```bash
docker compose -f docker-compose.dev.yml logs --tail=200 backend
```

Course create болон assignment амжилттай үед log-д ойролцоогоор дараах бүтэц харагдана:

```json
{
  "requestId": "uuid",
  "method": "POST",
  "route": "/api/courses",
  "status": 201,
  "latencyMs": 12,
  "userId": "uuid",
  "activeRole": "MANAGER"
}
```

Нууц үг, JWT token болон request body log-д хэвлэгдэх ёсгүй.

## 7. Staging орчин

Staging нь production compose дээр localhost port override нэмж, тусдаа Compose project/volume ашиглана:

Эхлээд production secret-ээс тусдаа staging тохиргоо үүсгэж, database/Redis/MinIO/JWT credential бүрийг өөр утгатай болгоно:

```bash
cp .env.example .env.staging
chmod 600 .env.staging
nano .env.staging
```

Local staging шалгалтад `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3101`, `NEXT_PUBLIC_API_URL=http://127.0.0.1:5100/api`, `PUBLIC_APP_URL=http://127.0.0.1:3101`, `CORS_ORIGINS=http://127.0.0.1:3101` гэж тохируулна. Domain ашиглах бол эдгээрийг staging HTTPS domain-оор солино.

```bash
docker network inspect shared-net >/dev/null 2>&1 || docker network create shared-net
docker compose \
  --project-name gt-lms-staging \
  --env-file .env.staging \
  -f docker-compose.yml \
  -f docker-compose.staging.yml \
  up -d --build
```

Default staging хаяг:

- frontend: `http://127.0.0.1:3101`;
- backend: `http://127.0.0.1:5100/api`.

Тусдаа port хэрэгтэй бол `.env.staging`-д:

```dotenv
STAGING_FRONTEND_PORT=3101
STAGING_BACKEND_PORT=5100
```

Staging verification:

```bash
set -a
. ./.env.staging
set +a
COMPOSE_PROJECT_NAME=gt-lms-staging npm run staging:verify
```

Production volume, database нэр эсвэл credential-ийг staging-д ашиглаж болохгүй.

## 8. Production орчин

Production compose нь PostgreSQL, Redis, MinIO, backend портыг host руу нийтлэхгүй. Frontend нь external `shared-net` сүлжээн дэх reverse proxy-оор HTTPS хүлээн авна.

### 8.1 Deploy-ийн өмнө

Заавал:

1. PostgreSQL болон MinIO off-host backup баталгаажсан байх;
2. staging restore test амжилттай байх;
3. `latest`/`local` бус immutable image tag сонгосон байх;
4. migration status болон rollback заавар шалгагдсан байх;
5. reverse proxy нь `shared-net`-д холбогдсон байх.

Preflight:

```bash
export OFFSITE_BACKUP_CONFIRMED=yes
export STAGING_RESTORE_CONFIRMED=yes
export IMAGE_TAG=2026.08.23-commitsha
npm run deploy:preflight
```

### 8.2 Migration болон асаалт

Backup баталгаажсаны дараа нэг удаагийн migration job:

```bash
docker compose --profile ops run --rm migrate
```

Үндсэн service-үүд:

```bash
docker compose up -d
```

Видео worker-тай хамт:

```bash
docker compose --profile media up -d
```

Production төлөв болон log:

```bash
docker compose ps
docker compose logs --tail=100 backend frontend
```

Шинэ image рүү шилжих:

```bash
export IMAGE_TAG=2026.08.24-newcommit
docker compose pull
docker compose up -d
```

Database migration хийсний дараа image rollback-ийг database rollback-той автоматаар хослуулж болохгүй. Compatible өмнөх image эсвэл staging дээр туршсан forward-fix хэрэглэнэ.

## 9. Backup

PostgreSQL backup job:

```bash
npm run backup:postgres
```

Backup хавтас өөрчлөх:

```bash
BACKUP_DIR=/absolute/backup/path npm run backup:postgres
```

Backup файлыг тухайн Docker host дээр ганцаар үлдээхгүй. SHA-256 checksum-тай нь шифрлэсэн off-host storage-д хуулна. MinIO object-уудыг мөн тусдаа S3/object-storage байршил руу authenticated client-аар хуулна.

## 10. Түгээмэл асуудал

### `network shared-net declared as external, but could not be found`

```bash
docker network create shared-net
```

### `.env` хувьсагч дутуу

Compose config-ийг шалгана:

```bash
docker compose config --quiet
```

Алдаанд нэрлэгдсэн хувьсагчийг `.env`-д тохируулна. Нууц утгыг terminal output-д хэвлэхгүй.

### Frontend API-д холбогдохгүй

- Browser developer tools-ийн Network tab-аас request URL шалгана.
- Development frontend-ийн API нь `http://localhost:5000/api` байна.
- Өөр компьютерээс серверийн dev UI руу хандахад browser дахь `localhost` нь хэрэглэгчийн өөрийн компьютерийг заадаг. Ийм нөхцөлд dev compose-ийг public болгохгүй; domain + reverse proxy бүхий staging/production ашиглана.
- Backend CORS origin нь frontend origin-тэй яг тохирсон байх ёстой.

### Frontend дээр `Cannot find module './xxxx.js'` эсвэл `/login` 500 болох

Энэ нь ихэнхдээ `next dev` болон `next build` нэг `.next` cache ашигласнаас үүснэ. Source болон өгөгдлийн volume-г устгахгүйгээр зөвхөн generated cache-ийг цэвэрлээд frontend-ийг дахин асаана:

```bash
docker compose -f docker-compose.dev.yml exec frontend \
  sh -lc 'find /app/frontend/.next -mindepth 1 -delete'
docker compose -f docker-compose.dev.yml restart frontend
```

Дараа нь production build шалгах бол 6-р хэсгийн тусгаарласан `docker compose run --rm` тушаалыг хэрэглэнэ.

### Курс үүсгэхэд `400`

- нэр болон код хоосон эсэх;
- код 2–20 тэмдэгттэй эсэх;
- тэнхим сонгосон эсэх;
- үндсэн багш сонгосон эсэх;
- сонгосон хэрэглэгч `TEACHER` эрхтэй эсэхийг шалгана.

Дараа нь request ID-гаар backend log-ийг хайна:

```bash
docker compose -f docker-compose.dev.yml logs backend | grep 'REQUEST_ID_ЭНД_ОРУУЛНА'
```

### Container restart loop

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs --tail=200 backend
docker inspect pk_backend_dev --format '{{json .State.Health}}'
```

### Prisma Client type алдаа

```bash
docker compose -f docker-compose.dev.yml exec backend npm run prisma:generate
docker compose -f docker-compose.dev.yml exec backend npm run build
```

### MinIO Console нээгдэхгүй

Development host дээр:

```bash
curl -I http://127.0.0.1:9000/minio/health/live
```

Production-д MinIO console зориудаар public биш. VPN, SSH tunnel эсвэл internal admin network ашиглана.

## 11. Аюулгүй ажиллагааны товч дүрэм

- Өгөгдөлтэй орчинд `down -v`, volume delete, `prisma migrate reset`, `prisma db push --force-reset` ажиллуулахгүй.
- Migration, MinIO upgrade, credential rotation бүрийн өмнө backup болон staging restore test хийнэ.
- Production-д seed ажиллуулахгүй.
- PostgreSQL, Redis, MinIO портыг public interface-д нээхгүй.
- JWT, database, Redis, MinIO credential бүрийг тусдаа random secret болгоно.
- Асуудал гарсан үед эхлээд health, bounded log, disk space, backup status шалгана; volume устгаж “засах” оролдлого хийхгүй.

Нэмэлт ажиллагааны заавар: [operations-runbook.md](./operations-runbook.md).
