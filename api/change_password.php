<?php
require_once "cors.php";
require_once "db.php"; // Your PDO connection ($pdo)

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['userId'] ?? null;
$currentPassword = $data['currentPassword'] ?? null;
$newPassword = $data['newPassword'] ?? null;

header('Content-Type: application/json');

if (empty($userId) || empty($currentPassword) || empty($newPassword)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

try {
    // 1. Get the user's current hashed password
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit;
    }

    // 2. Verify the CURRENT password is correct
    if (password_verify($currentPassword, $user['password'])) {

        // 3. Hash the NEW password
        $new_hashed_password = password_hash($newPassword, PASSWORD_BCRYPT);

        // 4. Update the password in the database
        $update_stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
        if ($update_stmt->execute([$new_hashed_password, $userId])) {
            echo json_encode(['success' => true, 'message' => 'Password updated successfully.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update password.']);
        }

    } else {
        // Current password was wrong
        echo json_encode(['success' => false, 'message' => 'Incorrect current password.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>