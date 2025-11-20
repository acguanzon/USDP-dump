<?php
declare(strict_types=1);

namespace Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $pdo = null;

    public static function init(): void
    {
        if (self::$pdo) {
            return;
        }
        $dbPath = defined('DB_PATH') ? DB_PATH : (__DIR__ . '/../storage/database.sqlite');
        $dir = dirname($dbPath);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        $dsn = 'sqlite:' . $dbPath;
        self::$pdo = new PDO($dsn);
        self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        self::$pdo->exec('PRAGMA foreign_keys = ON');
        self::migrate();
    }

    public static function pdo(): PDO
    {
        if (!self::$pdo) {
            self::init();
        }
        return self::$pdo;
    }

    private static function migrate(): void
    {
        $sql = [
            'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL, student_id TEXT, card_type TEXT, qr_code TEXT, created_at INTEGER NOT NULL)',
            'CREATE TABLE IF NOT EXISTS discounts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, eligibility TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL)',
            'CREATE TABLE IF NOT EXISTS tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, discount_id INTEGER NOT NULL, code TEXT NOT NULL UNIQUE, expires_at INTEGER, FOREIGN KEY(discount_id) REFERENCES discounts(id) ON DELETE CASCADE)',
            'CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, discount_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT "pending", applied_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(discount_id) REFERENCES discounts(id) ON DELETE CASCADE)',
            'CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, key TEXT NOT NULL, content_type TEXT, size INTEGER, created_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)'
        ];
        foreach ($sql as $s) {
            self::$pdo->exec($s);
        }
        $cols = self::$pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC);
        $names = array_map(fn($c) => (string) $c['name'], $cols);
        if (!in_array('student_id', $names, true)) {
            self::$pdo->exec('ALTER TABLE users ADD COLUMN student_id TEXT');
        }
        if (!in_array('card_type', $names, true)) {
            self::$pdo->exec('ALTER TABLE users ADD COLUMN card_type TEXT');
        }
        if (!in_array('qr_code', $names, true)) {
            self::$pdo->exec('ALTER TABLE users ADD COLUMN qr_code TEXT');
        }
        $stmt = self::$pdo->prepare('SELECT COUNT(*) FROM users WHERE role = :r');
        $stmt->execute([':r' => 'admin']);
        $hasAdmin = (int) $stmt->fetchColumn() > 0;
        if (!$hasAdmin) {
            $ins = self::$pdo->prepare('INSERT INTO users(name,email,password_hash,role,student_id,card_type,qr_code,created_at) VALUES(?,?,?,?,?,?,?,?)');
            $ins->execute(['Administrator', 'admin@usdp.edu.ph', password_hash('password123', PASSWORD_DEFAULT), 'admin', 'ADMIN-0001', 'gold', 'UQR-' . bin2hex(random_bytes(8)), time()]);
        }
    }
}