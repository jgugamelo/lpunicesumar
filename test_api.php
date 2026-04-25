<?php
require "api.php";
$tok = getOAuthToken();
echo "Token: $tok\n";

function getUrl($url, $tok) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: bearer " . $tok]);
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$httpCode, $res];
}

// All courses for country 90
echo "Fetching all courses...\n";
list($code, $res) = getUrl("https://api-leads.unicesumar.edu.br/cap/v1/curso?idPais=90", $tok);
$courses = json_decode($res, true);
echo "Total courses: " . count($courses) . "\n";

$eposFound = [];
$etecFound = [];
$otherFound = [];

foreach ($courses as $c) {
    $id = $c['idCurso'] ?? '';
    if (strpos($id, 'EPOS_') === 0) {
        if(count($eposFound) < 3) $eposFound[] = $c;
    } elseif (strpos($id, 'ETEC_') === 0) {
        if(count($etecFound) < 3) $etecFound[] = $c;
    } elseif (strpos($id, 'EPRO_') === 0 || strpos($id, 'EPRF_') === 0 || strpos($id, 'EAPR_') === 0) {
        if(count($otherFound) < 3) $otherFound[] = $c;
    }
}

echo "Sample EPOS_:\n"; print_r(array_map(function($c){return $c['idCurso'];}, $eposFound));
echo "Sample ETEC_:\n"; print_r(array_map(function($c){return $c['idCurso'];}, $etecFound));

if (isset($eposFound[0])) {
    $c = $eposFound[0];
    echo "Testing EPOS_ course: " . $c['idCurso'] . "\n";
    list($code, $res) = getUrl("https://api-leads.unicesumar.edu.br/cap/v1/curso/" . urlencode($c['idCurso']), $tok);
    echo "Code: $code\nRes: " . substr($res, 0, 200) . "...\n";
}

