<?php
declare(strict_types=1);

namespace App\Controllers;

use Core\Database;
use Core\Request;
use Core\Response;
use PDO;

class AdminController
{
    private function ensureAdmin(Request $req, Response $res): bool
    {
        $u = $req->user();
        if (!$u) {
            $res->json(['message' => 'Unauthorized'], 401);
            return false;
        }
        if (($u['role'] ?? '') !== 'admin') {
            $res->json(['message' => 'Forbidden'], 403);
            return false;
        }
        return true;
    }

    public function listUsers(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $page = max(1, (int) $req->query('page', 1));
        $limit = max(1, (int) $req->query('limit', 20));
        $offset = ($page - 1) * $limit;
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id,name,email,role,student_id,card_type,qr_code FROM users ORDER BY id LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = array_map(fn($r) => [
            '_id' => (string) $r['id'],
            'name' => (string) $r['name'],
            'email' => (string) $r['email'],
            'role' => (string) $r['role'],
            'studentId' => (string) ($r['student_id'] ?? ''),
            'cardType' => (string) ($r['card_type'] ?? 'blue'),
            'qrCode' => (string) ($r['qr_code'] ?? '')
        ], $rows);
        $res->json($out);
    }

    public function createUser(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $data = $req->body();
        $name = trim((string) ($data['name'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $role = (string) ($data['role'] ?? 'user');
        $studentId = trim((string) ($data['studentId'] ?? ''));
        $cardType = (string) ($data['cardType'] ?? 'blue');
        if ($name === '' || $email === '' || $password === '') {
            $res->json(['message' => 'Invalid input'], 400);
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetchColumn()) {
            $res->json(['message' => 'Email already exists'], 400);
            return;
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $qr = 'UQR-' . bin2hex(random_bytes(8));
        $ins = $pdo->prepare('INSERT INTO users(name,email,password_hash,role,student_id,card_type,qr_code,created_at) VALUES(?,?,?,?,?,?,?,?)');
        $ins->execute([$name, $email, $hash, $role === 'admin' ? 'admin' : 'user', $studentId !== '' ? $studentId : null, in_array($cardType, ['blue','gold'], true) ? $cardType : 'blue', $qr, time()]);
        $id = (int) $pdo->lastInsertId();
        $res->json(['id' => (string) $id], 201);
    }

    public function updateUser(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $id = (int) ($params['id'] ?? 0);
        $body = $req->body();
        $role = (string) ($body['role'] ?? 'user');
        $studentId = isset($body['studentId']) ? trim((string) $body['studentId']) : null;
        $cardType = isset($body['cardType']) ? (string) $body['cardType'] : null;
        $pdo = Database::pdo();
        $fields = ['role' => ($role === 'admin' ? 'admin' : 'user')];
        if ($studentId !== null) { $fields['student_id'] = ($studentId !== '' ? $studentId : null); }
        if ($cardType !== null && in_array($cardType, ['blue','gold'], true)) { $fields['card_type'] = $cardType; }
        $set = implode(', ', array_map(fn($k) => $k . ' = ?', array_keys($fields)));
        $paramsUpd = array_values($fields);
        $paramsUpd[] = $id;
        $upd = $pdo->prepare('UPDATE users SET ' . $set . ' WHERE id = ?');
        $upd->execute($paramsUpd);
        $res->json(['id' => (string) $id]);
    }

    public function deleteUser(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        $del = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $del->execute([$id]);
        $res->json(['id' => (string) $id]);
    }

    public function generateUserQr(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        $chk = $pdo->prepare('SELECT qr_code FROM users WHERE id = ? LIMIT 1');
        $chk->execute([$id]);
        $row = $chk->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $res->json(['message' => 'Not found'], 404);
            return;
        }
        $existing = (string) ($row['qr_code'] ?? '');
        if ($existing !== '') {
            $res->json(['qrCode' => $existing]);
            return;
        }
        $code = '';
        do {
            $code = 'UQR-' . bin2hex(random_bytes(8));
            $c = $pdo->prepare('SELECT id FROM users WHERE qr_code = ? LIMIT 1');
            $c->execute([$code]);
        } while ($c->fetchColumn());
        $upd = $pdo->prepare('UPDATE users SET qr_code = ? WHERE id = ?');
        $upd->execute([$code, $id]);
        $res->json(['qrCode' => $code]);
    }

    public function listDiscounts(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $page = max(1, (int) $req->query('page', 1));
        $limit = max(1, (int) $req->query('limit', 20));
        $offset = ($page - 1) * $limit;
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id,title,description,eligibility,is_active FROM discounts ORDER BY id LIMIT :limit OFFSET :offset');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = array_map(fn($r) => ['_id' => (string) $r['id'], 'title' => (string) $r['title'], 'description' => (string) ($r['description'] ?? ''), 'eligibility' => (string) ($r['eligibility'] ?? ''), 'isActive' => ((int) $r['is_active']) === 1], $rows);
        $res->json($out);
    }

    public function createDiscount(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $d = $req->body();
        $title = trim((string) ($d['title'] ?? ''));
        $description = (string) ($d['description'] ?? '');
        $eligibility = (string) ($d['eligibility'] ?? '');
        $isActive = (bool) ($d['isActive'] ?? true);
        if ($title === '') {
            $res->json(['message' => 'Invalid input'], 400);
            return;
        }
        $pdo = Database::pdo();
        $ins = $pdo->prepare('INSERT INTO discounts(title,description,eligibility,is_active,created_at) VALUES(?,?,?,?,?)');
        $ins->execute([$title, $description, $eligibility, $isActive ? 1 : 0, time()]);
        $id = (int) $pdo->lastInsertId();
        $res->json(['id' => (string) $id], 201);
    }

    public function updateDiscount(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $id = (int) ($params['id'] ?? 0);
        $isActive = (bool) (($req->body()['isActive'] ?? true));
        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE discounts SET is_active = ? WHERE id = ?');
        $upd->execute([$isActive ? 1 : 0, $id]);
        $res->json(['id' => (string) $id]);
    }

    public function deleteDiscount(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $id = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        $del = $pdo->prepare('DELETE FROM discounts WHERE id = ?');
        $del->execute([$id]);
        $res->json(['id' => (string) $id]);
    }

    public function generateTokensForDiscount(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $discountId = (int) ($params['id'] ?? 0);
        $count = max(1, (int) ($req->body()['count'] ?? 10));
        $expiresAt = (int) ($req->body()['expiresAt'] ?? 0);
        $pdo = Database::pdo();
        $ins = $pdo->prepare('INSERT INTO tokens(discount_id,code,expires_at) VALUES(?,?,?)');
        $created = 0;
        for ($i = 0; $i < $count; $i++) {
            $code = 'TOK-' . bin2hex(random_bytes(8));
            try {
                $ins->execute([$discountId, $code, $expiresAt > 0 ? $expiresAt : null]);
                $created++;
            } catch (\Throwable $e) {
            }
        }
        $res->json(['created' => $created]);
    }

    public function listTokensForDiscount(Request $req, Response $res, array $params = []): void
    {
        if (!$this->ensureAdmin($req, $res)) {
            return;
        }
        $discountId = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT code,expires_at FROM tokens WHERE discount_id = ? ORDER BY id DESC LIMIT 200');
        $stmt->execute([$discountId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = array_map(fn($r) => ['code' => (string) $r['code'], 'expiresAt' => isset($r['expires_at']) ? (int) $r['expires_at'] : null], $rows);
        $res->json($out);
    }
}