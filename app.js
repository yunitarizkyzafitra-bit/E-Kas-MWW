// --- KONFIGURASI ---
const VALID_USERNAME = "muslimah";
const VALID_PASSWORD = "bismillah";
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8NH-Irw1AhaTD_CNRJdolCDq-BLUiRw2912Qxkg81psR2A2bI2E9pRNA27bielaLXPQ/exec'; 

// --- STATE MANAGEMENT ---
let kasHistory = [];

// --- LOGIKA LOGIN (TETAP) ---
function togglePassword() {
    const pwdInput = document.getElementById('password');
    const eyeIcon = document.querySelector('.toggle-password');
    if (pwdInput.type === "password") { pwdInput.type = "text"; eyeIcon.classList.replace('fa-eye', 'fa-eye-slash'); } 
    else { pwdInput.type = "password"; eyeIcon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user === VALID_USERNAME && pass === VALID_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        location.reload(); // Refresh untuk masuk ke dashboard
    } else {
        document.getElementById('login-error').innerText = "Username atau kata sandi salah!";
    }
}

// --- SINKRONISASI DATA (INTI) ---
async function syncData() {
    try {
        const response = await fetch(GOOGLE_APP_SCRIPT_URL);
        const data = await response.json(); 
        // Data dari spreadsheet akan meng-overwrite data lokal
        // Jika data dihapus di spreadsheet, aplikasi akan terupdate otomatis
        kasHistory = data.transactions; 
        updateDashboard();
        renderTable();
    } catch (e) {
        console.error("Gagal sinkronisasi data", e);
    }
}

// --- INPUT TRANSAKSI (DIPERBARUI) ---
document.getElementById('kas-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const payload = {
        tanggal: document.getElementById('input-tanggal').value,
        jenis: document.getElementById('input-jenis-transaksi').value, // 'DEBIT' atau 'KREDIT'
        uraian: document.getElementById('input-uraian').value,
        nominal: document.getElementById('input-nominal').value,
        penginput: document.getElementById('input-nama').value
    };

    // Kirim ke Spreadsheet
    await fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    alert("Data berhasil tersimpan di Spreadsheet");
    syncData(); // Tarik data terbaru setelah input
});

// --- PEMBARUAN TAMPILAN ---
function updateDashboard() {
    let totalKredit = 0;
    let totalDebit = 0;
    
    kasHistory.forEach(item => {
        if(item.jenis === 'KREDIT') totalKredit += parseFloat(item.nominal);
        else totalDebit += parseFloat(item.nominal);
    });

    document.getElementById('dash-saldo-akhir').innerText = formatRupiah(totalKredit - totalDebit);
    document.getElementById('dash-saldo-awal').innerText = formatRupiah(totalKredit); // Contoh logika saldo awal
}

function renderTable() {
    const tbody = document.getElementById('report-body');
    tbody.innerHTML = kasHistory.map(item => `
        <tr>
            <td>${item.tanggal}</td>
            <td>${item.uraian}</td>
            <td>${item.penginput}</td>
            <td style="color:${item.jenis === 'DEBIT' ? 'red' : 'green'}">${item.jenis}</td>
            <td>${formatRupiah(item.nominal)}</td>
        </tr>
    `).join('');
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
}

// Inisialisasi
if(localStorage.getItem('isLoggedIn') === 'true') {
    syncData();
}
