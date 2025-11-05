<?php
require_once "cors.php";
require_once "db.php";


try {
    // ✅ Database connection (your actual DB)
    $pdo = new PDO("mysql:host=localhost;dbname=elearning", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ✅ Ensure numeric results even if empty
    $totalUsers = (int)$pdo->query("SELECT COUNT(id) FROM users")->fetchColumn();
    $totalCourses = (int)$pdo->query("SELECT COUNT(id) FROM courses")->fetchColumn();
    $totalEnrollments = (int)$pdo->query("SELECT COUNT(id) FROM enrollments")->fetchColumn();

    // ✅ Fetch chart data (Courses vs Enrollments)
    $chartQuery = $pdo->prepare("
        SELECT 
            c.title AS courseTitle, 
            COUNT(e.id) AS enrollCount
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.courseId
        GROUP BY c.id, c.title
        ORDER BY enrollCount DESC
    ");
    $chartQuery->execute();
    $chartData = $chartQuery->fetchAll(PDO::FETCH_ASSOC);

    // ✅ Return JSON
    echo json_encode([
        'success' => true,
        'stats' => [
            'totalUsers' => $totalUsers,
            'totalCourses' => $totalCourses,
            'totalEnrollments' => $totalEnrollments
        ],
        'chartData' => $chartData
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database query failed.',
        'error' => $e->getMessage()
    ]);
}
?>
