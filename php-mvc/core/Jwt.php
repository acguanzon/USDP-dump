<?php
declare(strict_types=1);

namespace Core;

class Jwt
{
    public static function sign(array $payload, string $secret = ''): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $h = self::b64(json_encode($header));
        $p = self::b64(json_encode($payload));
        $s = self::b64(hash_hmac('sha256', $h . '.' . $p, $secret ?: (defined('JWT_SECRET') ? JWT_SECRET : ''), true));
        return $h . '.' . $p . '.' . $s;
    }

    public static function verify(string $token, string $secret = ''): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $s] = $parts;
        $expSig = self::b64(hash_hmac('sha256', $h . '.' . $p, $secret ?: (defined('JWT_SECRET') ? JWT_SECRET : ''), true));
        if (!hash_equals($expSig, $s)) {
            return null;
        }
        $data = json_decode(self::ub64($p), true);
        if (!is_array($data)) {
            return null;
        }
        if (isset($data['exp']) && time() > (int) $data['exp']) {
            return null;
        }
        return $data;
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function ub64(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }
}