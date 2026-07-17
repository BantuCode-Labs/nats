# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

Format ini didasarkan pada [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini mematuhi [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Asosiasi tag departemen pada sesi POS. Sesi POS yang sebelumnya hanya terikat
  ke warehouse kini dapat diberi tag departemen (opsional) untuk keperluan
  pelaporan dan budgeting.
  - Field `departmentId` (opsional, FK ke `Department`) ditambahkan pada model
    `POSSession` di `prisma/schema/10_pos.prisma` beserta relasi balik
    `posSessions` pada model `Department` di `prisma/schema/13_budgeting.prisma`.
  - Migrasi `20260717113417_add_department_tag_to_pos_session` menambahkan
    kolom dan foreign key dengan `ON DELETE SET NULL` (selaras konvensi relasi
    `Department` lainnya), sehingga sesi existing tetap valid (`departmentId`
    `NULL`).
  - `POSSessionService.open` menerima `departmentId` (opsional) dan memvalidasi
    bahwa departemen tersebut ada dan aktif sebelum membuat sesi. Metode baru
    `POSSessionService.updateDepartment` memungkinkan mengubah/menghapus tag
    departemen pada sesi yang sudah ada tanpa mengganggu warehouse.
  - `POSSessionService.validateDepartmentId` memvalidasi bahwa hanya departemen
    aktif yang dapat ditetapkan; melempar error jika tidak valid.
  - Server action `openPOSSession` kini menerima `departmentId`; action baru
    `getPOSDepartments` menyediakan daftar departemen aktif untuk UI POS.
    `getPOSSessions` dan `getOpenPOSSession` menyertakan relasi `department`.
  - UI dialog mulai sesi POS (`pos-session-dialog.tsx`) kini memiliki pemilih
    departemen (opsional), dan tabel sesi POS menampilkan kolom Department.
  - Pesan i18n baru (`department`, `select_department`, `department_invalid`,
    `department_invalid_desc`) ditambahkan pada `messages/en.json` dan
    `messages/id.json`.
  - Unit test (`pos-session.service.test.ts`) dan integration test
    (`actions.test.ts`) komprehensif untuk validasi departemen, alur buka sesi,
    pembaruan tag, dan penjaga regresi warehouse.

### Changed
- `POSSessionService.open` signature kini menerima parameter ke-4 opsional
  `departmentId`. Pemanggil lama yang tidak menyediakan argumen tersebut tetap
  berfungsi (departemen menjadi `NULL`).

### Migration Notes
- Jalankan `prisma migrate deploy` (atau `prisma db push`) untuk menerapkan
  migrasi `20260717113417_add_department_tag_to_pos_session`. Tidak ada data
  lama yang perlu ditransformasi — sesi existing otomatis memiliki
  `departmentId = NULL`.

## [1.0.0-alpha] - 2026-04-16

### Added
- Implementasi sistem versioning menggunakan Semantic Versioning (SemVer).
- Konfigurasi rilis alpha pertama.
- Setup GitHub Actions untuk versioning otomatis.
- Dokumentasi instalasi komprehensif di README.md.
- Dukungan Git tags untuk rilis versi.

### Changed
- Update versi aplikasi ke `1.0.0-alpha` di `package.json`.
- Restrukturisasi README.md untuk fokus pada panduan pengguna.
