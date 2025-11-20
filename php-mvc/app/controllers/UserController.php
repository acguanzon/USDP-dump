<?php
declare(strict_types=1);

namespace App\Controllers;

use Core\Database;
use Core\Request;
use Core\Response;
use PDO;

class UserController
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

    public function listActiveDiscounts(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->query('SELECT id,title,description,eligibility FROM discounts WHERE is_active = 1 ORDER BY id DESC LIMIT 200');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = array_map(fn($r) => ['_id' => (string) $r['id'], 'title' => (string) $r['title'], 'description' => (string) ($r['description'] ?? ''), 'eligibility' => (string) ($r['eligibility'] ?? '')], $rows);
        $res->json($out);
    }

    public function applyToDiscount(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $did = (int) ($params['id'] ?? 0);
        $pdo = Database::pdo();
        $chk = $pdo->prepare('SELECT id FROM applications WHERE user_id = ? AND discount_id = ? LIMIT 1');
        $chk->execute([$uid, $did]);
        if ($chk->fetchColumn()) {
            $res->json(['message' => 'Already applied'], 400);
            return;
        }
        $ins = $pdo->prepare('INSERT INTO applications(user_id,discount_id,status,applied_at) VALUES(?,?,?,?)');
        $ins->execute([$uid, $did, 'pending', time()]);
        $res->json(['message' => 'Application submitted']);
    }

    public function myApplications(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT a.status,a.applied_at,d.title FROM applications a JOIN discounts d ON d.id = a.discount_id WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 200');
        $stmt->execute([$uid]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $out = array_map(fn($r) => ['title' => (string) $r['title'], 'status' => (string) $r['status'], 'appliedAt' => (int) $r['applied_at']], $rows);
        $res->json($out);
    }

    public function getProfile(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT name,email,role,student_id,card_type,qr_code FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$uid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $res->json([
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'role' => (string) ($row['role'] ?? 'user'),
            'studentId' => (string) ($row['student_id'] ?? ''),
            'cardType' => (string) ($row['card_type'] ?? 'blue'),
            'qrCode' => (string) ($row['qr_code'] ?? '')
        ]);
    }

    public function updateProfile(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $name = trim((string) (($req->body()['name'] ?? '')));
        if ($name === '') {
            $res->json(['message' => 'Invalid input'], 400);
            return;
        }
        $pdo = Database::pdo();
        $upd = $pdo->prepare('UPDATE users SET name = ? WHERE id = ?');
        $upd->execute([$name, $uid]);
        $res->json(['message' => 'Updated']);
    }

    public function redeemToken(Request $req, Response $res, array $params = []): void
    {
        $uid = $this->ensureUser($req, $res);
        if ($uid === null) {
            return;
        }
        $code = trim((string) (($req->body()['code'] ?? '')));
        if ($code === '') {
            $res->json(['message' => 'Invalid code'], 400);
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT discount_id,expires_at FROM tokens WHERE code = ? LIMIT 1');
        $stmt->execute([$code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $res->json(['message' => 'Code not found'], 404);
            return;
        }
        if (!empty($row['expires_at']) && time() > (int) $row['expires_at']) {
            $res->json(['message' => 'Code expired'], 400);
            return;
        }
        $did = (int) $row['discount_id'];
        $chk = $pdo->prepare('SELECT id,status FROM applications WHERE user_id = ? AND discount_id = ? LIMIT 1');
        $chk->execute([$uid, $did]);
        $app = $chk->fetch(PDO::FETCH_ASSOC);
        if ($app) {
            $upd = $pdo->prepare('UPDATE applications SET status = ? WHERE id = ?');
            $upd->execute(['approved', (int) $app['id']]);
        } else {
            $ins = $pdo->prepare('INSERT INTO applications(user_id,discount_id,status,applied_at) VALUES(?,?,?,?)');
            $ins->execute([$uid, $did, 'approved', time()]);
        }
        $res->json(['message' => 'Redeemed']);
    }
}