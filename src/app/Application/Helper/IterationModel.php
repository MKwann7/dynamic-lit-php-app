<?php

declare(strict_types=1);

namespace Application\Helper;

abstract class IterationModel implements \Iterator
{
    protected array $properties = [];

    public function rewind(): void
    {
        reset($this->properties);
    }

    public function current(): mixed
    {
        return current($this->properties);
    }

    public function next(): void
    {
        next($this->properties);
    }

    public function key(): string|int|null
    {
        return key($this->properties);
    }

    public function valid(): bool
    {
        $key = key($this->properties);
        return ($key !== NULL && $key !== FALSE);
    }
}