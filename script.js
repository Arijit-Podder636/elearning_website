UPDATED SCRIPT.JS


// --- STATE MANAGEMENT ---
let currentUser = null;
let currentCourseId = null;
let currentLessonIndex = 0;

// ✅ Global chart instance to prevent multiple canvas conflicts
let enrollmentChartInstance = null;


// --- DOM ELEMENTS ---
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
const API_BASE_URL = "api/";
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        showToast('A network or server error occurred. Please check the console.', 'error');
        return { success: false, message: 'Network error.' };
    }
}





// --- Robust startup + real-time course search (drop-in) ---

// Debounce helper to avoid firing API on every keystroke
function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}







// Restore session user on page load (if any)
window.addEventListener('load', () => {
  try {
    const stored = sessionStorage.getItem('currentUser');
    if (stored) {
      currentUser = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Could not parse stored currentUser:', e);
  }

  // --- ⬇️ THIS IS THE FIX ⬇️ ---
  // Show appropriate page after restoring user
  if (currentUser) {
    // Check the user's role on load
    if (currentUser.role === 'admin') {
        showPage('admin-page'); // Admins go to the admin page
    } else {
        showPage('home-page'); // Students go to the home page
    }
  } else {
    showPage('auth-page');
  }
  // --- ⬆️ END OF FIX ⬆️ ---

  // Attach real-time search (debounced)
  const sb = document.getElementById('search-bar');
  if (sb) {
    sb.addEventListener('input', debounce((e) => {
      // use trimmed value
      const q = (e.target.value || '').trim();
      renderCourses(q);
    }, 300));
  } else {
    console.warn('#search-bar element not found');
  }
});








// --- PAGE NAVIGATION ---
function showPage(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    window.scrollTo(0, 0);

    appContainer.classList.add('container', 'mx-auto', 'max-w-screen-2xl');
    
    // Desktop nav links
    const homeLink = document.querySelector('[onclick="showPage(\'home-page\')"]');
    const dashboardLink = document.querySelector('[onclick="showPage(\'dashboard-page\')"]');
    const adminLink = document.getElementById('admin-link');

    // Mobile nav links
    const mobileHomeLink = document.getElementById('mobile-home-link');
    const mobileDashboardLink = document.getElementById('mobile-dashboard-link');
    const adminLinkMobile = document.getElementById('admin-link-mobile');


        if (currentUser) {
        // Show header and greet user
        header.classList.remove('hidden');
        header.classList.add('flex');
        document.getElementById('user-greeting').textContent = `${currentUser.name.split(' ')[0]}`;
        
        const isAdmin = currentUser.role === 'admin';
        
        // Desktop links
        if (homeLink) homeLink.classList.toggle('hidden', isAdmin);
        if (dashboardLink) dashboardLink.classList.toggle('hidden', isAdmin);
        if (adminLink) adminLink.classList.toggle('hidden', !isAdmin);

        // Mobile links
        if (mobileHomeLink) mobileHomeLink.classList.toggle('hidden', isAdmin);
        if (mobileDashboardLink) mobileDashboardLink.classList.toggle('hidden', isAdmin);
        if (adminLinkMobile) adminLinkMobile.classList.toggle('hidden', !isAdmin);

    } else {
        // No user, hide header
        header.classList.add('hidden');
        header.classList.remove('flex');
    }

    // Load content for the specific page
    if(pageId === 'home-page') renderCourses();
    if(pageId === 'dashboard-page') renderDashboard();
    if(pageId === 'admin-page') showAdminSection('admin-overview');
    if(pageId === 'profile-page') renderProfilePage();
}







// --- AUTHENTICATION ---
function showAuthView(viewName) {
    // Hide all auth views
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('register-view').classList.add('hidden');
    
    // Make sure the otp-view element exists before trying to hide it
    const otpView = document.getElementById('otp-view');
    if (otpView) {
        otpView.classList.add('hidden');
    }

    // Clear all error messages
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    
    const otpError = document.getElementById('otp-error');
    if (otpError) {
        otpError.textContent = ''; // Clear OTP error
    }

    // Show the requested view
    if (viewName === 'login') {
        document.getElementById('login-view').classList.remove('hidden');
    } else if (viewName === 'register') {
        document.getElementById('register-view').classList.remove('hidden');
    } else if (viewName === 'otp' && otpView) {
        otpView.classList.remove('hidden');
    }
}





async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const response = await apiRequest('login.php', 'POST', { email, password });

    if (response.success) {
        currentUser = response.user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        if (currentUser.role === 'admin') {
            // 🔥 Admin detected — show only admin dashboard
            showPage('admin-page');
            loadAdminStats();

            // Hide unnecessary pages and navigation links
            document.getElementById('home-page')?.classList.add('hidden');
            document.getElementById('dashboard-page')?.classList.add('hidden');
            document.getElementById('course-player-page')?.classList.add('hidden');

            // Hide "Home" and "My Dashboard" links in header
            document.querySelector('[onclick="showPage(\'home-page\')"]')?.classList.add('hidden');
            document.querySelector('[onclick="showPage(\'dashboard-page\')"]')?.classList.add('hidden');

            // Show admin nav link
            document.getElementById('admin-link')?.classList.remove('hidden');

            // Show header and hide auth page
            document.getElementById('header').classList.remove('hidden');
            document.getElementById('auth-page').classList.remove('active');
            document.getElementById('auth-page').classList.add('hidden');

            showToast('Logged in as Admin');
        } else {
            // 🧑‍🎓 Normal user flow
            showPage('home-page');
        }
    } else {
        // --- ⬇️ THIS IS THE UPDATED PART ⬇️ ---

        // 1. Show the error message from the server
        errorEl.textContent = response.message || 'Login failed.';
        
        // 2. (NEW) Check if the error is the "not verified" message
        if (response.message && response.message.includes('not verified')) {
            // If it is, redirect the user to the OTP form!
            
            // 3. Put the email they just typed into the hidden OTP form
            document.getElementById('otp-email').value = email;
            
            // 4. Show the OTP verification view
            showAuthView('otp');
        }
        
    }
}






