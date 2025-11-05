<?php
require_once "cors.php";
require_once "db.php";

try {
    // ✅ Handle GET request (Admin – return all enrollments)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query("
            SELECT 
                e.id, 
                e.userId, 
                e.courseId, 
                u.name AS userName, 
                c.title AS courseTitle
            FROM enrollments e
            JOIN users u ON e.userId = u.id
            JOIN courses c ON e.courseId = c.id
        ");
        $enrollments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'enrollments' => $enrollments  // ✅ Key name expected by script.js
        ]);
        exit;
    }

    // ✅ Handle POST request (Student enroll / unenroll)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['userId'] ?? null;
        $courseId = $data['courseId'] ?? null;

        if (!$userId || !$courseId) {
            echo json_encode([
                'success' => false,
                'message' => 'Missing userId or courseId'
            ]);
            exit;
        }

        // Check if user is already enrolled
        $check = $pdo->prepare("SELECT id FROM enrollments WHERE userId = ? AND courseId = ?");
        $check->execute([$userId, $courseId]);
        $exists = $check->fetch();

        if ($exists) {
            // ✅ Unenroll
            $delete = $pdo->prepare("DELETE FROM enrollments WHERE id = ?");
            $delete->execute([$exists['id']]);
            echo json_encode([
                'success' => true,
                'message' => 'Unenrolled successfully'
            ]);
        } else {
            // ✅ Enroll
            $insert = $pdo->prepare("INSERT INTO enrollments (userId, courseId) VALUES (?, ?)");
            $insert->execute([$userId, $courseId]);
            echo json_encode([
                'success' => true,
                'message' => 'Enrolled successfully'
            ]);
        }
        exit;
    }

    // ✅ Handle OPTIONS preflight request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header("Access-Control-Allow-Origin: http://localhost:3000");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
        exit(0);
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
