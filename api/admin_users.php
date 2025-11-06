<?php
require_once "cors.php";
require_once "db.php"; // <-- THIS WAS THE MISSING LINE!

header('Content-Type: application/json'); // Set header for JSON

try {
    // The $pdo object is now available from db.php
    $stmt = $pdo->query("SELECT id, name, email, role FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "users" => $users
    ]);

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error",
        "error" => $e->getMessage()
    ]);
}
?>
