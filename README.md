# EduVerse: A Full-Stack E-Learning Portal

**Live Demo: [https://eduverse.rf.gd](https://eduverse.rf.gd)**

---

## 1. About This Project

EduVerse is a full-stack, database-driven E-learning portal built from scratch as a capstone project for a web development internship at **Apex Planet Software Pvt. Ltd.**

This application allows users to register, log in, browse, and enroll in courses. It features a complete role-based authentication system, a student-facing dashboard, and a full administrative panel with site analytics.

## 2. Key Features

* **Secure Authentication:** Full registration and login system.
* **Email OTP Verification:** New users must verify their email with an OTP sent via PHPMailer.
* **Role-Based Access Control:**
    * **Student View:** Can browse courses, enroll, and view their dashboard ("My Dashboard").
    * **Admin View:** Can access a separate admin panel to manage the site.
* **Admin Dashboard:**
    * **Site Analytics:** Displays "Total Users," "Total Courses," and "Total Enrollments."
    * **Enrollment Analytics:** A dynamic bar chart (using Chart.js) showing the most popular courses.
    * **User Management:** A table to view all registered users.
    * **Course Management:** A table to view all courses.
* **Account Management:**
    * **Profile Page:** Users can view their profile details.
    * **Change Password:** Securely update an existing password.
    * **Delete Account:** A secure, modal-confirmed process to delete a user and all their associated data (e.g., enrollments).
* **AJAX-Powered Search:** A real-time search bar to filter the course catalog without a page reload.
* **CI/CD Deployment:** The repository is linked to the live host. Every `git push` to the `master` branch automatically deploys the changes using a **GitHub Actions** workflow.

## 3. Technologies Used

* **Frontend:** HTML5, Tailwind CSS, JavaScript (ES6+)
* **Backend:** PHP
* **Database:** MySQL
* **PHP Libraries:**
    * [**PHPMailer**](https://github.com/PHPMailer/PHPMailer): For sending transactional emails (OTP).
    * [**Composer**](https://getcomposer.org/): For managing PHP dependencies.
* **JavaScript Libraries:**
    * [**Chart.js**](https://www.chartjs.org/): For data visualization in the admin dashboard.
* **Deployment:**
    * **Hosting:** InfinityFree
    * **CI/CD:** GitHub Actions (FTP Deploy)

## 4. How to Run This Project Locally

To run this project on your own local machine (like XAMPP):

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Arijit-Podder636/elearning_website.git
    cd elearning_website
    ```

2.  **Install PHP Dependencies:**
    You must have Composer installed. Run this in the project root to install PHPMailer.
    ```bash
    composer install
    ```
    This will create the `vendor` folder.

3.  **Database Setup:**
    * Open phpMyAdmin (e.g., `http://localhost/phpmyadmin`).
    * Create a new database named `elearning`.
    * Import the `database.sql` file (Note: You'll need to export and add this file to your repo) into your new database.

4.  **Create Configuration File:**
    * Go to the `api` folder.
    * Create a new file named `config.php`.
    * Copy and paste the following, filling in your local and email credentials:

    ```php
    <?php
    // --- DATABASE CREDENTIALS ---
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'elearning');
    define('DB_USER', 'root');
    define('DB_PASS', ''); // Your XAMPP password (usually empty)
    
    // --- GMAIL APP PASSWORD (for PHPMailer) ---
    define('GMAIL_USER', 'your-email@gmail.com');
    define('GMAIL_PASS', 'your-16-digit-app-password'); 
    ?>
    ```

5.  **Run:**
    Open your browser and navigate to `http://localhost/elearning/`. The application should now be fully functional.
```eof