// ✅ Prevent admin from seeing user pages like Home/Dashboard
function restrictAdminAccess() {
    if (currentUser && currentUser.role === 'admin') {
        const userTabs = ['home-page', 'dashboard-page', 'course-player-page'];
        userTabs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        const homeLink = document.getElementById('home-link');
        const dashboardLink = document.getElementById('dashboard-link');
        if (homeLink) homeLink.remove();
        if (dashboardLink) dashboardLink.remove();
    }
}





async function handleRegistration() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');

    const response = await apiRequest('register.php', 'POST', { name, email, password });
    
    if (response.success) {
        // --- THIS IS THE UPDATED PART ---
        // 1. Show the success toast from the server (e.g., "Check your email...")
        showToast(response.message, 'success');
        
        // 2. Store the email in our new hidden OTP form
        document.getElementById('otp-email').value = email;

        // 3. Show the OTP verification view
        showAuthView('otp');
        // --- END OF UPDATE ---
    } else {
        errorEl.textContent = response.message || 'Registration failed.';
    }
}




// --- ADD THIS NEW FUNCTION ---
async function handleVerifyOTP() {
    const email = document.getElementById('otp-email').value;
    const otp = document.getElementById('otp-code').value;
    const errorEl = document.getElementById('otp-error');

    if (!otp || otp.length !== 6) {
        errorEl.textContent = 'Please enter a valid 6-digit OTP.';
        return;
    }

    const response = await apiRequest('verify_otp.php', 'POST', { email, otp });

    if (response.success) {
        // Success!
        showToast(response.message, 'success');
        
        // Clear the form and send user to the login view
        document.getElementById('otp-code').value = '';
        document.getElementById('otp-email').value = '';
        showAuthView('login');
    } else {
        // Failed
        errorEl.textContent = response.message || 'OTP verification failed.';
    }
}



// --- ADD THESE NEW FUNCTIONS ---

// This fills the profile page with user data
function renderProfilePage() {
    if (!currentUser) {
        showPage('auth-page'); // Not logged in, send to login
        return;
    }

    // Fill the text fields
    document.getElementById('profile-name').innerText = currentUser.name;
    document.getElementById('profile-email').innerText = currentUser.email;

    // Clear any old password errors
    document.getElementById('password-error').innerText = '';
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

// This handles the password change form
async function handleChangePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorEl = document.getElementById('password-error');

    // Client-side validation
    if (newPassword !== confirmPassword) {
        errorEl.innerText = 'New passwords do not match.';
        return;
    }
    if (newPassword.length < 6) {
        errorEl.innerText = 'Password must be at least 6 characters.';
        return;
    }

    const response = await apiRequest('change_password.php', 'POST', {
        userId: currentUser.id,
        currentPassword: currentPassword,
        newPassword: newPassword
    });

    if (response.success) {
        showToast('Password updated successfully!', 'success');
        // Clear the form
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        errorEl.innerText = '';
    } else {
        errorEl.innerText = response.message || 'An error occurred.';
    }
}



