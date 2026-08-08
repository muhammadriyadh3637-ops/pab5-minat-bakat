const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Path file JSON dengan penanganan absolut untuk Vercel
const SOAL_FILE = path.join(__dirname, 'soal.json');
const HASIL_FILE = path.join('/tmp', 'hasil_tes.json'); // Menggunakan direktori sementara Vercel

// Inisialisasi file hasil_tes jika belum ada di /tmp
if (!fs.existsSync(HASIL_FILE)) {
  try {
    const defaultData = fs.existsSync(path.join(__dirname, 'hasil_tes.json'))
      ? fs.readFileSync(path.join(__dirname, 'hasil_tes.json'), 'utf-8')
      : '[]';
    fs.writeFileSync(HASIL_FILE, defaultData);
  } catch (err) {
    fs.writeFileSync(HASIL_FILE, '[]');
  }
}

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

// API Endpoint 2: Proses & Simpan Tes Murid
app.post('/api/proses-tes', (req, res) => {
  try {
    const { nama, nisn, kelas, jawaban } = req.body;

    let dataHasil = [];
    if (fs.existsSync(HASIL_FILE)) {
      dataHasil = JSON.parse(fs.readFileSync(HASIL_FILE, 'utf-8'));
    }

    // Validasi NISN Unik
    const nisnSudahAda = dataHasil.some(siswa => siswa.nisn === nisn.trim());
    if (nisnSudahAda) {
      return res.status(400).json({ 
        success: false, 
        message: `NISN ${nisn} sudah pernah melakukan pengisian kuesioner!` 
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// API Endpoint 3: Ambil Rekap untuk Wali Kelas
app.get('/api/rekap-walikelas', (req, res) => {
  try {
    let dataHasil = [];
    if (fs.existsSync(HASIL_FILE)) {
      dataHasil = JSON.parse(fs.readFileSync(HASIL_FILE, 'utf-8'));
    }
    res.json(dataHasil);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data rekap' });
  }
});

// Untuk kebutuhan lokal
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export app untuk Vercel Serverless Function
module.exports = app;