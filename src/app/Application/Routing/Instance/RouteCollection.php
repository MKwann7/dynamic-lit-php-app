<?php

declare(strict_types=1);

namespace Application\Routing\Instance;

use Application\Utilities\CollectionModel;

class RouteCollection extends CollectionModel
{
    protected string|null $childClass = RouteInstance::class;
}