// --- ADD THESE THREE NEW FUNCTIONS ---

function showDeleteAccountModal() {
    // First, close the user menu if it's open
    document.getElementById('user-menu').classList.add('hidden');
    
    // Then, show the modal
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideDeleteAccountModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleDeleteAccount() {
    if (!currentUser) {
        showToast('You must be logged in to do that.', 'error');
        return;
    }

    // Send the request to your 'delete_account.php' script
    const response = await apiRequest('delete_account.php', 'POST', { userId: currentUser.id });

    if (response.success) {
        showToast('Your account has been successfully deleted.', 'success');
        // Hide the modal and log the user out
        hideDeleteAccountModal();
        logout(); // Call logout to clear session and go to login page
    } else {
        showToast(response.message || 'An error occurred.', 'error');
        hideDeleteAccountModal();
    }
}




function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');

    // --- ⬇️ ADD THESE TWO LINES ⬇️ ---
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    // --- ⬆️ END OF FIX ⬆️ ---
    showPage('auth-page');
}


// --- ADD THIS NEW FUNCTION ---
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (input.type === 'password') {
        // Show password
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        // Hide password
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}




function toggleUserMenu() { 
    document.getElementById('user-menu').classList.toggle('hidden'); 
}
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-nav');
    if (!menu) return;
    menu.classList.toggle('hidden');
}

