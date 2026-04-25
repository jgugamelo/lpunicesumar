<?php
/**
 * Unicesumar Proxy API - PHP Version
 * Replicates the logic from server.ts for HostGator environments.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Configurações Base
$BASE = 'https://gateway.unicesumar.edu.br/';
$BASE_CAP = $BASE . 'central-captacao-standalone-api/';

// Token de Autorização (TA) - Decodificado exatamente como no server.ts
$codes = [66,97,115,105,99,32,81,86,86,85,83,70,57,84,82,86,74,87,82,86,73,54,99,50,86,106,99,109,86,48];
$TA = "";
foreach($codes as $c) $TA .= chr($c);

function getOAuthToken($BASE, $TA) {
    $ch = curl_init($BASE . 'auth-server/oauth/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Importante para alguns servidores HostGator
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: ' . $TA,
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($status !== 200) return null;
    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

function getCdToken($BASE_CAP, $tok) {
    $ch = curl_init($BASE_CAP . 'candidato/gerarToken');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'dsUtmCampaign' => null, 'dsUtmMedium' => null, 'dsUtmSource' => null,
        'dsUtmContent' => null, 'dsUtmTerm' => null, 'dsGclid' => null,
        'cdGoogleId' => null, 'cdIp' => ''
    ]));
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $tok,
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    return $data['cdToken'] ?? null;
}

function toEspreId($idCurso) {
    if ($idCurso && strpos($idCurso, 'EGRAD_') === 0) {
        return 'ESPRE_' . substr($idCurso, 6);
    }
    return null;
}

function toSlug($str) {
    $str = strtolower($str);
    $str = preg_replace('/[áàãâä]/u', 'a', $str);
    $str = preg_replace('/[éèêë]/u', 'e', $str);
    $str = preg_replace('/[íìîï]/u', 'i', $str);
    $str = preg_replace('/[óòõôö]/u', 'o', $str);
    $str = preg_replace('/[úùûü]/u', 'u', $str);
    $str = preg_replace('/ç/u', 'c', $str);
    $str = preg_replace('/[^a-z0-9]+/i', '-', $str);
    return trim($str, '-');
}

$action = $_GET['action'] ?? null;
$idCurso = $_GET['idCurso'] ?? null;
$idEstado = $_GET['idEstado'] ?? null;
$idPolo = $_GET['idPolo'] ?? null;
$urlSlugParam = $_GET['urlSlug'] ?? null;
$nmCursoParam = $_GET['nmCurso'] ?? null;

try {
    $tok = getOAuthToken($BASE, $TA);
    if (!$tok) throw new Exception('Falha na autenticação OAuth');

    if ($action === 'cursos') {
        $ch = curl_init($BASE_CAP . 'curso?idPais=90');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
        $response = curl_exec($ch);
        curl_close($ch);
        echo $response;
        exit;
    }

    if ($action === 'estados') {
        if (!$idCurso) throw new Exception('idCurso obrigatório');
        $url = $BASE_CAP . "estado?idPais=90&idCurso=" . urlencode($idCurso);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
        $response = curl_exec($ch);
        curl_close($ch);
        
        $data = json_decode($response, true);
        if (empty($data)) {
            $spreId = toEspreId($idCurso);
            if ($spreId) {
                $url2 = $BASE_CAP . "estado?idPais=90&idCurso=" . urlencode($spreId);
                $ch2 = curl_init($url2);
                curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
                $response = curl_exec($ch2);
                curl_close($ch2);
            }
        }
        echo $response;
        exit;
    }

    if ($action === 'polos') {
        if (!$idCurso || !$idEstado) throw new Exception('idCurso e idEstado obrigatórios');
        $url = $BASE_CAP . "polo?idPais=90&idCurso=" . urlencode($idCurso) . "&idEstado=" . urlencode($idEstado);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
        $response = curl_exec($ch);
        curl_close($ch);
        
        $data = json_decode($response, true);
        if (empty($data)) {
            $spreId = toEspreId($idCurso);
            if ($spreId) {
                $url2 = $BASE_CAP . "polo?idPais=90&idCurso=" . urlencode($spreId) . "&idEstado=" . urlencode($idEstado);
                $ch2 = curl_init($url2);
                curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
                $response = curl_exec($ch2);
                curl_close($ch2);
            }
        }
        echo $response;
        exit;
    }

    if ($action === 'preco') {
        if (!$idCurso || !$idPolo) throw new Exception('idCurso e idPolo obrigatórios');
        
        function extractPreco($raw) {
            $data = json_decode($raw, true);
            if (!$data) return null;
            
            $obj = null;
            if (isset($data[0])) {
                foreach($data as $item) {
                    if (isset($item['vlPrimeira']) && $item['vlPrimeira'] !== null) {
                        $obj = $item;
                        break;
                    }
                }
                if (!$obj) $obj = $data[0];
            } else {
                $obj = $data;
            }
            
            if (isset($obj['vlPrimeira'])) {
                return [
                    'vlPrimeira' => (float)$obj['vlPrimeira'],
                    'vlDemais' => (float)($obj['vlDemais'] ?? 0),
                    'vlDemaisBruto' => (float)($obj['vlDemaisBruto'] ?? $obj['vlBruto'] ?? 0),
                    'dsTurno' => $obj['dsTurno'] ?? null,
                    'dsPeriodicidade' => $obj['dsPeriodicidade'] ?? null
                ];
            }
            return null;
        }

        $url = $BASE_CAP . "curso?idCurso=" . urlencode($idCurso) . "&idPolo=" . urlencode($idPolo);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
        $res = curl_exec($ch);
        curl_close($ch);
        
        $finalData = extractPreco($res);
        $usedEspre = false;

        if (!$finalData) {
            $spreId = toEspreId($idCurso);
            if ($spreId) {
                $url = $BASE_CAP . "curso?idCurso=" . urlencode($spreId) . "&idPolo=" . urlencode($idPolo);
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
                $res = curl_exec($ch);
                curl_close($ch);
                $finalData = extractPreco($res);
                if ($finalData) $usedEspre = true;
            }
        }
        
        if (!$finalData) {
            $url = $BASE_CAP . "polo/" . urlencode($idPolo) . "?idCurso=" . urlencode($idCurso);
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
            $res = curl_exec($ch);
            curl_close($ch);
            $finalData = extractPreco($res);
        }

        if (!$finalData) {
            echo json_encode(['_fallback' => true, '_isSemipresencial' => $usedEspre]);
        } else {
            $finalData['_isSemipresencial'] = $usedEspre;
            echo json_encode($finalData);
        }
        exit;
    }

    if ($action === 'interessado') {
        $lead = json_decode(file_get_contents('php://input'), true);
        if (!$lead) throw new Exception('Dados do lead inválidos');
        
        $cdToken = getCdToken($BASE_CAP, $tok);
        
        // Registrar Interessado
        $ch = curl_init($BASE_CAP . "candidato/{$cdToken}/interessado");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'pais' => ['idPais' => 90],
            'curso' => ['idCurso' => $lead['idCurso']],
            'estado' => ['idEstado' => (int)$lead['idEstado']],
            'polo' => ['idPolo' => (int)$lead['idPolo']]
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: bearer ' . $tok,
            'Content-Type: application/json'
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        $data = json_decode($res, true);
        $newToken = $data['cdToken'] ?? $cdToken;

        // Registrar Contato
        $ch = curl_init($BASE_CAP . "candidato/{$newToken}/contato");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'nmCandidato' => $lead['nmCandidato'],
            'dsEmail' => $lead['dsEmail'],
            'nrTelefone' => $lead['nrTelefone'],
            'idOpcaoEnsinoMedio' => null
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: bearer ' . $tok,
            'Content-Type: application/json'
        ]);
        curl_exec($ch);
        curl_close($ch);

        echo json_encode(['ok' => true, 'idCandidato' => $data['idCandidato'] ?? null]);
        exit;
    }
    
    if ($action === 'cursoConteudo') {
        if (!$idCurso) throw new Exception('idCurso obrigatório');
        
        // Replicando fallback de conteúdo
        $spreId = toEspreId($idCurso);
        $idsToTry = [$idCurso];
        if ($spreId) $idsToTry[] = $spreId;
        
        $dCurso = [];
        $isSpre = false;
        
        foreach ($idsToTry as $tryId) {
            $url = $BASE_CAP . "curso/" . urlencode($tryId);
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
            $res = curl_exec($ch);
            curl_close($ch);
            
            $data = json_decode($res, true);
            if ($data) {
                $obj = isset($data[0]) ? $data[0] : $data;
                // Verificação de conteúdo real
                $hasContent = !empty($obj['dsDescricao']) || !empty($obj['dsApresentacao']) || !empty($obj['dsEmenta']);
                if ($hasContent || $tryId === $spreId) {
                    $dCurso = $obj;
                    $isSpre = ($tryId === $spreId);
                    break;
                }
            }
        }
        
        echo json_encode([
            'curso' => $dCurso,
            'description' => $dCurso['dsDescricao'] ?? $dCurso['dsApresentacao'] ?? null,
            'faq' => [], // Scraping de FAQ no PHP exigiria biblioteca extra, mantendo simples
            'videoId' => null,
            'matriz' => []
        ]);
        exit;
    }

    throw new Exception('Ação inválida');

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
