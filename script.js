// --- STATE MANAGEMENT ---
let currentUser = null;
let currentCourseId = null;
let currentLessonIndex = 0;

// Global chart instance
let enrollmentChartInstance = null;

// --- DOM ELEMENTS (available because script is at bottom of body) ---
const pages = document.querySelectorAll('.page');
const header = document.getElementById('header');
const searchBar = document.getElementById('search-bar');
const courseListContainer = document.getElementById('course-list');
const enrolledCoursesContainer = document.getElementById('enrolled-courses-list');
const lessonContentArea = document.getElementById('lesson-content-area');
const curriculumSidebar = document.getElementById('curriculum-sidebar');
const lessonTitleEl = document.getElementById('lesson-title');
const courseTitleSidebarEl = document.getElementById('course-title-sidebar');
const appContainer = document.getElementById('app');

// --- API COMMUNICATION ---
const API_BASE_URL = "/api/";


async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        showToast('A network or server error occurred. Check console.', 'error');
        return { success: false, message: 'Network error.' };
    }
}

// --- HELPERS ---
function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    // Restore session user if present
    try {
        const stored = sessionStorage.getItem('currentUser');
        if (stored) currentUser = JSON.parse(stored);
    } catch (e) {
        console.warn('Could not parse stored currentUser:', e);
    }

    if (currentUser) {
        if (currentUser.role === 'admin') {
            showPage('admin-page');
        } else {
            showPage('home-page');
        }
    } else {
        showPage('auth-page');
    }

    // Attach real-time search (home page)
    if (searchBar) {
        searchBar.addEventListener(
            'input',
            debounce((e) => {
                const q = (e.target.value || '').trim();
                renderCourses(q);
            }, 300)
        );
    }

    // Attach admin course search
    const adminSearch = document.getElementById('course-search-bar-admin');
    if (adminSearch) {
        adminSearch.addEventListener('input', (e) => {
            renderAdminCourses(e.target.value.trim());
        });
    }

    // Initial admin courses load (if admin)
    renderAdminCourses();
});

// --- PAGE NAVIGATION ---
function showPage(pageId) {
    // hide all pages
    pages.forEach(page => page.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    window.scrollTo(0, 0);

    if (appContainer) {
        appContainer.classList.add('container', 'mx-auto', 'max-w-screen-2xl');
    }

    // Desktop nav links
    const homeLink = document.querySelector('nav#nav-links a[onclick="showPage(\'home-page\')"]');
    const dashboardLink = document.querySelector('nav#nav-links a[onclick="showPage(\'dashboard-page\')"]');
    const adminLink = document.getElementById('admin-link');

    // Mobile nav links
    const mobileHomeLink = document.getElementById('mobile-home-link');
    const mobileDashboardLink = document.getElementById('mobile-dashboard-link');
    const adminLinkMobile = document.getElementById('admin-link-mobile');

    if (currentUser) {
        // show header + greeting
        header.classList.remove('hidden');
        header.classList.add('flex');

        const greetEl = document.getElementById('user-greeting');
        if (greetEl && currentUser.name) {
            greetEl.textContent = currentUser.name.split(' ')[0];
        }

        const isAdmin = currentUser.role === 'admin';

        // Desktop nav visibility
        if (homeLink) homeLink.classList.toggle('hidden', isAdmin);
        if (dashboardLink) dashboardLink.classList.toggle('hidden', isAdmin);
        if (adminLink) adminLink.classList.toggle('hidden', !isAdmin);

        // Mobile nav visibility
        if (mobileHomeLink) mobileHomeLink.classList.toggle('hidden', isAdmin);
        if (mobileDashboardLink) mobileDashboardLink.classList.toggle('hidden', isAdmin);
        if (adminLinkMobile) adminLinkMobile.classList.toggle('hidden', !isAdmin);

    } else {
        header.classList.add('hidden');
        header.classList.remove('flex');
    }

    // per-page logic
    if (pageId === 'home-page') renderCourses();
    if (pageId === 'dashboard-page' && currentUser) renderDashboard();
    if (pageId === 'admin-page') showAdminSection('admin-overview');
    if (pageId === 'profile-page') renderProfilePage();
}

// --- AUTHENTICATION ---
function showAuthView(viewName) {
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const otpView = document.getElementById('otp-view');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const otpError = document.getElementById('otp-error');

    if (loginView) loginView.classList.add('hidden');
    if (registerView) registerView.classList.add('hidden');
    if (otpView) otpView.classList.add('hidden');

    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
    if (otpError) otpError.textContent = '';

    if (viewName === 'login' && loginView) loginView.classList.remove('hidden');
    if (viewName === 'register' && registerView) registerView.classList.remove('hidden');
    if (viewName === 'otp' && otpView) otpView.classList.remove('hidden');
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (errorEl) errorEl.textContent = '';

    const response = await apiRequest('login.php', 'POST', { email, password });

    if (!response || typeof response !== 'object') {
        if (errorEl) errorEl.textContent = 'Unexpected server response.';
        return;
    }

    if (response.success) {
        currentUser = response.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        if (currentUser.role === 'admin') {
            showPage('admin-page');
            loadAdminStats();
            showToast('Logged in as Admin', 'success');
        } else {
            showPage('home-page');
            showToast('Login successful', 'success');
        }
    } else {
        if (errorEl) errorEl.textContent = response.message || 'Login failed.';

        // If account is not verified, move to OTP view
        if (response.message && response.message.toLowerCase().includes('not verified')) {
            const otpEmail = document.getElementById('otp-email');
            if (otpEmail) otpEmail.value = email;
            showAuthView('otp');
        }
    }
}

async function handleRegistration() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    if (errorEl) errorEl.textContent = '';

    const response = await apiRequest('register.php', 'POST', { name, email, password });

    if (response.success) {
        showToast(response.message || 'Registered successfully. Check your email.', 'success');
        const otpEmail = document.getElementById('otp-email');
        if (otpEmail) otpEmail.value = email;
        showAuthView('otp');
    } else {
        if (errorEl) errorEl.textContent = response.message || 'Registration failed.';
    }
}

