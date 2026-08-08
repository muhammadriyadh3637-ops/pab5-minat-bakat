const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Password default Panel Wali Kelas
const PASSWORD_WALI_KELAS = "pab5klumpang";

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File Data Soal
const daftarSoal = JSON.parse(fs.readFileSync('./soal.json', 'utf-8'));

// File Data Hasil Tes
const HASIL_FILE = './hasil_tes.json';
if (!fs.existsSync(HASIL_FILE)) {
  fs.writeFileSync(HASIL_FILE, JSON.stringify([]));
}

// Pemetaan Rekomendasi Ekstrakurikuler SMA Swasta PAB 5 Klumpang
const ekstrakurikulerMap = {
  Realistis: ["Futsal / Sepakbola", "Bola Voli", "Pencak Silat"],
  Investigatif: ["Karya Ilmiah Remaja (KIR)", "Club Coding & IT", "Olimpiade Sains (OSN)"],
  Artistik: ["Seni Musik & Band", "Seni Tari Tradisional/Modern", "Desain Grafis & Fotografi"],
  Sosial: ["Palang Merah Remaja (PMR)", "Pramuka", "Rohani Islam (Rohis) / Rohkris"],
  Enterprising: ["Paskibra", "English Debating Club", "Jurnalistik Sekolah"],
  Konvensional: ["Tim Patroli Keamanan Sekolah (PKS)", "Klub Catur", "Pramuka (Seksi Logistik)"]
};

// API Endpoint 1: Ambil Soal
app.get('/api/soal', (req, res) => {
  res.json(daftarSoal);
});

// API Endpoint 2: Proses & Simpan Tes Murid
app.post('/api/proses-tes', (req, res) => {
  const { nama, nisn, kelas, jawaban } = req.body;

  const dataHasil = JSON.parse(fs.readFileSync(HASIL_FILE, 'utf-8'));

  // Validasi 1: Cek apakah NISN sudah pernah digunakan
  const nisnSudahAda = dataHasil.some(siswa => siswa.nisn === nisn.trim());
  if (nisnSudahAda) {
    return res.status(400).json({ 
      success: false, 
      message: `NISN ${nisn} sudah pernah melakukan pengisian kuesioner! Harap hubungi Wali Kelas jika ingin melakukan tes ulang.` 
    });
  }

  const skor = {
    Realistis: 0,
    Investigatif: 0,
    Artistik: 0,
    Sosial: 0,
    Enterprising: 0,
    Konvensional: 0
  };

  daftarSoal.forEach(soal => {
    const nilai = Number(jawaban[`q${soal.id}`]) || 0;
    skor[soal.kategori] += nilai;
  });

  const hasilUrut = Object.entries(skor).sort(([, a], [, b]) => b - a);
  const kategoriUtama = hasilUrut[0][0];
  const rekomendasi = ekstrakurikulerMap[kategoriUtama] || [];

  const dataSiswaBaru = {
    id: Date.now(),
    tanggal: new Date().toLocaleDateString('id-ID'),
    nama,
    nisn: nisn.trim(),
    kelas,
    kategoriDominan: kategoriUtama,
    rekomendasi,
    skorDetail: skor
  };

  dataHasil.push(dataSiswaBaru);
  fs.writeFileSync(HASIL_FILE, JSON.stringify(dataHasil, null, 2));

  res.json({
    success: true,
    siswa: { nama, nisn, kelas },
    skorDetail: skor,
    kategoriDominan: kategoriUtama,
    rekomendasiEkstra: rekomendasi
  });
});

// API Endpoint 3: Verifikasi & Ambil Data Rekap Wali Kelas (Protected)
app.post('/api/wali-kelas/login', (req, res) => {
  const { password } = req.body;

  if (password === PASSWORD_WALI_KELAS) {
    const dataHasil = JSON.parse(fs.readFileSync(HASIL_FILE, 'utf-8'));
    res.json({ success: true, data: dataHasil });
  } else {
    res.status(401).json({ success: false, message: "Password Wali Kelas Salah!" });
  }
});

app.listen(PORT, () => {
  console.log(`Server SMA PAB 5 Klumpang berjalan di http://localhost:${PORT}`);
});