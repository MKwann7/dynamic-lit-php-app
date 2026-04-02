<?php

declare(strict_types=1);

namespace Application\Routing\Parameters;

class RouteUriParameter
{
    private string $name;
    private mixed $defaultValue = null;
    private ?string $type = null;

    public function __construct(string $name, mixed $defaultValue = null, string $type = null)
    {
        $this->name = $name;
        $this->defaultValue = $defaultValue;
        $this->type = $type;
    }

    // Set the default value and return self
    public function setDefaultValue(mixed $value): self
    {
        $this->defaultValue = $value;
        return $this;
    }

    // Set the parameter type as number (\d+)
    public function setTypeAsNumber(): self
    {
        $this->type = '\d+';
        return $this;
    }

    // Set the parameter type as string ([^/]+) — matches a single path segment
    public function setTypeAsString(): self
    {
        $this->type = '[^/]+';
        return $this;
    }

    // Set the parameter type as wildcard — matches an optional trailing slash + any sub-path.
    // Pattern (\/.*)?  matches:  "" (nothing), "/customers", "/customers/edit/5"
    // Combined with a default of '' this makes the parameter entirely optional.
    public function setTypeAsWildcard(): self
    {
        $this->type = '(\/.*)?';
        return $this;
    }

    // Check to see if the parameter type is set to number (\d+)
    public function isTypeNumber(): bool
    {
        return $this->type === '\d+';
    }

    // Check to see if the parameter type is set to string ([^/]+)
    public function isTypeString(): bool
    {
        return $this->type === '[^/]+';
    }

    // Check to see if the parameter type is set to wildcard
    public function isTypeWildcard(): bool
    {
        return $this->type === '(\/.*)?';
    }

    // Set a custom regex type
    public function setCustomType(string $regex): self
    {
        $this->type = $regex;
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function defaultValue(): string
    {
        return $this->name;
    }

    public function getDefaultValue(): mixed
    {
        return $this->defaultValue;
    }

    // Generate the default values array for URI parameters
    public function generateUriParameterArray(): array
    {
        if ($this->defaultValue === null) {
            return [];
        }

        return [$this->name => $this->defaultValue];
    }

    // Generate the requirements array for URI parameters
    public function generateUriRequirementArray(): array
    {
        return [$this->name => $this->type];
    }

    public function toArray(): array
    {
        return [
            "name" => $this->name,
            "defaultValue" => $this->defaultValue,
            "type" => $this->type,
        ];
    }
}