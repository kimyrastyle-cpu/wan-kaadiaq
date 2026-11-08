# Wan Kaadiaq

Website kedai baju (dan nanti booking barbershop). Next.js 16 + Prisma + Postgres + ToyyibPay.

## Jalankan dalam PC

```bash
npm install
npm run dev
```

`npm run dev` akan start database Postgres tempatan (`prisma dev`) secara automatik.
Buka http://localhost:3000. Page admin: http://localhost:3000/admin (password dalam `.env`).

Tanpa key ToyyibPay dalam `.env`, checkout guna page bayaran test (development sahaja).

## Live (Vercel + Neon + domain Spaceship)

1. Push repo ni ke GitHub, kemudian import dalam Vercel.
2. Masukkan semua setting dari `.env.vercel` (tak dimasukkan dalam Git) ke
   Vercel → Settings → Environment Variables.
3. Vercel → Settings → Domains → tambah domain, kemudian tambah record DNS yang
   ditunjuk dalam Spaceship → Advanced DNS.

Senarai setting penuh: lihat `.env.example`.