async function handleVerifyOTP() {
    const email = document.getElementById('otp-email').value;
    const otp = document.getElementById('otp-code').value;
    const errorEl = document.getElementById('otp-error');

    if (!otp || otp.length !== 6) {
        if (errorEl) errorEl.textContent = 'Please enter a valid 6-digit OTP.';
        return;
    }

    const response = await apiRequest('verify_otp.php', 'POST', { email, otp });

    if (response.success) {
        showToast(response.message || 'Account verified!', 'success');
        document.getElementById('otp-code').value = '';
        document.getElementById('otp-email').value = '';
        showAuthView('login');
    } else {
        if (errorEl) errorEl.textContent = response.message || 'OTP verification failed.';
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');

    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';

    showPage('auth-page');
}

// --- PROFILE & PASSWORD ---
function renderProfilePage() {
    if (!currentUser) {
        showPage('auth-page');
        return;
    }

    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const errorEl = document.getElementById('password-error');

    if (nameEl) nameEl.innerText = currentUser.name;
    if (emailEl) emailEl.innerText = currentUser.email;

    if (errorEl) errorEl.innerText = '';

    const cur = document.getElementById('current-password');
    const n1 = document.getElementById('new-password');
    const n2 = document.getElementById('confirm-password');
    if (cur) cur.value = '';
    if (n1) n1.value = '';
    if (n2) n2.value = '';
}

async function handleChangePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('password-error');

    if (newPassword !== confirmPassword) {
        if (errorEl) errorEl.innerText = 'New passwords do not match.';
        return;
    }
    if (newPassword.length < 6) {
        if (errorEl) errorEl.innerText = 'Password must be at least 6 characters.';
        return;
    }

    const response = await apiRequest('change_password.php', 'POST', {
        userId: currentUser.id,
        currentPassword,
        newPassword
    });

    if (response.success) {
        showToast('Password updated successfully!', 'success');
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        if (errorEl) errorEl.innerText = '';
    } else {
        if (errorEl) errorEl.innerText = response.message || 'An error occurred.';
    }
}

// --- DELETE ACCOUNT MODAL ---
function showDeleteAccountModal() {
    const userMenu = document.getElementById('user-menu');
    if (userMenu) userMenu.classList.add('hidden');

    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.remove('hidden');
}

function hideDeleteAccountModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleDeleteAccount() {
    if (!currentUser) {
        showToast('You must be logged in to do that.', 'error');
        return;
    }

    const response = await apiRequest('delete_account.php', 'POST', { userId: currentUser.id });

    if (response.success) {
        showToast('Your account has been successfully deleted.', 'success');
        hideDeleteAccountModal();
        logout();
    } else {
        showToast(response.message || 'An error occurred.', 'error');
        hideDeleteAccountModal();
    }
}

// --- UI TOGGLES ---
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    if (menu) menu.classList.toggle('hidden');
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-nav');
    if (menu) menu.classList.toggle('hidden');
}

// --- COURSE & DASHBOARD RENDERING ---
async function renderCourses(filter = '') {
    filter = (filter || '').toString().trim();
    const userId = (currentUser && currentUser.id) ? currentUser.id : 0;
    const encodedFilter = encodeURIComponent(filter);

    const response = await apiRequest(`courses.php?search=${encodedFilter}&userId=${userId}`);

    if (!courseListContainer) return;
    courseListContainer.innerHTML = '';

    if (!response.success || !response.courses || response.courses.length === 0) {
        courseListContainer.innerHTML = '<p class="text-slate-500 col-span-full text-center">No courses found.</p>';
        return;
    }

    response.courses.forEach(course => {
        const rating = Number(course.rating) || 0;
        const students = Number(course.students) || 0;

        const card = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 group">
                <img src="${course.image || 'https://placehold.co/600x400?text=No+Image'}" alt="${course.title || 'Untitled Course'}" class="w-full h-40 object-cover">
                <div class="p-5">
                    <h3 class="text-lg font-bold truncate group-hover:text-indigo-600 transition">${course.title || 'Untitled Course'}</h3>
                    <p class="text-sm text-slate-500 mb-3">${course.instructor || 'Unknown Instructor'}</p>
                    <div class="flex items-center space-x-1 text-sm text-slate-600 mb-4">
                        <span class="font-bold text-amber-500">${rating.toFixed(1)}</span>
                        <i class="fas fa-star text-amber-400"></i>
                        <span>(${students.toLocaleString()})</span>
                    </div>
                    <button onclick="toggleEnrollment(${course.id})"
                        class="w-full py-2.5 rounded-lg transition duration-200 text-white font-semibold 
                        ${course.isEnrolled ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}"
                        id="enroll-btn-${course.id}">
                        ${course.isEnrolled ? 'Unenroll' : 'Enroll Now'}
                    </button>
                </div>
            </div>`;
        courseListContainer.innerHTML += card;
    });
}

async function renderDashboard() {
    if (!currentUser) return;
    const response = await apiRequest(`courses.php?enrolledOnly=true&userId=${currentUser.id}`);

    if (!enrolledCoursesContainer) return;
    enrolledCoursesContainer.innerHTML = '';

    if (!response.success || !response.courses || response.courses.length === 0) {
        enrolledCoursesContainer.innerHTML = '<p class="text-slate-500 col-span-full text-center">You are not enrolled in any courses yet. <a href="#" onclick="showPage(\'home-page\')" class="text-indigo-600 hover:underline font-semibold">Browse courses now!</a></p>';
        return;
    }

    response.courses.forEach(course => {
        const card = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden group">
                <img src="${course.image}" alt="${course.title}" class="w-full h-40 object-cover">
                <div class="p-5">
                    <h3 class="text-lg font-bold truncate">${course.title}</h3>
                    <p class="text-sm text-slate-500 mb-4">${course.instructor}</p>
                    <button onclick="openCoursePlayer(${course.id})" class="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition">
                        Continue Learning
                    </button>
                </div>
            </div>`;
        enrolledCoursesContainer.innerHTML += card;
    });
}

async function toggleEnrollment(courseId) {
    if (!currentUser) {
        showToast('Please log in to enroll.', 'error');
        return;
    }
    const response = await apiRequest('enrollments.php', 'POST', { userId: currentUser.id, courseId });

    if (response.success) {
        showToast(response.message, 'success');
        renderCourses(searchBar ? searchBar.value : '');
        if (currentCourseId) renderDashboard();
    } else {
        showToast(response.message || 'Operation failed.', 'error');
    }
}

