<?php
define('DB_PATH', __DIR__ . '/../storage/database.sqlite');
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'change-this-secret');
define('GCS_BUCKET', getenv('GCS_BUCKET') ?: '');
define('GCS_SIGN_URL_TTL', (int) (getenv('GCS_SIGN_URL_TTL') ?: 600));