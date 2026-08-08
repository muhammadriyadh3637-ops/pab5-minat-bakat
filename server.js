const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SOAL_FILE = path.join(__dirname, 'soal.json');

// Pemetaan Rekomendasi Ekstrakurikuler berdasarkan Holland Code (RIASEC)
const ekstrakurikulerMap = {
  Realistis: ["Pramuka", "Paskibra", "PMR (Palang Merah Remaja)", "Olahraga (Futsal/Basket/Voli)"],
  Investigatif: ["KIR (Karya Ilmiah Remaja)", "Klub Komputer & Coding", "Klub Matematika & Sains"],
  Artistik: ["Seni Musik / Band", "Seni Tari Tradisional & Modern", "Teater / Teater Sekolah", "Desain Grafis & Fotografi"],
  Sosial: ["PMR (Palang Merah Remaja)", "Pramuka", "Kerohanian Islam (Rohis) / Kristen (Rokris)", "Pendidikan Sebaya"],
  Enterprising: ["Kewirausahaan Siswa (KWU)", "OSIS / MPK", "Debat Bahasa Indonesia / Inggris"],
  Konvensional: ["Koperasi Siswa", "Tim Administrasi Perpustakaan", "Jurnalistik / Mading Sekolah"]
};

// API Endpoint 1: Ambil Soal
app.get('/api/soal', (req, res) => {
  try {
    const dataSoal = JSON.parse(fs.readFileSync(SOAL_FILE, 'utf-8'));
    res.json(dataSoal);
  } catch (error) {
    res.status(500).json({ error: 'Gagal membaca data soal' });
  }
});

// API Endpoint 2: Proses Tes & Hitung Rekomendasi (Safe Mode untuk Vercel)
app.post('/api/proses-tes', (req, res) => {
  try {
    const { nama, nisn, kelas, jawaban } = req.body;

    if (!nama || !nisn || !jawaban) {
      return res.status(400).json({
        success: false,
        message: 'Mohon lengkapi identitas dan seluruh jawaban kuesioner!'
      });
    }

    const daftarSoal = JSON.parse(fs.readFileSync(SOAL_FILE, 'utf-8'));
    const skor = { Realistis: 0, Investigatif: 0, Artistik: 0, Sosial: 0, Enterprising: 0, Konvensional: 0 };

    daftarSoal.forEach(soal => {
      const nilai = Number(jawaban[`q${soal.id}`]) || 0;
      skor[soal.kategori] += nilai;
    });

    const hasilUrut = Object.entries(skor).sort(([, a], [, b]) => b - a);
    const kategoriUtama = hasilUrut[0][0];
    const rekomendasi = ekstrakurikulerMap[kategoriUtama] || [];

    res.json({
      success: true,
      siswa: { nama, nisn, kelas },
      skorDetail: skor,
      kategoriDominan: kategoriUtama,
      rekomendasiEkstra: rekomendasi
    });
  } catch (error) {
    console.error('Error processing test:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat memproses data kuesioner.' });
  }
});

// API Endpoint 3: Rekap Wali Kelas
app.get('/api/rekap-walikelas', (req, res) => {
  res.json([]);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;