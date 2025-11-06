<?php
require_once "cors.php";
require_once "db.php"; // This file creates the $pdo object for you!

// We can now use the $pdo object directly because db.php already made it.

try {
    // 1. Get stats
    $totalUsers = (int)$pdo->query("SELECT COUNT(id) FROM users")->fetchColumn();
    $totalCourses = (int)$pdo->query("SELECT COUNT(id) FROM courses")->fetchColumn();
    $totalEnrollments = (int)$pdo->query("SELECT COUNT(id) FROM enrollments")->fetchColumn();

    // 2. Fetch chart data
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

    // 3. Return JSON
    header('Content-Type: application/json'); // Make sure to send as JSON
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
    // This will catch query errors
    header('Content-Type: application/json'); // Make sure to send as JSON
    echo json_encode([
        'success' => false,
        'message' => 'Database query failed.',
        'error' => $e->getMessage()
    ]);
}
?>
