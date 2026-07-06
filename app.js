// Konfigurasi
const VALID_USERNAME = "muslimah";
const VALID_PASSWORD = "bismillah";
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzISwvKYZwX6LFq8fFzWdH89FxdotfIbBxI78eYtyGol7k5C2kln7SC59xINt2Oho22kQ/exec'; // Masukkan URL Deploy Anda di sini!

// Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const connStatus = document.getElementById('connection-status');
const syncInfo = document.getElementById('sync-info');

// Cek status login saat dimuat
if(localStorage.getItem('isLoggedIn') === 'true') {
    showDashboard();
}

// Toggle Password
function togglePassword() {
    const pwdInput = document.getElementById('password');
    const eyeIcon = document.querySelector('.toggle-password');
    if (pwdInput.type === "password") {
        pwdInput.type = "text";
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = "password";
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// Login Logic
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (user === VALID_USERNAME && pass === VALID_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        showDashboard();
    } else {
        errorMsg.innerText = "Username atau kata sandi salah!";
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
}

// Offline/Online Detection
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
    if (navigator.onLine) {
        document.body.classList.remove('offline');
        connStatus.innerText = "SISTEM TERHUBUNG (MODE ONLINE)";
        connStatus.style.backgroundColor = "#2c3e50";
        syncOfflineData(); // Coba sinkronisasi saat kembali online
    } else {
        document.body.classList.add('offline');
        connStatus.innerText = "TIDAK ADA JARINGAN (MODE OFFLINE - DATA AKAN DISIMPAN)";
        connStatus.style.backgroundColor = "#e74c3c";
    }
}

// Handle Form Submit
document.getElementById('kas-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = {
        tanggal: document.getElementById('input-tanggal').value,
        jenisArusKas: document.getElementById('input-jenis').value,
        debit: document.getElementById('input-debit').value,
        kredit: document.getElementById('input-kredit').value,
        kategori: document.getElementById('input-kategori').value,
        id: Date.now() // ID unik untuk antrean offline
    };

    if (navigator.onLine) {
        sendDataToSheet(data);
    } else {
        saveOfflineData(data);
    }
    
    this.reset();
    document.getElementById('input-debit').value = 0;
    document.getElementById('input-kredit').value = 0;
});

// Fungsi Kirim ke Google Sheets
function sendDataToSheet(data) {
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Menyimpan...";
    btn.disabled = true;

    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        alert("Data berhasil disimpan ke Spreadsheet!");
        btn.innerText = "Simpan Data";
        btn.disabled = false;
    })
    .catch(error => {
        // Jika gagal karena jaringan labil, simpan ke offline
        saveOfflineData(data);
        btn.innerText = "Simpan Data";
        btn.disabled = false;
    });
}

// Fungsi Simpan Offline (LocalStorage)
function saveOfflineData(data) {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    offlineQueue.push(data);
    localStorage.setItem('kasOfflineQueue', JSON.stringify(offlineQueue));
    alert("Anda sedang offline. Data disimpan lokal dan akan disinkronkan saat online.");
    checkOfflineQueue();
}

// Cek antrean
function checkOfflineQueue() {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    if(offlineQueue.length > 0) {
        syncInfo.innerText = `Ada ${offlineQueue.length} data menunggu untuk disinkronisasi.`;
    } else {
        syncInfo.innerText = "";
    }
}

// Sinkronisasi data offline saat online
function syncOfflineData() {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    if (offlineQueue.length > 0) {
        syncInfo.innerText = "Mensinkronisasikan data offline...";
        
        // Loop antrean dan kirim satu per satu
        offlineQueue.forEach(data => {
            fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            })
            .then(response => {
                // Hapus dari antrean jika berhasil
                offlineQueue = offlineQueue.filter(item => item.id !== data.id);
                localStorage.setItem('kasOfflineQueue', JSON.stringify(offlineQueue));
                checkOfflineQueue();
            })
            .catch(e => console.error("Gagal sync:", e));
        });
    }
}

// Inisialisasi status awal
updateOnlineStatus();
checkOfflineQueue();
