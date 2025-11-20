<?php
spl_autoload_register(function($class){
  $prefixes = [
    'Core\\' => __DIR__ . '/../core/',
    'App\\Controllers\\' => __DIR__ . '/controllers/',
    'App\\Models\\' => __DIR__ . '/models/'
  ];
  foreach($prefixes as $prefix => $base){
    if(strpos($class, $prefix) === 0){
      $rel = str_replace($prefix, '', $class);
      $path = $base . str_replace('\\', '/', $rel) . '.php';
      if(file_exists($path)) require $path;
    }
  }
});
require __DIR__ . '/../config/config.php';
use Core\Database;
Database::init();