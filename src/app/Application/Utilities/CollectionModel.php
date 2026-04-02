<?php

declare(strict_types=1);

namespace Application\Utilities;

use Application\Helper\IterationModel;
use Application\Routing\Instance\RouteInstance;
use Application\Routing\Parameters\RouteUriParameter;

abstract class CollectionModel extends IterationModel
{
    protected string|null $childClass = null;

    public function __get($name): mixed
    {
        if (!isset($this->properties[$name]))
        {
            return null;
        }

        return $this->properties[$name];
    }

    /**
     * @throws \Exception
     */
    public function __set($name, $value)
    {
        return $this->add($name, $value);
    }

    public function __isset(string $name)
    {
        return isset($this->properties[$name]);
    }

    public function removeByName(string $name): self
    {
        unset($this->properties[$name]);
        return $this;
    }

    /**
     * @throws \Exception
     */
    public function add($name, $value): self
    {
        if ($this->childClass !== null && !is_a($value, $this->childClass)) {
            throw new \Exception("This collection only accepts: " . $this->childClass . "type.");
        }
        $this->properties[$name] = $value;
        return $this;
    }

    public function get($name): mixed
    {
        if (!isset($this->properties[$name]))
        {
            return null;
        }

        return $this->properties[$name];
    }

    /**
     * @throws \Exception
     */
    public function load($arItems) : self
    {
        if ( !is_array($arItems) || count($arItems) === 0)
        {
            return $this;
        }

        foreach($arItems as $currKey => $currData)
        {
            $this->add($currKey, $currData);
        }

        return $this;
    }

    public function foreach($callback) : self
    {
        if (! is_callable($callback) || count($this->properties) === 0)
        {
            return $this;
        }

        foreach($this->properties as $currKey => $currData)
        {
            if (!empty($currData))
            {
                $result = $callback($currData, $currKey);

                if (empty($result) || $result === false) { continue; }

                $this->properties[$currKey] = $result;
            }
        }

        return $this;
    }

    public function toArray($properties = null, $collectionKeys = false): array
    {
        $arToArray = [];
        foreach ($this->properties as $currField => $currValue)
        {
            if (is_array($properties))
            {
                if (!in_array($currField, $properties) && !array_key_exists($currField, $properties))
                {
                    continue;
                }
            }

            $newKey = $currField;

            if ($properties !== null && array_key_exists($currField, $properties))
            {
                $newKey = $properties[$currField];
            }

            if (is_a($currValue, RouteInstance::class) || is_a($currValue, RouteUriParameter::class))
            {
                $arToArray[$newKey] = $currValue->toArray();
            }
            elseif (is_a($currValue, CollectionModel::class))
            {
                foreach($currValue as $currKey => $currItem)
                {
                    if (is_a($currItem, RouteInstance::class))
                    {
                        if ($collectionKeys === true)
                        {
                            $arToArray[$newKey][$currKey] = $currItem->toArray();
                        }
                        else
                        {
                            $arToArray[$newKey][] = $currItem->toArray();
                        }
                    }
                    else
                    {
                        if ($collectionKeys === true)
                        {
                            $arToArray[$newKey][$currKey] = $currItem;
                        }
                        else
                        {
                            $arToArray[$newKey][] = $currItem;
                        }
                    }
                }
            }
            else
            {
                $arToArray[$newKey] = $currValue;
            }
        }

        return $arToArray;
    }

    public function toJson(): false|string
    {
        return json_encode($this->toArray());
    }

    /**
     * @return string|null
     */
    public function getChildClass(): ?string
    {
        return $this->childClass;
    }
}