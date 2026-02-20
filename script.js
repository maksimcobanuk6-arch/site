// --- FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyD-taJI7mZNk_ooflprftRU-BIsI8VIEP4",
    authDomain: "barberstyledb.firebaseapp.com",
    projectId: "barberstyledb",
    storageBucket: "barberstyledb.firebasestorage.app",
    messagingSenderId: "307592548902",
    appId: "1:307592548902:web:7e90b959b9592b11634ce7"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* --- CONFIG & DATA --- */
const PRICES = {
    'Стрижка': 500,
    'Борода': 350,
    'Комплекс': 750
};

// Тепер це порожні масиви, які заповнюватимуться з інтернету
let bookings = [];
let reviews = [];

// 1. Слухаємо відгуки з бази (в реальному часі)
db.collection("reviews").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    reviews = [];
    snapshot.forEach((doc) => {
        reviews.push({ dbId: doc.id, ...doc.data() }); 
    });
    renderReviews();
});

// 2. Слухаємо записи клієнтів з бази (в реальному часі)
db.collection("bookings").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    bookings = [];
    snapshot.forEach((doc) => {
        bookings.push({ dbId: doc.id, ...doc.data() });
    });
    renderBookingsTable();
    updateDashboard();
});
/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('book-time').min = now.toISOString().slice(0,16);

    // НАДІЙНА ПЕРЕВІРКА: Шукаємо #admin в кінці адреси
    if (window.location.hash === '#admin') {
        document.querySelector('header').style.display = 'none';
        document.getElementById('client-view').style.display = 'none';
        document.getElementById('admin-view').style.display = 'block';
    }
});
/* --- UTILS --- */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleMenu() {
    const nav = document.getElementById('nav-list');
    nav.classList.toggle('active');
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : 'auto';
}

function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'flex' : 'none';
}

function goHome() {
    document.getElementById('admin-view').style.display = 'none';
    document.getElementById('client-view').style.display = 'block';
    window.scrollTo(0,0);
}

function selectService(name) {
    document.getElementById('book-service').value = name;
    document.getElementById('contact').scrollIntoView();
}
function selectBarber(name) {
    document.getElementById('book-barber').value = name;
    document.getElementById('contact').scrollIntoView();
}

/* --- BOOKING LOGIC --- */
function createBooking(e) {
    e.preventDefault();
    const name = document.getElementById('book-name').value;
    const phone = document.getElementById('book-phone').value;
    const barber = document.getElementById('book-barber').value;
    const service = document.getElementById('book-service').value;
    const timeVal = document.getElementById('book-time').value;

    const dateObj = new Date(timeVal);
    const hour = dateObj.getHours();

    if (hour < 10 || hour >= 22) {
        showToast('Ми працюємо з 10:00 до 22:00', 'error');
        return;
    }

    const isBusy = bookings.some(b => 
        b.barber === barber && 
        new Date(b.fullDate).getTime() === dateObj.getTime() &&
        b.status !== 'Скасовано'
    );

    if (isBusy) {
        showToast(`Майстер ${barber} зайнятий на цей час!`, 'error');
        return;
    }

    // Відправляємо запис у Firebase
    db.collection("bookings").add({
        name, phone, barber, service,
        fullDate: timeVal,
        dateStr: dateObj.toLocaleDateString(),
        timeStr: dateObj.toLocaleTimeString().slice(0,5),
        price: PRICES[service] || 0,
        status: 'Очікує',
        createdAt: Date.now()
    }).then(() => {
        showToast('Успішно записано! Чекаємо на вас.');
        e.target.reset();
    }).catch(err => {
        showToast('Помилка: ' + err.message, 'error');
    });
}

