<?php
declare(strict_types=1);

namespace App\Controllers;

use Core\Database;
use Core\Request;
use Core\Response;
use PDO;

class FilesController
{
    private function ensureUser(Request $req, Response $res): ?int
    {
        $u = $req->user();
        if (!$u) {
            $res->json(['message' => 'Unauthorized'], 401);
            return null;
        }
        return (int) ($u['sub'] ?? 0);
    }

    public function presign(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        if (!class_exists('\Google\Cloud\Storage\StorageClient')) {
            $res->json(['message' => 'GCS SDK not installed. Run composer require google/cloud-storage'], 501);
            return;
        }
        if (!defined('GCS_BUCKET') || GCS_BUCKET === '') {
            $res->json(['message' => 'GCS_BUCKET not configured'], 500);
            return;
        }
        $d = $req->body();
        $key = trim((string) ($d['key'] ?? ''));
        $contentType = (string) ($d['contentType'] ?? 'application/octet-stream');
        $size = (int) ($d['size'] ?? 0);
        if ($key === '') {
            $res->json(['message' => 'Invalid key'], 400);
            return;
        }
        $bucketName = GCS_BUCKET;
        $ttl = defined('GCS_SIGN_URL_TTL') ? (int) GCS_SIGN_URL_TTL : 600;
        $expires = (new \DateTimeImmutable())->modify('+' . $ttl . ' seconds');
        $client = new \Google\Cloud\Storage\StorageClient();
        $bucket = $client->bucket($bucketName);
        $object = $bucket->object($key);
        $url = $object->signedUrl($expires, ['version' => 'v4', 'method' => 'PUT', 'contentType' => $contentType]);
        $pdo = Database::pdo();
        $ins = $pdo->prepare('INSERT INTO files(user_id,key,content_type,size,created_at) VALUES(?,?,?,?,?)');
        $ins->execute([$uid, $key, $contentType, $size > 0 ? $size : null, time()]);
        $res->json(['url' => $url, 'key' => $key]);
    }

    public function list(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id,key,content_type,size,created_at FROM files WHERE user_id = ? ORDER BY id DESC LIMIT 200');
        $stmt->execute([$uid]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = array_map(fn($r) => [
            'id' => (string) $r['id'],
            'key' => (string) $r['key'],
            'contentType' => (string) ($r['content_type'] ?? ''),
            'size' => isset($r['size']) ? (int) $r['size'] : null,
            'createdAt' => (int) $r['created_at']
        ], $rows);
        $res->json($out);
    }

    public function delete(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT key FROM files WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$id, $uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $res->json(['message' => 'Not found'], 404);
            return;
        }
        $key = (string) $row['key'];
        if (class_exists('\Google\Cloud\Storage\StorageClient') && defined('GCS_BUCKET') && GCS_BUCKET !== '') {
            try {
                $client = new \Google\Cloud\Storage\StorageClient();
                $client->bucket(GCS_BUCKET)->object($key)->delete();
            } catch (\Throwable $e) {
            }
        }
        $del = $pdo->prepare('DELETE FROM files WHERE id = ?');
        $del->execute([$id]);
        $res->json(['id' => (string) $id]);
    }
}