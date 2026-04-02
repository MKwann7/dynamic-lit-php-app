<?php

declare(strict_types=1);

use Application\Main;

const APP_START = "Http";

error_reporting(E_ALL ^ E_DEPRECATED);

require_once 'bootstrap.php';
return new Main(ROOT, APP_START);