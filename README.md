# Wan Kaadiaq

Website kedai baju dan booking barbershop. Next.js 16 + Prisma + Postgres, bayaran melalui CHIP / ToyyibPay, pos melalui J&T Express.

## Jalankan dalam PC

```bash
npm install
npm run dev
```

`npm run dev` akan start database Postgres tempatan (`prisma dev`) secara automatik.
Buka http://localhost:3000. Page admin: http://localhost:3000/admin (password dalam `.env`).

Tanpa key CHIP atau ToyyibPay dalam `.env`, checkout guna page bayaran test (development sahaja).

## Live (Vercel + Neon + domain Spaceship)

1. Push repo ni ke GitHub, kemudian import dalam Vercel.
2. Masukkan semua setting dari `.env.vercel` (tak dimasukkan dalam Git) ke
   Vercel → Settings → Environment Variables.
3. Vercel → Settings → Domains → tambah domain, kemudian tambah record DNS yang
   ditunjuk dalam Spaceship → Advanced DNS.

Senarai setting penuh: lihat `.env.example`.

## Bayaran (CHIP / ToyyibPay)

Isi key gateway yang nak diguna dalam `.env` / Vercel. Kalau dua-dua diisi, pelanggan
pilih cara bayaran masa checkout; kalau satu sahaja, terus ke gateway tu.

- **CHIP**: `CHIP_SECRET_KEY` dan `CHIP_BRAND_ID` dari portal CHIP → Developers.
  Tak perlu daftar webhook; callback dihantar terus ke `/api/chip/callback`.
- **ToyyibPay**: `TOYYIBPAY_SECRET_KEY` dan `TOYYIBPAY_CATEGORY_CODE`.

Status bayaran sentiasa disemak terus dengan gateway, bukan dari isi callback.

## Pos (J&T Express)

Bila semua setting `JNT_*` diisi, setiap order "Perlu dipos" dalam `/admin` ada butang
**Buat consignment J&T**. Ia cipta consignment di J&T, simpan no. AWB sebagai no. tracking,
dan tanda order sebagai dah dipos. Lepas tu boleh **Cetak label J&T** (PDF), dan
"Batal tanda pos" akan batalkan consignment di J&T sekali.

Tanpa setting J&T, admin masih boleh isi no. tracking sendiri macam biasa.
Page terima kasih pelanggan tunjuk no. tracking dan pautan semak penghantaran.
