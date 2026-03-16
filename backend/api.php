<?php
require_once 'db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
$isAdmin = ($authHeader === 'Bearer admin-token');

$stmt = $pdo->query("SHOW COLUMNS FROM publications");
$columns_info = $stmt->fetchAll(PDO::FETCH_ASSOC);
$fields = [];
$column_defs = [];
foreach ($columns_info as $col) {
    if ($col['Field'] !== 'id') {
        $fields[] = $col['Field'];
        $column_defs[] = [
            "key" => $col['Field'],
            "label" => ucwords(str_replace('_', ' ', $col['Field']))
        ];
    }
}

if ($method === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get_columns') {
    echo json_encode(["status" => "success", "data" => $column_defs]);
    exit;
}

if ($method === 'GET') {
    // Dynamic fetching with filters
    $query = "SELECT * FROM publications WHERE 1=1";
    $params = [];

    foreach ($fields as $field) {
        if (!empty($_GET[$field])) {
            $query .= " AND {$field} LIKE ?";
            $params[] = '%' . $_GET[$field] . '%';
        }
    }

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $results]);
    exit;
}

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Admin access required for CRUD ops."]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST' && isset($_GET['action']) && $_GET['action'] === 'add_column') {
    $label = trim($input['label'] ?? '');
    if (empty($label)) {
        echo json_encode(["status" => "error", "message" => "Column label required."]);
        exit;
    }

    // Convert label to valid column name (snake_case)
    $colKey = strtolower(preg_replace('/[^a-zA-Z0-9_]/', '_', $label));
    $colKey = trim($colKey, '_');

    if (in_array($colKey, $fields)) {
        echo json_encode(["status" => "error", "message" => "Column already exists."]);
        exit;
    }

    try {
        $pdo->exec("ALTER TABLE publications ADD COLUMN `$colKey` TEXT");
        echo json_encode(["status" => "success", "message" => "Column added successfully.", "column" => ["key" => $colKey, "label" => $label]]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Failed to add column: " . $e->getMessage()]);
    }
    exit;
}

if ($method === 'DELETE' && isset($_GET['action']) && $_GET['action'] === 'delete_column') {
    // Check querystring for colKey if not in JSON body
    $colKey = isset($input['colKey']) ? $input['colKey'] : (isset($_GET['colKey']) ? $_GET['colKey'] : null);

    if (empty($colKey)) {
        echo json_encode(["status" => "error", "message" => "Column key required."]);
        exit;
    }

    if (!in_array($colKey, $fields)) {
        echo json_encode(["status" => "error", "message" => "Column does not exist."]);
        exit;
    }

    try {
        $pdo->exec("ALTER TABLE publications DROP COLUMN `$colKey`");
        echo json_encode(["status" => "success", "message" => "Column deleted successfully."]);
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Failed to delete column: " . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $placeholders = implode(',', array_fill(0, count($fields), '?'));
    $columns = implode(',', $fields);

    $query = "INSERT INTO publications ({$columns}) VALUES ({$placeholders})";
    $stmt = $pdo->prepare($query);

    $params = [];
    foreach ($fields as $field) {
        $params[] = isset($input[$field]) ? $input[$field] : '';
    }

    if ($stmt->execute($params)) {
        echo json_encode(["status" => "success", "message" => "Record created.", "id" => $pdo->lastInsertId()]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to create."]);
    }
    exit;
}

if ($method === 'PUT') {
    if (empty($input['id'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "ID required for update."]);
        exit;
    }

    $setClause = [];
    $params = [];
    foreach ($fields as $field) {
        if (isset($input[$field])) {
            $setClause[] = "{$field} = ?";
            $params[] = $input[$field];
        }
    }

    if (empty($setClause)) {
        echo json_encode(["status" => "error", "message" => "No fields to update."]);
        exit;
    }

    $query = "UPDATE publications SET " . implode(', ', $setClause) . " WHERE id = ?";
    $params[] = $input['id'];

    $stmt = $pdo->prepare($query);
    if ($stmt->execute($params)) {
        echo json_encode(["status" => "success", "message" => "Record updated."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update."]);
    }
    exit;
}

if ($method === 'DELETE') {
    // Check querystring for ID if not in JSON body
    $id = isset($input['id']) ? $input['id'] : (isset($_GET['id']) ? $_GET['id'] : null);
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "ID required for delete."]);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM publications WHERE id = ?");
    if ($stmt->execute([$id])) {
        echo json_encode(["status" => "success", "message" => "Record deleted."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to delete."]);
    }
    exit;
}

echo json_encode(["status" => "error", "message" => "Method not supported"]);
?>