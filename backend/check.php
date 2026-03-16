<?php
require 'db.php';
$count = $pdo->query("SELECT COUNT(*) FROM publications")->fetchColumn();
echo "Count: " . $count . "\n";
$first = $pdo->query("SELECT * FROM publications LIMIT 1")->fetch();
print_r($first);
?>
