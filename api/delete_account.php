<?php
require_once "cors.php";
require_once "db.php"; // Your PDO connection ($pdo)

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['userId'] ?? null;

header('Content-Type: application/json');

if (empty($userId)) {
    echo json_encode(['success' => false, 'message' => 'User ID not provided.']);
    exit;
}

try {
    // --- THIS IS THE CRITICAL PART ---
    // We must delete the user's data from all other tables FIRST
    // before we can delete them from the 'users' table.
    
    // 1. Delete user from 'enrollments' table
    // (If your table is named differently, you MUST change "enrollments" and "user_id")
    $stmt_enrollments = $pdo->prepare("DELETE FROM enrollments WHERE userId = ?");
    $stmt_enrollments->execute([$userId]);
    
    // 2. (Add other deletes here if needed, e.g., 'user_progress', etc.)

    // 3. Finally, delete the user from the 'users' table
    $stmt_user = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt_user->execute([$userId]);
    
    // Check if the user was actually deleted
    if ($stmt_user->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Account deleted successfully.']);
    } else {
        // This might happen if the user_id was wrong
        echo json_encode(['success' => false, 'message' => 'User not found.']);
    }

} catch (PDOException $e) {
    // Catch any database errors
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>