<?php
// reset_admin.php — run once, then delete this file
require 'api/db.php'; // adjust path if needed

$newPlain = 'admin'; // change this to whatever you want
$newHash = password_hash($newPlain, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
$stmt->execute([$newHash, 'admin@example.com']);

echo "Admin password reset to '{$newPlain}' (hashed). Row count: " . $stmt->rowCount();
