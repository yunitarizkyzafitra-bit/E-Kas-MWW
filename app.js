// Konfigurasi
const VALID_USERNAME = "muslimah";
const VALID_PASSWORD = "bismillah";
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBf0YkC7BSqWLLB583KWlVU_hMdDaaMIEidqas-PYL2lJO1JtpNfmWXrY3MhN9xek0/exec'; 

// Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const connStatus = document.getElementById('connection-status');
const syncInfo = document.getElementById('sync-info');
const historyBody = document.getElementById('history-body');

let serialNumberCounter = 1;

if(localStorage.getItem('isLoggedIn') === 'true') {
    showDashboard();
}

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
    loadHistoryTable();
}

// Deteksi Status Jaringan
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function updateOnlineStatus() {
    if (navigator.onLine) {
        document.body.classList.remove('offline');
        connStatus.innerHTML = '<i class="fa-solid fa-signal" style="margin-right: 8px;"></i> SISTEM TERHUBUNG (MODE ONLINE)';
        syncOfflineData(); 
    } else {
        document.body.classList.add('offline');
        connStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i> MODE OFFLINE - DATA DISIMPAN LOKAL';
    }
}

// Generate Nomor Transaksi Otomatis dengan Kode Wilayah
function generateTransactionID(wilayah) {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const countStr = String(serialNumberCounter).padStart(3, '0');
    serialNumberCounter++;
    return `MWW-${wilayah}-${month}${year}-${countStr}`;
}

// Handle Form Submit
document.getElementById('kas-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const wilayah = document.getElementById('input-wilayah').value;
    const transID = generateTransactionID(wilayah);
    
    const data = {
        id: transID, // Nomor urut/transaksi berstruktur
        tanggal: document.getElementById('input-tanggal').value,
        jenisArusKas: document.getElementById('input-jenis').value,
        debit: document.getElementById('input-debit').value,
        kredit: document.getElementById('input-kredit').value,
        kategori: document.getElementById('input-kategori').value,
        timestamp: Date.now()
    };

    saveToHistoryLocal(data);

    if (navigator.onLine) {
        sendDataToSheet(data);
    } else {
        saveOfflineData(data);
    }
    
    // Reset form parsial
    document.getElementById('input-jenis').value = '';
    document.getElementById('input-debit').value = 0;
    document.getElementById('input-kredit').value = 0;
    document.getElementById('input-kategori').value = '';
});

function sendDataToSheet(data) {
    const btn = document.getElementById('submit-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    fetch(GOOGLE_APP_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Data ke Spreadsheet';
        btn.disabled = false;
    })
    .catch(error => {
        saveOfflineData(data);
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Data ke Spreadsheet';
        btn.disabled = false;
    });
}

// Manajemen Offline & Riwayat
function saveOfflineData(data) {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    offlineQueue.push(data);
    localStorage.setItem('kasOfflineQueue', JSON.stringify(offlineQueue));
    checkOfflineQueue();
}

function checkOfflineQueue() {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    syncInfo.innerText = `${offlineQueue.length} Data Menunggu Sync`;
    if(offlineQueue.length > 0) syncInfo.style.color = "#f39c12";
    else syncInfo.style.color = "#2ecc71";
}

function syncOfflineData() {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    if (offlineQueue.length > 0) {
        syncInfo.innerText = "Mensinkronkan...";
        offlineQueue.forEach(data => {
            fetch(GOOGLE_APP_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(data)
            })
            .then(() => {
                offlineQueue = offlineQueue.filter(item => item.id !== data.id);
                localStorage.setItem('kasOfflineQueue', JSON.stringify(offlineQueue));
                checkOfflineQueue();
            }).catch(() => {});
        });
    }
}

function saveToHistoryLocal(data) {
    let history = JSON.parse(localStorage.getItem('kasHistory')) || [];
    history.unshift(data); 
    if(history.length > 5) history.pop(); 
    localStorage.setItem('kasHistory', JSON.stringify(history));
    loadHistoryTable();
}

function loadHistoryTable() {
    let history = JSON.parse(localStorage.getItem('kasHistory')) || [];
    historyBody.innerHTML = '';
    history.forEach(row => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.tanggal}</td>
            <td>${row.jenisArusKas}</td>
            <td>${row.kategori}</td>
        `;
        historyBody.appendChild(tr);
    });
}

// Inisialisasi awal
updateOnlineStatus();
checkOfflineQueue();
