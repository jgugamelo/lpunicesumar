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
        
        $slugFromId = str_replace(['EGRAD_', 'EPOS_', 'ESPRE_', 'EPRES_'], '', str_replace('_', '-', strtoupper($idCurso)));
        $slugFromId = strtolower(trim($slugFromId, '-'));
        $slugFromName = $nmCursoParam ? toSlug($nmCursoParam) : null;
        
        $urlSlug = $urlSlugParam ?: $slugFromName ?: $slugFromId;
        
        $spreId = toEspreId($idCurso);
        $idsToTry = [$idCurso];
        if ($spreId) $idsToTry[] = $spreId;
        
        $dCurso = [];
        $isSpre = false;
        
        $fallbackObj = null;
        $fallbackIsSpre = false;

        foreach ($idsToTry as $tryId) {
            $url = $BASE_CAP . "curso/" . urlencode($tryId);
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode >= 200 && $httpCode < 300) {
                $data = json_decode($res, true);
                if ($data) {
                    $obj = null;
                    if (isset($data[0]) || is_array($data) && array_keys($data) === range(0, count($data) - 1)) {
                        foreach ($data as $item) {
                            if (!empty($item['cdUrlCurso'])) {
                                $obj = $item;
                                break;
                            }
                        }
                        if (!$obj) $obj = $data[0] ?? [];
                    } else {
                        $obj = $data;
                    }

                    if ($obj && !empty($obj)) {
                        if (!$fallbackObj) {
                            $fallbackObj = $obj;
                            $fallbackIsSpre = ($tryId === $spreId);
                        }

                        $hasContent = !empty($obj['dsDescricao']) || !empty($obj['dsApresentacao']) || !empty($obj['dsEmenta']) || !empty($obj['ementa']) || !empty($obj['apresentacao']);
                        if (!$hasContent && $tryId !== $spreId && $spreId) {
                            continue;
                        }
                        $dCurso = $obj;
                        $isSpre = ($tryId === $spreId);
                        if (!empty($obj['cdUrlCurso']) && !$urlSlugParam) $urlSlug = $obj['cdUrlCurso'];
                        break;
                    }
                }
            }
        }

        if (empty($dCurso) && $fallbackObj) {
            $dCurso = $fallbackObj;
            $isSpre = $fallbackIsSpre;
            if (!empty($dCurso['cdUrlCurso']) && !$urlSlugParam) $urlSlug = $dCurso['cdUrlCurso'];
        }

        $description = $dCurso['dsDescricao'] ?? $dCurso['dsApresentacao'] ?? $dCurso['dsEmenta'] ?? null;
        $videoId = null;
        $faq = [];
        $matriz = [];

        // Funcao de scraping para PHP
        function fetchHTML($slug) {
            $bases = [
                'https://inscricoes.unicesumar.edu.br/curso/',
                'https://www.unicesumar.edu.br/graduacao/'
            ];
            $slugs = [$slug, $slug . '-ead', $slug . '-semipresencial', str_replace('-ead', '', $slug)];
            
            foreach ($slugs as $s) {
                foreach ($bases as $b) {
                    $ch = curl_init($b . $s);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
                    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
                    $html = curl_exec($ch);
                    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    if ($code === 200) return $html;
                }
            }
            return null;
        }

        $html = fetchHTML($urlSlug);
        if ($html) {
            // LD+JSON Parsing para FAQ e Description
            if (preg_match_all('/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i', $html, $matches)) {
                foreach ($matches[1] as $jsonStr) {
                    $json = json_decode($jsonStr, true);
                    if ($json) {
                        $schemas = isset($json['@graph']) ? $json['@graph'] : [$json];
                        foreach ($schemas as $schema) {
                            $type = $schema['@type'] ?? '';
                            if (isset($schema['description']) && !$description) {
                                $description = is_string($schema['description']) ? $schema['description'] : ($schema['description']['@value'] ?? null);
                            }
                            if (empty($faq) && ($type === 'FAQPage' || (is_array($type) && in_array('FAQPage', $type)))) {
                                $items = $schema['mainEntity'] ?? $schema['hasPart'] ?? [];
                                if (is_array($items)) {
                                    foreach ($items as $q) {
                                        $pergunta = $q['name'] ?? $q['text'] ?? '';
                                        $resposta = $q['acceptedAnswer']['text'] ?? $q['suggestedAnswer']['text'] ?? '';
                                        if ($pergunta) {
                                            $faq[] = ['pergunta' => $pergunta, 'resposta' => $resposta];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (!$description) {
                if (preg_match('/<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{20,})["\']/i', $html, $m)) $description = $m[1];
                elseif (preg_match('/<meta[^>]+content=["\']([^"\']{20,})["\'][^>]+name=["\']description["\']/i', $html, $m)) $description = $m[1];
            }
            if (preg_match('/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/', $html, $m)) $videoId = $m[1];
            elseif (preg_match('/"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/', $html, $m)) $videoId = $m[1];
        }

        // Fetch Matriz Curricular
        $urlMatriz = $BASE_CAP . "matriz-curricular?idCurso=" . urlencode($idCurso);
        $chM = curl_init($urlMatriz);
        curl_setopt($chM, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($chM, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($chM, CURLOPT_HTTPHEADER, ['Authorization: bearer ' . $tok]);
        $resMatriz = curl_exec($chM);
        curl_close($chM);
        $matrizData = json_decode($resMatriz, true);
        if (is_array($matrizData)) {
            $matriz = $matrizData;
        }

        echo json_encode([
            'curso' => $dCurso,
            'description' => $description,
            'faq' => $faq,
            'videoId' => $videoId,
            'matriz' => $matriz,
            '_isSemipresencial' => $isSpre
        ]);
        exit;
    }

    throw new Exception('Ação inválida');

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
