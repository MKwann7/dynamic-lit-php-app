<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing\Parameters;

use Application\Routing\Parameters\RouteUriParameter;
use PHPUnit\Framework\TestCase;

class RouteUriParameterTest extends TestCase
{
    private const string TEST_NAME         = 'id';
    private const mixed  TEST_DEFAULT      = 42;
    private const string TEST_CUSTOM_REGEX = '[a-z]{3}';

    private RouteUriParameter $param;

    protected function setUp(): void
    {
        $this->param = new RouteUriParameter(self::TEST_NAME);
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /**
     * Test that the constructor sets name and leaves defaultValue / type as null
     * when only the name argument is provided.
     */
    public function testConstructorSetsNameAndDefaultsToNull(): void
    {
        $this->assertSame(self::TEST_NAME, $this->param->getName());
        $this->assertNull($this->param->getDefaultValue());
    }

    /**
     * Test that the constructor accepts and stores all three arguments.
     */
    public function testConstructorSetsAllArguments(): void
    {
        $param = new RouteUriParameter(self::TEST_NAME, self::TEST_DEFAULT, '\d+');

        $this->assertSame(self::TEST_NAME, $param->getName());
        $this->assertSame(self::TEST_DEFAULT, $param->getDefaultValue());
        $this->assertTrue($param->isTypeNumber());
    }

    // -------------------------------------------------------------------------
    // getName()
    // -------------------------------------------------------------------------

    /**
     * Test that getName() returns the name set in the constructor.
     */
    public function testGetNameReturnsName(): void
    {
        $this->assertSame(self::TEST_NAME, $this->param->getName());
    }

    // -------------------------------------------------------------------------
    // setDefaultValue() / getDefaultValue()
    // -------------------------------------------------------------------------

    /**
     * Test that getDefaultValue() returns null before any value is set.
     */
    public function testGetDefaultValueReturnsNullByDefault(): void
    {
        $this->assertNull($this->param->getDefaultValue());
    }

    /**
     * Test that setDefaultValue() stores the value and getDefaultValue() returns it.
     */
    public function testSetDefaultValueStoresValue(): void
    {
        $this->param->setDefaultValue(self::TEST_DEFAULT);

        $this->assertSame(self::TEST_DEFAULT, $this->param->getDefaultValue());
    }

    /**
     * Test that setDefaultValue() accepts null, clearing a previously set value.
     */
    public function testSetDefaultValueAcceptsNull(): void
    {
        $this->param->setDefaultValue(self::TEST_DEFAULT);
        $this->param->setDefaultValue(null);

        $this->assertNull($this->param->getDefaultValue());
    }

    /**
     * Test that setDefaultValue() returns self for fluent chaining.
     */
    public function testSetDefaultValueReturnsSelf(): void
    {
        $this->assertSame($this->param, $this->param->setDefaultValue(self::TEST_DEFAULT));
    }

    // -------------------------------------------------------------------------
    // defaultValue() — note: returns $this->name, not $this->defaultValue
    // -------------------------------------------------------------------------

    /**
     * Test that defaultValue() returns the parameter name.
     *
     * Note: this method appears to contain a bug — it returns $this->name
     * rather than $this->defaultValue. This test documents the current
     * behaviour so any future correction is immediately visible.
     */
    public function testDefaultValueMethodReturnsName(): void
    {
        $this->param->setDefaultValue(self::TEST_DEFAULT);

        $this->assertSame(self::TEST_NAME, $this->param->defaultValue());
    }

    // -------------------------------------------------------------------------
    // Type setters — correctness
    // -------------------------------------------------------------------------

    /**
     * Test that setTypeAsNumber() stores the \d+ pattern.
     */
    public function testSetTypeAsNumberSetsCorrectPattern(): void
    {
        $this->param->setTypeAsNumber();

        $this->assertTrue($this->param->isTypeNumber());
        $this->assertFalse($this->param->isTypeString());
        $this->assertFalse($this->param->isTypeWildcard());
    }

    /**
     * Test that setTypeAsString() stores the [^/]+ pattern.
     */
    public function testSetTypeAsStringSetsCorrectPattern(): void
    {
        $this->param->setTypeAsString();

        $this->assertTrue($this->param->isTypeString());
        $this->assertFalse($this->param->isTypeNumber());
        $this->assertFalse($this->param->isTypeWildcard());
    }

    /**
     * Test that setTypeAsWildcard() stores the (\/.*)?  pattern.
     */
    public function testSetTypeAsWildcardSetsCorrectPattern(): void
    {
        $this->param->setTypeAsWildcard();

        $this->assertTrue($this->param->isTypeWildcard());
        $this->assertFalse($this->param->isTypeNumber());
        $this->assertFalse($this->param->isTypeString());
    }

    /**
     * Test that setCustomType() stores an arbitrary regex and none of the
     * built-in type checkers return true for it.
     */
    public function testSetCustomTypeSetsArbitraryRegex(): void
    {
        $this->param->setCustomType(self::TEST_CUSTOM_REGEX);

        $this->assertFalse($this->param->isTypeNumber());
        $this->assertFalse($this->param->isTypeString());
        $this->assertFalse($this->param->isTypeWildcard());
    }

    /**
     * Test that all type checkers return false when no type has been set.
     */
    public function testTypeCheckersAllReturnFalseWhenTypeIsNull(): void
    {
        $this->assertFalse($this->param->isTypeNumber());
        $this->assertFalse($this->param->isTypeString());
        $this->assertFalse($this->param->isTypeWildcard());
    }

    /**
     * Test that a later type setter overwrites the previously set type.
     */
    public function testTypeSetterOverwritesPreviousType(): void
    {
        $this->param->setTypeAsNumber();
        $this->param->setTypeAsString();

        $this->assertTrue($this->param->isTypeString());
        $this->assertFalse($this->param->isTypeNumber());
    }

    // -------------------------------------------------------------------------
    // Type setters — fluent interface
    // -------------------------------------------------------------------------

    /**
     * Test that setTypeAsNumber() returns self for fluent chaining.
     */
    public function testSetTypeAsNumberReturnsSelf(): void
    {
        $this->assertSame($this->param, $this->param->setTypeAsNumber());
    }

    /**
     * Test that setTypeAsString() returns self for fluent chaining.
     */
    public function testSetTypeAsStringReturnsSelf(): void
    {
        $this->assertSame($this->param, $this->param->setTypeAsString());
    }

    /**
     * Test that setTypeAsWildcard() returns self for fluent chaining.
     */
    public function testSetTypeAsWildcardReturnsSelf(): void
    {
        $this->assertSame($this->param, $this->param->setTypeAsWildcard());
    }

    /**
     * Test that setCustomType() returns self for fluent chaining.
     */
    public function testSetCustomTypeReturnsSelf(): void
    {
        $this->assertSame($this->param, $this->param->setCustomType(self::TEST_CUSTOM_REGEX));
    }

    // -------------------------------------------------------------------------
    // generateUriParameterArray()
    // -------------------------------------------------------------------------

    /**
     * Test that generateUriParameterArray() returns an empty array when
     * defaultValue is null.
     */
    public function testGenerateUriParameterArrayReturnsEmptyArrayWhenDefaultIsNull(): void
    {
        $this->assertSame([], $this->param->generateUriParameterArray());
    }

    /**
     * Test that generateUriParameterArray() returns [name => defaultValue]
     * when a default value is set.
     */
    public function testGenerateUriParameterArrayReturnsNameValuePairWhenDefaultIsSet(): void
    {
        $this->param->setDefaultValue(self::TEST_DEFAULT);

        $this->assertSame(
            [self::TEST_NAME => self::TEST_DEFAULT],
            $this->param->generateUriParameterArray()
        );
    }

    // -------------------------------------------------------------------------
    // generateUriRequirementArray()
    // -------------------------------------------------------------------------

    /**
     * Test that generateUriRequirementArray() returns [name => type] using the
     * currently set type pattern.
     */
    public function testGenerateUriRequirementArrayReturnsNameTypePair(): void
    {
        $this->param->setTypeAsNumber();

        $this->assertSame(
            [self::TEST_NAME => '\d+'],
            $this->param->generateUriRequirementArray()
        );
    }

    /**
     * Test that generateUriRequirementArray() returns [name => null] when no
     * type has been set.
     */
    public function testGenerateUriRequirementArrayReturnsNullTypeWhenUnset(): void
    {
        $this->assertSame(
            [self::TEST_NAME => null],
            $this->param->generateUriRequirementArray()
        );
    }

    // -------------------------------------------------------------------------
    // toArray()
    // -------------------------------------------------------------------------

    /**
     * Test that toArray() returns the full name / defaultValue / type structure.
     */
    public function testToArrayReturnsCorrectStructure(): void
    {
        $this->param->setDefaultValue(self::TEST_DEFAULT);
        $this->param->setTypeAsString();

        $this->assertSame(
            [
                'name'         => self::TEST_NAME,
                'defaultValue' => self::TEST_DEFAULT,
                'type'         => '[^/]+',
            ],
            $this->param->toArray()
        );
    }

    /**
     * Test that toArray() returns null for defaultValue and type when neither
     * has been set.
     */
    public function testToArrayReturnsNullsForUnsetFields(): void
    {
        $this->assertSame(
            [
                'name'         => self::TEST_NAME,
                'defaultValue' => null,
                'type'         => null,
            ],
            $this->param->toArray()
        );
    }
}

