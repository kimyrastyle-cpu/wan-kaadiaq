# Wan Kaadiaq

Website kedai baju dan booking barbershop. Next.js 16 + Prisma + Postgres, bayaran melalui CHIP, pos melalui EasyParcel.

## Jalankan dalam PC

```bash
npm install
npm run dev
```

`npm run dev` akan start database Postgres tempatan (`prisma dev`) secara automatik.
Buka http://localhost:3000. Page admin: http://localhost:3000/admin (password dalam `.env`).

Tanpa key CHIP dalam `.env`, checkout guna page bayaran test (development sahaja).

## Live (Vercel + Neon + domain Spaceship)

1. Push repo ni ke GitHub, kemudian import dalam Vercel.
2. Masukkan semua setting dari `.env.vercel` (tak dimasukkan dalam Git) ke
   Vercel → Settings → Environment Variables.
3. Vercel → Settings → Domains → tambah domain, kemudian tambah record DNS yang
   ditunjuk dalam Spaceship → Advanced DNS.

Senarai setting penuh: lihat `.env.example`.

## Bayaran (CHIP)

Isi `CHIP_SECRET_KEY` dan `CHIP_BRAND_ID` (portal CHIP → Developers) dalam `.env` / Vercel.
Tak perlu daftar webhook; callback dihantar terus ke `/api/chip/callback`.
Status bayaran sentiasa disemak terus dengan CHIP, bukan dari isi callback.

## Pos (EasyParcel)

Isi `EASYPARCEL_API_KEY` dan alamat pengirim `SHIP_FROM_*` dalam `.env` / Vercel. Setiap order
"Perlu dipos" dalam `/admin` ada butang **Pos guna EasyParcel**: semak harga kurier, tempah
dan bayar guna kredit EasyParcel, kemudian no. tracking, link tracking dan label PDF disimpan
pada order. Admin juga boleh isi kurier dan no. tracking sendiri kalau pos di luar EasyParcel.

Bila order ditanda dah pos, pelanggan dapat email (Resend) dan page terima kasih mereka
tunjuk no. tracking serta pautan semak penghantaran.
