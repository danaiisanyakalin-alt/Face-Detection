<?php
// filepath: /C:/xampp/htdocs/face-js/upload.php

$data = json_decode(file_get_contents("php://input"), true);
if (isset($data['image'])) {
    $image_parts = explode(";base64,", $data['image']);
    if(count($image_parts) === 2) {
        $image_type_aux = explode("image/", $image_parts[0]);
        if(count($image_type_aux) === 2) {
            $image_type = $image_type_aux[1];
            $image_base64 = base64_decode($image_parts[1]);
            $fileName = '1102400203200_reserve' . '.' . $image_type;
            $upload_path = __DIR__ . '/upload/' . $fileName;
            $success = file_put_contents($upload_path, $image_base64);
            if ($success !== false) {
                echo json_encode(['status' => 'success', 'filename' => $fileName]);
                exit;
            }
        }
    }
}
echo json_encode(['status' => 'failed']);
?>