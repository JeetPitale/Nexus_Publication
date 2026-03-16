<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=dashboard_db', 'root', '');
    $stmt = $pdo->query("SHOW COLUMNS FROM publications");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo $e->getMessage();
}
