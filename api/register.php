<?php
require_once "cors.php";
require_once "db.php"; // Your PDO connection ($pdo)
require_once 'config.php';

// --- 1. Include PHPMailer classes ---
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// This loads the PHPMailer library
require __DIR__ . '/../vendor/autoload.php';

$data = json_decode(file_get_contents('php://input'), true);

$name = $data['name'] ?? null;
$email = $data['email'] ?? null;
$password = $data['password'] ?? null;

header('Content-Type: application/json');

if (empty($name) || empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

try {
    // --- 2. Check if user already exists ---
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'An account with this email already exists.']);
        exit;
    }

    // --- 3. Generate OTP and Hash Password ---
    $otp = rand(100000, 999999);
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);
    
    // --- (NEW) Create expiry time for 10 minutes from now ---
    $otp_expiry = date("Y-m-d H:i:s", strtotime("+10 minutes"));

    // --- 4. Save new user to database (Matches your table structure) ---
    $sql = "INSERT INTO users (name, email, password, otp, otp_expiry, is_verified, role) 
            VALUES (?, ?, ?, ?, ?, 0, 'student')"; // 'role' defaults to 'student'
    
    $stmt = $pdo->prepare($sql);
    
    // (NEW) Execute with the expiry time
    if ($stmt->execute([$name, $email, $hashed_password, $otp, $otp_expiry])) {
        
        // --- 5. Send the verification email using GMAIL ---
        $mail = new PHPMailer(true);
        
        try {
            //Server settings
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            
            // --- ⬇️ (A) REPLACE WITH YOUR GMAIL CREDENTIALS ⬇️ ---
            $mail->Username   = GMAIL_USER; // Your full Gmail address
            $mail->Password   = GMAIL_PASS;  // Your 16-digit App Password (no spaces)
            // --- ⬆️ (A) --------------------------------------- ⬆️ ---

            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = 465; 

            //Recipients
            $mail->setFrom('your-email@gmail.com', 'E-Learning Portal');
            $mail->addAddress($email, $name); 
            
            //Content
            $mail->isHTML(true);
            $mail->Subject = 'Verify Your Email for E-Learning Portal';
            $mail->Body    = "Hello <b>$name</b>,<br><br>Your One-Time Password (OTP) is: <h2>$otp</h2><br>This code is valid for 10 minutes.";
            $mail->AltBody = "Hello $name,\n\nYour One-Time Password (OTP) is: $otp";

            $mail->send();

            // --- 6. Send SECURE response ---
            echo json_encode([
                'success' => true,
                'message' => 'Registration successful! Please check your email (and spam folder) for the verification code.'
            ]);

        } catch (Exception $e) {
            echo json_encode([
                'success' => false, 
                'message' => "User registered, but email could not be sent. Mailer Error: {$mail->ErrorInfo}"
            ]);
        }

    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to register user in the database.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>