/* --- REVIEWS LOGIC --- */
function renderReviews() {
    const container = document.getElementById('reviews-container');
    const adminBody = document.getElementById('admin-reviews-body');
    
    if(container) container.innerHTML = '';
    if(adminBody) adminBody.innerHTML = '';

    reviews.forEach((r) => {
        if(container) {
            const stars = '⭐'.repeat(r.rating);
            const card = document.createElement('div');
            card.className = 'card review-card';
            card.innerHTML = `<p style="color:var(--primary)">${stars}</p><h3>${r.name}</h3><p>"${r.text}"</p>`;
            container.appendChild(card);
        }

        if(adminBody) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${r.name}</td>
                <td>${r.rating}/5</td>
                <td>${r.text}</td>
                <td><i class="fas fa-trash action-icon icon-del" onclick="deleteReview('${r.dbId}')"></i></td>
            `;
            adminBody.appendChild(row);
        }
    });
}

function addReview(e) {
    e.preventDefault();
    const name = document.getElementById('review-name').value;
    const rating = document.getElementById('review-rating').value;
    const msg = document.getElementById('review-msg').value;

    // Відправляємо відгук у Firebase
    db.collection("reviews").add({
        name: name,
        rating: Number(rating),
        text: msg,
        createdAt: Date.now()
    }).then(() => {
        showToast('Відгук додано!');
        e.target.reset();
    });
}

function deleteReview(dbId) {
    if(confirm('Видалити цей відгук?')) {
        db.collection("reviews").doc(dbId).delete().then(() => {
            showToast('Відгук видалено', 'error');
        });
    }
}

/* --- ADMIN PANEL LOGIC --- */
/* --- ADMIN PANEL LOGIC --- */
/* --- ADMIN PANEL LOGIC --- */
function login() {
    const pass = document.getElementById('admin-pass').value;
    if(pass === 'admin') {
        toggleModal('login-modal', false);
        
        // Беремо чисту адресу сайту і додаємо #admin
        const baseUrl = window.location.href.split('#')[0].split('?')[0];
        
        // Відкриваємо в новій вкладці!
        window.open(baseUrl + '#admin', '_blank');
        
        document.getElementById('admin-pass').value = '';
    } else {
        showToast('Невірний пароль', 'error');
    }
}

function logout() {
    // Спочатку намагаємося закрити вкладку
    window.close();
    
    // Якщо браузер забороняє автоматично закривати вкладки, 
    // просто стираємо #admin і перезавантажуємо сторінку:
    window.location.hash = '';
    window.location.reload();
}

function switchTab(tabId, btn) {
    // 1. Примусово ховаємо всі три вкладки
    document.getElementById('tab-dashboard').style.display = 'none';
    document.getElementById('tab-bookings').style.display = 'none';
    document.getElementById('tab-reviews').style.display = 'none';
    
    // 2. Показуємо тільки ту, на яку натиснули
    document.getElementById('tab-' + tabId).style.display = 'block';
    
    // 3. Змінюємо підсвітку активної кнопки в меню
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

/* --- DASHBOARD & ANALYTICS --- */
let chartInstance = null;

function updateDashboard() {
    const totalRev = bookings.reduce((acc, curr) => acc + (curr.status !== 'Скасовано' ? curr.price : 0), 0);
    const totalClients = bookings.length;
    
    const barberCounts = {};
    bookings.forEach(b => {
        barberCounts[b.barber] = (barberCounts[b.barber] || 0) + 1;
    });
    const topBarber = Object.keys(barberCounts).sort((a,b) => barberCounts[b] - barberCounts[a])[0] || '-';

    document.getElementById('total-revenue').innerText = totalRev + ' ₴';
    document.getElementById('total-clients').innerText = totalClients;
    document.getElementById('top-barber').innerText = topBarber;

    const ctx = document.getElementById('barberChart').getContext('2d');
    const names = ['Alex', 'Dimas', 'Max'];
    const data = names.map(n => barberCounts[n] || 0);

    if(chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: names,
            datasets: [{
                label: 'Кількість записів',
                data: data,
                backgroundColor: ['#d4af37', '#fff', '#333'],
                borderColor: '#d4af37',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: 'white' } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { color: 'white' }, grid: { color: '#333' } },
                x: { ticks: { color: 'white' }, grid: { display: false } }
            }
        }
    });
}

/* --- BOOKINGS TABLE --- */
function renderBookingsTable(filterText = '') {
    const tbody = document.getElementById('booking-tbody');
    tbody.innerHTML = '';

    const filtered = bookings.filter(b => 
        b.name.toLowerCase().includes(filterText.toLowerCase()) || 
        b.phone.includes(filterText)
    ).sort((a,b) => new Date(b.fullDate) - new Date(a.fullDate)); 

    filtered.forEach(b => {
        const tr = document.createElement('tr');
        const color = b.status === 'Підтверджено' ? '#28a745' : b.status === 'Скасовано' ? '#dc3545' : '#f0ad4e';
        
        tr.innerHTML = `
            <td>${b.dateStr}</td>
            <td>${b.timeStr}</td>
            <td>${b.name}</td>
            <td>${b.phone}</td>
            <td>${b.barber}</td>
            <td>${b.service}</td>
            <td style="color:${color}; font-weight:bold;">${b.status}</td>
            <td>
                <i class="fas fa-check action-icon icon-ok" title="Підтвердити" onclick="changeStatus('${b.dbId}', 'Підтверджено')"></i>
                <i class="fas fa-ban action-icon icon-del" title="Скасувати" onclick="changeStatus('${b.dbId}', 'Скасовано')"></i>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function changeStatus(dbId, newStatus) {
    // Змінюємо статус в базі даних
    db.collection("bookings").doc(dbId).update({
        status: newStatus
    }).then(() => {
        showToast(`Статус змінено на: ${newStatus}`);
    }).catch(err => {
        showToast('Помилка: ' + err.message, 'error');
    });
}

function filterBookings() {
    const text = document.getElementById('search-input').value;
    renderBookingsTable(text);
}