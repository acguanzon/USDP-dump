<?php
declare(strict_types=1);

namespace App\Controllers;

use Core\Database;
use Core\Jwt;
use Core\Request;
use Core\Response;
use PDO;

class AuthController
{
    public function register(Request $req, Response $res, array $params = []): void
    {
        $data = $req->body();
        $name = trim((string) ($data['name'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
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
        $ins = $pdo->prepare('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)');
        $ins->execute([$name, $email, $hash, 'user', time()]);
        $id = (int) $pdo->lastInsertId();
        $res->json(['id' => (string) $id], 201);
    }

    public function login(Request $req, Response $res, array $params = []): void
    {
        $data = $req->body();
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        if ($email === '' || $password === '') {
            $res->json(['message' => 'Invalid credentials'], 400);
            return;
        }
        $pdo = Database::pdo();
        $stmt = $pdo->prepare('SELECT id,name,email,password_hash,role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !password_verify($password, (string) $row['password_hash'])) {
            $res->json(['message' => 'Invalid credentials'], 401);
            return;
        }
        $payload = [
            'sub' => (int) $row['id'],
            'email' => (string) $row['email'],
            'name' => (string) $row['name'],
            'role' => (string) $row['role'],
            'iat' => time(),
            'exp' => time() + 86400 * 7
        ];
        $token = Jwt::sign($payload);
        $res->json(['token' => $token]);
    }
}