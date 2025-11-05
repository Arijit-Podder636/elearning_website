<?php
require_once 'config.php'; // This loads DB_HOST, DB_NAME, etc.

// 1. Use the constants (not variables) and add a charset
$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     // 2. Use the constants DB_USER and DB_PASS
     $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);

} catch (\PDOException $e) {
     // 3. If connection fails, send a clean JSON error
     header('Content-Type: application/json');
     http_response_code(500); // Internal Server Error
     
     echo json_encode([
        'success' => false, 
        'message' => 'Database connection failed. Check api/config.php.'
        // 'debug' => $e->getMessage() // You can uncomment this for debugging
     ]);
     exit;
}
?>