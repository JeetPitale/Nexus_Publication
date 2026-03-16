<?php
// db.php
$host = getenv('DB_HOST') ?: '127.0.0.1';
$db = getenv('DB_NAME') ?: 'publications_nexus_dashboard_db';
$user = getenv('DB_USER') ?: 'root'; // Change if your MySQL user is different
$pass = getenv('DB_PASS') ?: '';     // Change if your MySQL password is not empty
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // For this update, we drop and recreate to match the new 28-column structure
    // $pdo->exec("DROP TABLE IF EXISTS publications"); 
    
    // Actually, I'll check if the 'title_without_author' column exists. If not, drop.
    $checkCol = $pdo->query("SHOW COLUMNS FROM publications LIKE 'title_without_author'")->fetch();
    if (!$checkCol) {
        $pdo->exec("DROP TABLE IF EXISTS publications");
    }

    // Create table if it doesn't exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS publications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serial_number VARCHAR(255),
        title_without_author TEXT,
        author_code VARCHAR(255),
        author_from_mica TEXT,
        source TEXT,
        publication TEXT,
        publication_type VARCHAR(255),
        material_type VARCHAR(255),
        physical_description TEXT,
        country VARCHAR(255),
        national_international VARCHAR(255),
        year VARCHAR(255),
        fy VARCHAR(255),
        evaluation_of_publications TEXT,
        impact_factor_v1 VARCHAR(255),
        abdc_ranking_v1 VARCHAR(255),
        publisher TEXT,
        doi VARCHAR(255),
        updated_citation TEXT,
        scopus VARCHAR(255),
        clarivate_analytics VARCHAR(255),
        impact_factor_v2 VARCHAR(255),
        h_index_sjr VARCHAR(255),
        ft_50 VARCHAR(255),
        abdc_ranking_v2 VARCHAR(255),
        abs_ajg_ranking VARCHAR(255),
        q_ranking VARCHAR(255),
        utd_ranking VARCHAR(255)
    )");

    // Check if the table is empty, and seed data if true
    $check = $pdo->query("SELECT COUNT(*) FROM publications")->fetchColumn();
    if ($check == 0) {
        $fields = [
            'serial_number', 'title_without_author', 'author_code', 'author_from_mica', 'source', 
            'publication', 'publication_type', 'material_type', 'physical_description', 'country', 
            'national_international', 'year', 'fy', 'evaluation_of_publications', 'impact_factor_v1', 
            'abdc_ranking_v1', 'publisher', 'doi', 'updated_citation', 'scopus', 
            'clarivate_analytics', 'impact_factor_v2', 'h_index_sjr', 'ft_50', 'abdc_ranking_v2', 
            'abs_ajg_ranking', 'q_ranking', 'utd_ranking'
        ];
        $placeholders = implode(',', array_fill(0, count($fields), '?'));
        $columns = implode(',', $fields);
        $stmt = $pdo->prepare("INSERT INTO publications ($columns) VALUES ($placeholders)");

        $jsonData = file_get_contents(__DIR__ . '/../parsed_data.json');
        $seedData = json_decode($jsonData, true);

        if ($seedData) {
            foreach ($seedData as $row) {
                // Ensure row has exactly 28 elements
                if (count($row) === 28) {
                    $stmt->execute($row);
                }
            }
        }
    }

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

// Function to handle CORS
function cors()
{
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
        if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
            header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
        exit(0);
    }
}
cors();
?>