// --- COURSE PLAYER ---
async function openCoursePlayer(courseId) {
    currentCourseId = courseId;
    const response = await apiRequest(`lessons.php?courseId=${courseId}`);

    if (!response.success) {
        showToast('Could not load course content.', 'error');
        return;
    }

    const { course, lessons } = response;
    if (courseTitleSidebarEl) courseTitleSidebarEl.textContent = course.title;

    if (curriculumSidebar) curriculumSidebar.innerHTML = '';
    lessons.forEach((lesson, index) => {
        const icon = lesson.type === 'video' ? 'fa-play-circle' : 'fa-question-circle';
        const item = `
            <div id="lesson-item-${index}" onclick="loadLesson(${index})" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer transition">
                <i class="fas ${icon} text-slate-500"></i>
                <span class="text-sm font-medium">${lesson.title}</span>
            </div>`;
        if (curriculumSidebar) curriculumSidebar.innerHTML += item;
    });

    window.courseData = { course, lessons };
    showPage('course-player-page');
    loadLesson(0);
}

function loadLesson(lessonIndex) {
    if (!window.courseData) return;
    currentLessonIndex = lessonIndex;

    const items = document.querySelectorAll('#curriculum-sidebar > div');
    items.forEach((el, idx) => {
        el.classList.toggle('bg-indigo-100', idx === lessonIndex);
        const icon = el.querySelector('i');
        if (icon) {
            icon.classList.toggle('text-indigo-600', idx === lessonIndex);
            icon.classList.toggle('text-slate-500', idx !== lessonIndex);
        }
    });

    const { lessons } = window.courseData;
    const lesson = lessons[lessonIndex];

    if (lessonTitleEl) lessonTitleEl.textContent = lesson.title;

    if (lesson.type === 'video') {
        lessonContentArea.innerHTML = `<div class="aspect-video"><iframe src="${lesson.content}?autoplay=1&mute=1&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
    } else if (lesson.type === 'quiz') {
        let quizData = lesson.content;
        if (typeof quizData === 'string') {
            try {
                quizData = JSON.parse(quizData);
            } catch (e) {
                console.error("Quiz JSON parsing error:", e, "Raw content:", lesson.content);
                lessonContentArea.innerHTML = `<div class="p-6 text-red-600">
                    <h3 class="font-bold">Error Loading Quiz</h3>
                    <p>Could not load the quiz because the data is malformed.</p>
                </div>`;
                return;
            }
        }
        renderQuiz(quizData);
    }
}

function returnToCoursePlayer() {
    showPage('course-player-page');
    loadLesson(currentLessonIndex);
}

// --- QUIZ FUNCTIONALITY ---
function renderQuiz(questions) {
    let quizHTML = `<div class="p-6" id="quiz-form">`;
    questions.forEach((q, index) => {
        quizHTML += `<div class="mb-6"><p class="font-semibold mb-2">${index + 1}. ${q.q}</p><div class="space-y-2">`;
        q.opts.forEach((opt, optIndex) => {
            quizHTML += `<div><input type="radio" name="q${index}" id="q${index}o${optIndex}" value="${optIndex}" class="mr-2 cursor-pointer"><label for="q${index}o${optIndex}" class="cursor-pointer">${opt}</label></div>`;
        });
        quizHTML += `</div></div>`;
    });
    quizHTML += `<button onclick='submitQuiz()' class="bg-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition">Submit Quiz</button></div>`;
    lessonContentArea.innerHTML = quizHTML;
}

function submitQuiz() {
    const lesson = window.courseData.lessons[currentLessonIndex];
    if (!lesson || lesson.type !== 'quiz') return;

    let questions = lesson.content;
    if (typeof questions === 'string') {
        try { questions = JSON.parse(questions); }
        catch (e) { console.error('Failed to parse quiz on submit:', e); return; }
    }

    const userAnswers = [];
    questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        userAnswers.push(selected ? parseInt(selected.value) : null);
    });

    renderQuizEvaluation(questions, userAnswers);
    showPage('quiz-evaluation-page');
}

function renderQuizEvaluation(questions, userAnswers) {
    const evalContainer = document.getElementById('evaluation-content');
    const summary = document.getElementById('quiz-result-summary');

    if (!evalContainer) {
        console.error("evaluation-content container not found!");
        return;
    }

    evalContainer.innerHTML = "";

    if (!questions || !questions.length) {
        evalContainer.innerHTML = "<p>No quiz data found. Please try again.</p>";
        return;
    }

    let score = 0;
    const total = questions.length;

    questions.forEach((q, i) => {
        const userAns = userAnswers[i];
        const correctAns = q.answer ?? q.ans ?? q.correctAnswer ?? null;

        const userAnswerText = (userAns !== null && q.opts && q.opts[userAns] !== undefined)
            ? String(q.opts[userAns]).trim()
            : "Not Answered";

        const correctAnswerText = (q.opts && q.opts[correctAns] !== undefined)
            ? String(q.opts[correctAns]).trim()
            : "Unknown";

        const isCorrect = userAns === correctAns;

        if (isCorrect) score++;

        evalContainer.innerHTML += `
            <div class="p-6 border rounded-xl mb-4 ${isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}">
                <h3 class="font-semibold mb-2">Q${i + 1}. ${q.q}</h3>
                <p><b>Your Answer:</b> 
                    <span class="${isCorrect ? 'text-green-600' : 'text-red-600'}">${userAnswerText}</span>
                </p>
                <p><b>Correct Answer:</b> ${correctAnswerText}</p>

                ${q.explanation || q.exp || q.explain ? 
                `<div class="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <b>Explanation:</b> ${q.explanation || q.exp || q.explain}
                </div>` 
                : ''}
            </div>
        `;
    });

    const percent = ((score / total) * 100).toFixed(2);
    if (summary) {
        summary.innerHTML = `You scored <b>${score}</b> out of <b>${total}</b> (${percent}%)`;
    }
}

// --- TOAST / NOTIFICATION ---
function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.padding = '12px 18px';
    toast.style.marginTop = '8px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    toast.style.transition = 'opacity 0.4s ease';
    toast.style.opacity = '1';
    toast.style.fontFamily = 'system-ui, sans-serif';

    switch (type) {
        case 'success':
            toast.style.background = '#16a34a';
            break;
        case 'error':
            toast.style.background = '#dc2626';
            break;
        case 'warning':
            toast.style.background = '#eab308';
            toast.style.color = '#222';
            break;
        default:
            toast.style.background = '#3b82f6';
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}

// --- ADMIN STATS ---
async function loadAdminStats() {
    const data = await apiRequest('admin_stats.php');

    if (!data || !data.success || !data.stats) {
        console.error("Invalid admin stats data:", data);
        showToast("Invalid data from server.", "error");
        return;
    }

    document.getElementById("total-users").textContent = data.stats.totalUsers || 0;
    document.getElementById("total-courses").textContent = data.stats.totalCourses || 0;
    document.getElementById("total-enrollments").textContent = data.stats.totalEnrollments || 0;

    if (enrollmentChartInstance) {
        enrollmentChartInstance.destroy();
    }

    const canvas = document.getElementById("enrollmentChart");
    if (!canvas) {
        console.error("Canvas #enrollmentChart not found");
        return;
    }

    const ctx = canvas.getContext("2d");

    const gradients = [
        ["#ff6384", "#ff9aa2"],
        ["#36a2eb", "#9ad0f5"],
        ["#ffcd56", "#ffe29a"],
        ["#4bc0c0", "#9be7e7"],
        ["#9966ff", "#cbb2ff"],
        ["#ff9f40", "#ffd3a6"],
        ["#00b894", "#55efc4"],
        ["#fd79a8", "#fab1a0"],
        ["#0984e3", "#74b9ff"],
        ["#e84393", "#fd79a8"]
    ];

    const barColors = data.chartData.map((_, i) => {
        const g = ctx.createLinearGradient(0, 0, 0, 400);
        const [start, end] = gradients[i % gradients.length];
        g.addColorStop(0, start);
        g.addColorStop(1, end);
        return g;
    });

    enrollmentChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.chartData.map(item => item.courseTitle),
            datasets: [{
                label: "Enrollments per Course",
                data: data.chartData.map(item => item.enrollCount),
                backgroundColor: barColors,
                borderColor: "rgba(0, 0, 0, 0.2)",
                borderWidth: 1,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1300, easing: "easeOutQuart" },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: "#333", font: { size: 13, weight: "bold" } },
                    grid: { color: "rgba(0, 0, 0, 0.05)" }
                },
                x: {
                    ticks: { color: "#333", font: { size: 12 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    labels: { color: "#222", font: { size: 14, weight: "bold" } }
                },
                tooltip: {
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    titleFont: { size: 14, weight: "bold" },
                    bodyFont: { size: 13 },
                    cornerRadius: 6,
                    padding: 12,
                }
            }
        }
    });
}

// --- ADMIN SECTIONS ---
function showAdminSection(sectionId) {
    document.querySelectorAll(".admin-section").forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("active");
    });

    document.querySelectorAll(".admin-nav-link").forEach(link => {
        link.classList.remove("bg-indigo-100");
        link.classList.add("hover:bg-indigo-50");
    });

    const target = document.getElementById(sectionId);
    if (!target) {
        console.error(`Section "${sectionId}" not found`);
        return;
    }

    target.classList.remove("hidden");
    target.classList.add("active");

    const activeLink = document.querySelector(`[onclick="showAdminSection('${sectionId}')"]`);
    if (activeLink) {
        activeLink.classList.add("bg-indigo-100");
        activeLink.classList.remove("hover:bg-indigo-50");
    }

    if (sectionId === "admin-overview") loadAdminStats();
    if (sectionId === "admin-users") renderAdminUsers();
    if (sectionId === "admin-courses") renderAdminCourses();
}

async function renderAdminUsers() {
    const data = await apiRequest('admin_users.php');
    const container = document.getElementById('user-list');
    if (!container) return;

    container.innerHTML = '';

    if (!data.success || !data.users || data.users.length === 0) {
        container.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-gray-500 py-4">No users found.</td>
        </tr>`;
        return;
    }

    data.users.forEach((user, index) => {
        const row = document.createElement('tr');
        row.className = 'border-b hover:bg-slate-50 transition';
        row.innerHTML = `
        <td class="p-4">${index + 1}</td>
        <td class="p-4">${user.id}</td>
        <td class="p-4 font-semibold">${user.name}</td>
        <td class="p-4">${user.email}</td>
        <td class="p-4 capitalize">${user.role}</td>`;
        container.appendChild(row);
    });
}

