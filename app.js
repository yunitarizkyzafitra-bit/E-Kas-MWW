// Konfigurasi
const VALID_USERNAME = "muslimah";
const VALID_PASSWORD = "bismillah";
const GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEOSdaDfgUM8iTSzsTA3UZ82CHmSn1CXq_fGOd-5t-1Qsng-gxUR9Y8Z3-jB5HrzLSHA/exec'; 

// Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const connStatus = document.getElementById('connection-status');
const quickDate = document.getElementById('quick-date');

let serialNumberCounter = 1;

// Format Rupiah
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Set Tanggal Cepat di Sidebar
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
quickDate.innerText = new Date().toLocaleDateString('id-ID', options);

if(localStorage.getItem('isLoggedIn') === 'true') {
    showDashboard();
}

// LOGIKA LOGIN (Tidak Dirubah)
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
        showDashboard();
    } else {
        document.getElementById('login-error').innerText = "Username atau kata sandi salah!";
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    loginScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    refreshData();
}

// LOGIKA TAB & MENU
function switchTab(tabId, element) {
    // Sembunyikan semua tab
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    // Hilangkan status aktif di menu
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    
    // Tampilkan tab yang dipilih
    document.getElementById(tabId).classList.remove('hidden');
    element.classList.add('active');
}

// STATUS JARINGAN
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

// SUBMIT FORM KAS
document.getElementById('kas-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const countStr = String(serialNumberCounter++).padStart(3, '0');
    
    const wilayah = document.getElementById('input-wilayah').value;
    const transID = `MWW-${wilayah}-${month}${year}-${countStr}`;
    
    const data = {
        id: transID,
        tanggal: document.getElementById('input-tanggal').value,
        jenisArusKas: document.getElementById('input-jenis').value,
        debit: parseFloat(document.getElementById('input-debit').value) || 0,
        kredit: parseFloat(document.getElementById('input-kredit').value) || 0,
        kategori: document.getElementById('input-kategori').value,
        timestamp: Date.now()
    };

    saveToHistoryLocal(data);

    if (navigator.onLine) {
        sendDataToSheet(data);
    } else {
        saveOfflineData(data);
    }
    
    // Reset parsial setelah input
    document.getElementById('input-jenis').value = '';
    document.getElementById('input-debit').value = '0';
    document.getElementById('input-kredit').value = '0';
    document.getElementById('input-kategori').value = '';
    
    alert("Data berhasil dicatat!");
});

function sendDataToSheet(data) {
    fetch(GOOGLE_APP_SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) })
    .catch(() => saveOfflineData(data));
}

// DATA MANAGEMENT & UPDATE DASHBOARD
function saveOfflineData(data) {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    offlineQueue.push(data);
    localStorage.setItem('kasOfflineQueue', JSON.stringify(offlineQueue));
    refreshData();
}

function syncOfflineData() {
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    if (offlineQueue.length > 0) {
        offlineQueue.forEach(data => {
            fetch(GOOGLE_APP_SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) })
            .then(() => {
                offlineQueue = offlineQueue.filter(item => item.id !== data.id);
                localStorage.setItem('kasOfflineQueue', JSON.stringify(offlineQueue));
                refreshData();
            }).catch(() => {});
        });
    }
}

function saveToHistoryLocal(data) {
    let history = JSON.parse(localStorage.getItem('kasHistory')) || [];
    history.unshift(data); 
    // Simpan hingga 50 transaksi lokal untuk laporan
    if(history.length > 50) history.pop(); 
    localStorage.setItem('kasHistory', JSON.stringify(history));
    refreshData();
}

// REFRESH TABEL DAN GRAFIK DASBOR
function refreshData() {
    let history = JSON.parse(localStorage.getItem('kasHistory')) || [];
    let offlineQueue = JSON.parse(localStorage.getItem('kasOfflineQueue')) || [];
    
    let totalKredit = 0;
    let totalDebit = 0;

    // Load Laporan Table
    const reportBody = document.getElementById('report-body');
    if(reportBody) {
        reportBody.innerHTML = '';
        history.forEach(row => {
            totalKredit += row.kredit;
            totalDebit += row.debit;
            
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.id}</strong></td>
                <td>${row.tanggal}</td>
                <td>${row.kategori}</td>
                <td>${row.jenisArusKas}</td>
                <td style="color:#d35400;">${formatRupiah(row.debit)}</td>
                <td style="color:#28a745;">${formatRupiah(row.kredit)}</td>
            `;
            reportBody.appendChild(tr);
        });
    }

    // Update Angka di Dashboard & Sidebar
    const saldo = totalKredit - totalDebit;
    document.getElementById('dash-saldo').innerText = formatRupiah(saldo);
    document.getElementById('dash-kredit').innerText = formatRupiah(totalKredit);
    document.getElementById('dash-debit').innerText = formatRupiah(totalDebit);
    document.getElementById('dash-sync').innerText = `${offlineQueue.length} Data`;
    document.getElementById('quick-total').innerText = history.length;

    // Update Progress Bar Ratio
    let totalVolume = totalKredit + totalDebit;
    let persentaseKredit = totalVolume > 0 ? (totalKredit / totalVolume) * 100 : 50;
    let persentaseDebit = totalVolume > 0 ? (totalDebit / totalVolume) * 100 : 50;
    
    document.getElementById('bar-kredit').style.width = `${persentaseKredit}%`;
    document.getElementById('bar-kredit').innerText = `Pemasukan (${Math.round(persentaseKredit)}%)`;
    document.getElementById('bar-debit').style.width = `${persentaseDebit}%`;
    document.getElementById('bar-debit').innerText = `Pengeluaran (${Math.round(persentaseDebit)}%)`;
}

// Inisialisasi awal
updateOnlineStatus();
