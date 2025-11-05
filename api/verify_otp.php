<?php
require_once "cors.php";
require_once "db.php"; // Your PDO connection ($pdo)

// 1. Get the JSON data sent from script.js
$data = json_decode(file_get_contents('php://input'), true);

$email = $data['email'] ?? null;
$otp = $data['otp'] ?? null; // The OTP the user entered

// 2. Set response header to JSON
header('Content-Type: application/json');

// 3. Basic validation
if (empty($email) || empty($otp)) {
    echo json_encode(['success' => false, 'message' => 'Email and OTP are required.']);
    exit;
}

try {
    // 4. Find the user by their email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 5. Check if the user exists
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found.']);
        exit;
    }

    // 6. Check if user is already verified
    if ($user['is_verified'] == 1) {
        echo json_encode(['success' => false, 'message' => 'This account is already verified. Please log in.']);
        exit;
    }

    // 7. Check if the OTP has expired
    $current_time = date("Y-m-d H:i:s");
    if ($current_time > $user['otp_expiry']) {
        echo json_encode(['success' => false, 'message' => 'Your OTP has expired. Please try registering again.']);
        exit;
    }

    // 8. Check if the provided OTP matches the one in the database
    if ($user['otp'] == $otp) {
        // --- SUCCESS! ---
        
        // 9. Update the user: set verified=1 and clear the OTP fields
        $update_stmt = $pdo->prepare("UPDATE users SET is_verified = 1, otp = NULL, otp_expiry = NULL WHERE email = ?");
        $update_stmt->execute([$email]);

        // 10. Send success message
        echo json_encode([
            'success' => true, 
            'message' => 'Account verified successfully! You can now log in.'
        ]);

    } else {
        // --- FAILED ---
        // 11. Invalid OTP
        echo json_encode(['success' => false, 'message' => 'Invalid OTP. Please check the code and try again.']);
    }

} catch (PDOException $e) {
    // 12. Catch any database errors
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>