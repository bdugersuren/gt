# K3s LMS туршилтын орчин

Эдгээр manifest нь нэг node-той `k3s-lab` namespace-ийн туршилтын орчинд зориулагдсан.
Docker дээр ажиллаж буй LMS болон Nginx Proxy Manager-ийг солихгүй.

## Manifest-аас гадна шаардагдах зүйлс

- `pg-test-auth`: `password`
- `redis-test-auth`: `REDIS_PASSWORD`
- `minio-test-auth`: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `backend-test-auth`: `JWT_SECRET`, `TRANSCODER_SHARED_SECRET`
- PostgreSQL dump болон MinIO объектын тусдаа backup
- Энэ node-ийн containerd санд импортолсон `lab-20260926` image-үүд;
  backend нь `lab-20260926-fix` image ашиглана

Нууц утга, dump, MinIO өгөгдлийг энэ хавтас болон Git-д бүү нэм.
`local-path` PVC нь тухайн node-ийн диск дээр байрладаг; өөр node-д өгөгдөл
автоматаар шилжихгүй.

Frontend нь браузерын `localhost:13000`, backend API нь `localhost:15000`
хаягаар build хийгдсэн. Эдгээр нь зөвхөн SSH/VS Code port forwarding-тэй
туршилтад зориулагдсан.

## Шалгах

    sudo k3s kubectl apply --dry-run=server -f ops/k3s-lab -o name

Secret, image болон өгөгдөл бэлэн болсон үед л manifest-уудыг шинэ
орчинд хэрэгжүүлнэ. Production шилжүүлэгт тусдаа хаяг, шинэ image tag,
эцсийн өгөгдлийн синхрончлол болон буцаах төлөвлөгөө шаардлагатай.