async function renderAdminCourses(searchTerm = '') {
    const container = document.getElementById('course-list-admin');
    if (!container) return;

    const data = await apiRequest('courses.php');
    container.innerHTML = '';

    if (!data.success || !data.courses || data.courses.length === 0) {
        container.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-slate-500 py-4">
            No courses available.
          </td>
        </tr>`;
        return;
    }

    const enrollData = await apiRequest('enrollments.php');
    const enrollments = enrollData.success ? enrollData.enrollments : [];

    const term = (searchTerm || '').toLowerCase();
    const filteredCourses = data.courses.filter(course => {
        return (
            course.title.toLowerCase().includes(term) ||
            (course.category && course.category.toLowerCase().includes(term))
        );
    });

    if (filteredCourses.length === 0) {
        container.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-slate-500 py-4">
            No matching courses found.
          </td>
        </tr>`;
        return;
    }

    filteredCourses.forEach(course => {
        const count = enrollments.filter(e => e.courseId == course.id).length;
        container.innerHTML += `
        <tr class="border-b hover:bg-slate-50 transition">
          <td class="p-4">${course.id}</td>
          <td class="p-4 font-semibold">${course.title}</td>
          <td class="p-4">${course.category || '—'}</td>
          <td class="p-4">${count}</td>
        </tr>`;
    });
}

// --- MAKE FUNCTIONS GLOBAL (for inline HTML handlers) ---
window.submitQuiz = submitQuiz;
window.returnToCoursePlayer = returnToCoursePlayer;
window.loadLesson = loadLesson;
window.openCoursePlayer = openCoursePlayer;
window.toggleEnrollment = toggleEnrollment;
window.showPage = showPage;
window.showAdminSection = showAdminSection;
window.renderCourses = renderCourses;
window.renderAdminUsers = renderAdminUsers;
window.renderAdminCourses = renderAdminCourses;

window.showAuthView = showAuthView;
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.handleVerifyOTP = handleVerifyOTP;
window.logout = logout;
window.toggleUserMenu = toggleUserMenu;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleChangePassword = handleChangePassword;
window.showDeleteAccountModal = showDeleteAccountModal;
window.hideDeleteAccountModal = hideDeleteAccountModal;
window.handleDeleteAccount = handleDeleteAccount;
window.toggleMobileMenu = toggleMobileMenu;
