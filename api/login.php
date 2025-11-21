<?php
require_once "cors.php";
require_once "db.php";

header('Content-Type: application/json');

// Decode JSON body
$data = json_decode(file_get_contents('php://input'), true);

if (empty($data)) {
    echo json_encode(['success' => false, 'message' => 'Invalid request. No data received.']);
    exit;
}

$email = $data['email'] ?? null;
$password = $data['password'] ?? null;

if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC); // Use FETCH_ASSOC to work with array keys

    // 1. Check if user exists AND password is correct
if ($user && password_verify($password, $user['password'])) {

    // ✅ Admin OR verified student → login allowed
    if ($user['role'] === 'admin' || $user['is_verified'] == 1) {

        unset($user['password']);

        echo json_encode([
            'success' => true,
            'user' => [
                'id'    => $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role']
            ]
        ]);
        exit;   // <-- important so nothing extra prints

    } else {
        // ❌ Student exists and password correct, but NOT verified
        echo json_encode([
            'success' => false,
            'message' => 'Your account is not verified. Please check your email (and spam folder) for the verification code.'
        ]);
        exit;   // <-- important
    }
}


    } else {
        // --- FAILED (BAD LOGIN) ---
        // User not found or password was wrong
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    }
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>