// --- COURSE & DASHBOARD RENDERING ---
async function renderCourses(filter = '') {
    // ✅ Trim the search text safely
    filter = (filter || '').toString().trim();

    // ✅ Prevent errors if user is not logged in yet
    const userId = (currentUser && currentUser.id) ? currentUser.id : 0;

    // ✅ Encode filter to avoid URL issues (spaces, symbols, etc.)
    const encodedFilter = encodeURIComponent(filter);

    // ✅ Make the API call safely
    const response = await apiRequest(`courses.php?search=${encodedFilter}&userId=${userId}`);

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
    const response = await apiRequest(`courses.php?enrolledOnly=true&userId=${currentUser.id}`);
    enrolledCoursesContainer.innerHTML = '';
    if(!response.success || response.courses.length === 0) {
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
    const response = await apiRequest('enrollments.php', 'POST', { userId: currentUser.id, courseId: courseId });
    if (response.success) {
        showToast(response.message, 'success');
        renderCourses(searchBar.value);
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
    courseTitleSidebarEl.textContent = course.title;
    curriculumSidebar.innerHTML = '';
    lessons.forEach((lesson, index) => {
        const icon = lesson.type === 'video' ? 'fa-play-circle' : 'fa-question-circle';
        const item = `
            <div id="lesson-item-${index}" onclick="loadLesson(${index})" class="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer transition">
                <i class="fas ${icon} text-slate-500"></i>
                <span class="text-sm font-medium">${lesson.title}</span>
            </div>`;
        curriculumSidebar.innerHTML += item;
    });
    window.courseData = { course, lessons };
    showPage('course-player-page');
    loadLesson(0);
}

function loadLesson(lessonIndex) {
    if (!window.courseData) return;
    currentLessonIndex = lessonIndex;
    
    document.querySelectorAll('#curriculum-sidebar > div').forEach((el, idx) => {
        el.classList.toggle('bg-indigo-100', idx === lessonIndex);
        el.querySelector('i').classList.toggle('text-indigo-600', idx === lessonIndex);
        el.querySelector('i').classList.toggle('text-slate-500', idx !== lessonIndex);
    });

    const { lessons } = window.courseData;
    const lesson = lessons[lessonIndex];
    lessonTitleEl.textContent = lesson.title;

    if (lesson.type === 'video') {
        lessonContentArea.innerHTML = `<div class="aspect-video"><iframe src="${lesson.content}?autoplay=1&mute=1&modestbranding=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
    } else if (lesson.type === 'quiz') {
        try {
            let quizData = lesson.content;
            if (typeof quizData === "string") {
                try {
                    quizData = JSON.parse(quizData);
                } catch (e) {
                    console.error("Quiz JSON parsing error:", e, "Raw content:", lesson.content);
                    alert("Error Loading Quiz\nCould not load the quiz because the data is malformed.");
                    return;
                }
            }
            renderQuiz(quizData);
        } catch(e) {
            console.error("Quiz JSON parsing error:", e, "Raw content:", lesson.content);
            lessonContentArea.innerHTML = `<div class="p-6 text-red-600">
                <h3 class="font-bold">Error Loading Quiz</h3>
                <p>Could not load the quiz because the data is malformed. Please check the console for technical details.</p>
            </div>`;
        }
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

// --- QUIZ SUBMIT & EVALUATION ---
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

    console.log("Submitting quiz with:", { questions, userAnswers });
    renderQuizEvaluation(questions, userAnswers);
    showPage('quiz-evaluation-page');
}

// --- TOAST / NOTIFICATION HELPER ---
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

// 🆕 --- ADMIN STATS FETCH FUNCTION ---
async function loadAdminStats() {
  try {
    const data = await apiRequest('admin_stats.php');
    console.log("✅ Admin Stats Response:", data);

    if (data && data.success && data.stats) {
      // ✅ Update numeric stats
      document.getElementById("total-users").textContent = data.stats.totalUsers || 0;
      document.getElementById("total-courses").textContent = data.stats.totalCourses || 0;
      document.getElementById("total-enrollments").textContent = data.stats.totalEnrollments || 0;

      // ✅ Destroy previous chart instance if exists
        if (window.enrollmentChartInstance) {
            window.enrollmentChartInstance.destroy();
        }

    // ✅ Make sure canvas element exists
    const canvas = document.getElementById("enrollmentChart");
    if (!canvas) {
        console.error("Canvas element #enrollmentChart not found!");
        return;
    }

    // ✅ Get 2D context (no red error now)
    const ctx = canvas.getContext("2d");

    // 🌈 Create rainbow gradient colors for each bar
    const gradients = [
        ["#ff6384", "#ff9aa2"], // Pink
        ["#36a2eb", "#9ad0f5"], // Blue
        ["#ffcd56", "#ffe29a"], // Yellow
        ["#4bc0c0", "#9be7e7"], // Teal
        ["#9966ff", "#cbb2ff"], // Purple
        ["#ff9f40", "#ffd3a6"], // Orange
        ["#00b894", "#55efc4"], // Green
        ["#fd79a8", "#fab1a0"], // Coral
        ["#0984e3", "#74b9ff"], // Sky Blue
        ["#e84393", "#fd79a8"]  // Rose
    ];

    // ✅ Generate gradient fills dynamically for each bar
    const barColors = data.chartData.map((_, i) => {
        const g = ctx.createLinearGradient(0, 0, 0, 400);
        const [start, end] = gradients[i % gradients.length];
        g.addColorStop(0, start);
        g.addColorStop(1, end);
        return g;
    });

    window.enrollmentChartInstance = new Chart(ctx, {
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






    } else {
      console.error("❌ Invalid data format:", data);
      showToast("Invalid data format from server.", "error");
    }
  } catch (error) {
    console.error("❌ Error fetching admin stats:", error);
    showToast("Failed to load admin stats. Check console.", "error");
  }
}


// ✅ --- ADMIN SECTION CONTROL (Final Polished Version) ---
function showAdminSection(section) {
  // Hide all admin sections
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  // Show selected section
  const activeSection = document.getElementById(`admin-${section}`);
  if (activeSection) activeSection.classList.remove('hidden');

  // Update active sidebar button
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.classList.remove('bg-indigo-100');
  });
  const activeLink = document.querySelector(`[onclick="showAdminSection('${section}')"]`);
  if (activeLink) activeLink.classList.add('bg-indigo-100');

  // Load data for selected tab
  if (section === 'overview') {
    loadAdminStats();
  } else if (section === 'users') {
    renderAdminUsers();
  } else if (section === 'courses') {
    renderAdminCourses();
  }
}




// ✅ --- RENDER USERS TABLE ---
async function renderAdminUsers() {
  try {
    const data = await apiRequest('admin_users.php');
    console.log("✅ Users API Response:", data);

    const container = document.getElementById('user-list');
    if (!container) {
      console.error("❌ user-list element not found!");
      return;
    }

    container.innerHTML = ''; // Clear old content

    if (!data.success || !data.users || data.users.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-gray-500 py-4">No users found.</td> </tr>`;
      return;
    }

    // ✅ Render all users
    data.users.forEach((user, index) => { // ADDED "index" HERE
      const row = document.createElement('tr');
      row.className = 'border-b hover:bg-slate-50 transition';
      row.innerHTML = `
        <td class="p-4">${index + 1}</td> <td class="p-4">${user.id}</td>
        <td class="p-4 font-semibold">${user.name}</td>
        <td class="p-4">${user.email}</td>
        <td class="p-4 capitalize">${user.role}</td>
      `;
      container.appendChild(row);
    });

  } catch (error) {
    console.error("❌ Error rendering users:", error);
  }
}




// ✅ Render Admin Courses with Search by Title or Category
async function renderAdminCourses(searchTerm = '') {
  try {
    const data = await apiRequest('courses.php');
    const container = document.getElementById('course-list-admin');
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

    // Fetch all enrollments for counting
    const enrollData = await apiRequest('enrollments.php');
    const enrollments = enrollData.success ? enrollData.enrollments : [];

    // 🔍 Filter by title or category (case-insensitive)
    const filteredCourses = data.courses.filter(course => {
      const term = searchTerm.toLowerCase();
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

    // Render filtered courses
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
  } catch (error) {
    console.error('❌ Error rendering admin courses:', error);
    const container = document.getElementById('course-list-admin');
    container.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-red-500 py-4">
          Failed to load courses. Please try again later.
        </td>
      </tr>`;
  }
}

// ✅ Attach event listener AFTER DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('course-search-bar-admin');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderAdminCourses(e.target.value.trim());
    });
  }

  // Initial load
  renderAdminCourses();
});


// 🎯 Real-time admin course search
document.getElementById('admin-course-search')?.addEventListener('input', (e) => {
  renderAdminCourses(e.target.value);
});






function showAdminSection(sectionId) {
  // Hide all admin sections
  document.querySelectorAll(".admin-section").forEach(sec => {
    sec.classList.add("hidden");
    sec.classList.remove("active");
  });

  // Highlight correct sidebar button
  document.querySelectorAll(".admin-nav-link").forEach(link => {
    link.classList.remove("bg-indigo-100");
    link.classList.add("hover:bg-indigo-50");
  });

  const target = document.getElementById(sectionId);
  if (!target) {
    console.error(`❌ Section with ID "${sectionId}" not found!`);
    return;
  }

  // Show the selected section
  target.classList.remove("hidden");
  target.classList.add("active");

  // Highlight the active sidebar link
  const activeLink = document.querySelector(`[onclick="showAdminSection('${sectionId}')"]`);
  if (activeLink) {
    activeLink.classList.add("bg-indigo-100");
    activeLink.classList.remove("hover:bg-indigo-50");
  }

  // Load corresponding data
  if (sectionId === "admin-overview") loadAdminStats();
  if (sectionId === "admin-users") renderAdminUsers();
  if (sectionId === "admin-courses") renderAdminCourses();
}




function renderQuizEvaluation(questions, userAnswers) {
    console.log("renderQuizEvaluation called", { questions, userAnswers });

    const evalContainer = document.getElementById('evaluation-content');
    const summary = document.getElementById('quiz-result-summary');

    if (!evalContainer) {
        console.error("❌ evaluation-content container not found!");
        return;
    }

    evalContainer.innerHTML = ""; // clear previous results

    if (!questions || !questions.length) {
        evalContainer.innerHTML = "<p>No quiz data found. Please try again.</p>";
        return;
    }

    // Calculate score
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
    summary.innerHTML = `You scored <b>${score}</b> out of <b>${total}</b> (${percent}%)`;

    console.log("✅ Rendered Quiz Evaluation successfully");
}







// --- MAKE FUNCTIONS GLOBAL ---
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
window.toggleMobileMenu = toggleMobileMenu;

// --- ADD THESE NEW FUNCTIONS ---
window.showAuthView = showAuthView; 
window.handleRegistration = handleRegistration;
window.handleLogin = handleLogin;
window.handleVerifyOTP = handleVerifyOTP; 
window.logout = logout;
window.loginAsAdmin = loginAsAdmin;
window.toggleUserMenu = toggleUserMenu;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleChangePassword = handleChangePassword;
window.showDeleteAccountModal = showDeleteAccountModal;
window.hideDeleteAccountModal = hideDeleteAccountModal;
window.handleDeleteAccount = handleDeleteAccount;
