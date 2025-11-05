<?php
require_once "cors.php";
require_once "db.php";


try {
    $search = $_GET['search'] ?? '';
    $stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ?");
    $stmt->execute(['%' . $search . '%', '%' . $search . '%']);
    $users = $stmt->fetchAll();
    echo json_encode(['success' => true, 'users' => $users]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>

