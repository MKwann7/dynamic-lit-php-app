<?php

declare(strict_types=1);

namespace Application\Routing\Parameters;

use Application\Utilities\CollectionModel;

class RouteParameterCollection extends CollectionModel
{
    protected string|null $childClass = RouteUriParameter::class;

    public function registerParameters(array $parameters): self
    {
        foreach($parameters as $name => $paramData) {
            $newParameter = new RouteUriParameter($name);
            $newParameter->setDefaultValue($paramData[0]);
            switch($paramData[1]) {
                case "number":
                    $newParameter->setTypeAsNumber();
                    break;
                case "wildcard":
                    $newParameter->setTypeAsWildcard();
                    break;
                default:
                    $newParameter->setTypeAsString();
                    break;
            }
            $this->add($name, $newParameter);
        }
        return $this;
    }

    public function getUriParameterArrays(): array
    {
        $array = [];
        foreach ($this->properties as $currProperty)
        {
            $array = array_merge($array, $currProperty->generateUriParameterArray());
        }
        return $array;
    }

    public function getUriRequirementArrays(): array
    {
        $array = [];
        foreach ($this->properties as $currProperty)
        {
            $array = array_merge($array, $currProperty->generateUriRequirementArray());
        }
        return $array;
    }
}