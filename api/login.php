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

        // --- ⬇️ UPDATED LOGIC TO BYPASS ADMIN OTP ⬇️ ---
        
        // 2. Check user's role. If 'admin', log them in directly.
        if ($user['role'] == 'admin') {
            
            // --- ADMIN SUCCESS ---
            unset($user['password']); 
            
            $response = [
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'] 
                ]
            ];
            
            echo json_encode($response);
        
        // 3. If user is NOT an admin, check if they are verified.
        } elseif ($user['is_verified'] == 1) {
            
            // --- STUDENT SUCCESS (Verified) ---
            unset($user['password']);
            
            $response = [
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'] 
                ]
            ];
            
            echo json_encode($response);

        } else {
            // --- FAILED (Student is not verified) ---
            echo json_encode([
                'success' => false, 
                'message' => 'Your account is not verified. Please check your email (and spam folder) for the verification code.'
            ]);
        }
        // --- ⬆️ END OF UPDATED LOGIC ⬆️ ---

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
