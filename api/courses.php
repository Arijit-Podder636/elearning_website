<?php
require_once "cors.php";
require_once "db.php";

try {
    // Read and normalize search term
    $rawSearch = $_GET['search'] ?? '';
    $search = trim($rawSearch);
    // Use lowercase search pattern for case-insensitive matching
    $searchParam = '%' . mb_strtolower($search, 'UTF-8') . '%';

    if (isset($_GET['admin'])) {
        // Admin view: include enrollment counts
        $sql = "
            SELECT 
                c.id,
                c.title,
                c.category,
                c.image,
                c.rating,
                c.instructor,
                COUNT(e.id) AS enrollments
            FROM courses c
            LEFT JOIN enrollments e ON c.id = e.courseId
            WHERE (LOWER(c.title) LIKE :search OR LOWER(c.category) LIKE :search OR LOWER(c.instructor) LIKE :search)
            GROUP BY c.id, c.title, c.category, c.image, c.rating, c.instructor
            ORDER BY c.id ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':search' => $searchParam]);
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'courses' => $courses,
            // debug: remove this in production if not needed
            'debug' => ['received_search' => $rawSearch]
        ]);
    } else {
        // Student view: include user's enrollment status
        $userId = $_GET['userId'] ?? 0;
        $enrolledOnly = $_GET['enrolledOnly'] ?? 'false';

        $sql = "
            SELECT 
                c.id,
                c.title,
                c.category,
                c.image,
                c.rating,
                c.instructor,
                COUNT(e2.id) AS students,
                CASE WHEN e1.id IS NOT NULL THEN 1 ELSE 0 END AS isEnrolled
            FROM courses c
            LEFT JOIN enrollments e1 ON c.id = e1.courseId AND e1.userId = ?
            LEFT JOIN enrollments e2 ON c.id = e2.courseId
        ";

        $params = [$userId];

        if ($enrolledOnly === 'true') {
            // If filtering to enrolled-only, ignore text search (keeps previous behaviour)
            $sql .= " WHERE e1.id IS NOT NULL";
        } else {
            // Case-insensitive search on title, category and instructor
            $sql .= " WHERE (LOWER(c.title) LIKE ? OR LOWER(c.category) LIKE ? OR LOWER(c.instructor) LIKE ?)";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        $sql .= " GROUP BY c.id, c.title, c.category, c.image, c.rating, c.instructor
                  ORDER BY c.id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'courses' => $courses,
            // debug: remove this in production if not needed
            'debug' => ['received_search' => $rawSearch, 'userId' => (int)$userId]
        ]);
    }

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
