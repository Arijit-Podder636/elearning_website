<?php

require_once "cors.php";
require_once "db.php";

// Get courseId from GET parameters
$courseId = $_GET['courseId'] ?? null;

if (empty($courseId)) {
    echo json_encode(['success' => false, 'message' => 'Course ID is required.']);
    exit;
}

try {
    // Fetch course details
    $courseStmt = $pdo->prepare("SELECT * FROM courses WHERE id = ?");
    $courseStmt->execute([$courseId]);
    $course = $courseStmt->fetch(PDO::FETCH_ASSOC);

    if (!$course) {
        echo json_encode(['success' => false, 'message' => 'Course not found.']);
        exit;
    }

    // Fetch lessons
    $lessonsStmt = $pdo->prepare("SELECT * FROM lessons WHERE courseId = ? ORDER BY id ASC");
    $lessonsStmt->execute([$courseId]);
    $lessons = $lessonsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Decode quiz JSON content properly (preserving q, opts, ans, explanation)
    foreach ($lessons as &$lesson) {
        if ($lesson['type'] === 'quiz') {
            $decoded = json_decode($lesson['content'], true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                foreach ($decoded as &$q) {
                    // Normalize key names so frontend gets consistent fields
                    if (isset($q['explanation'])) {
                        $q['exp'] = $q['explanation']; // ensure explanation is available
                    }
                    if (!isset($q['ans']) && isset($q['answer'])) {
                        $q['ans'] = $q['answer']; // ensure answer index is available
                    }
                }
                $lesson['content'] = $decoded;
            } else {
                $lesson['content'] = [];
            }
        }
    }

    echo json_encode([
        'success' => true,
        'course' => $course,
        'lessons' => $lessons
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
