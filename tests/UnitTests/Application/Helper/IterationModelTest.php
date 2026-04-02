<?php

namespace UnitTests\Application\Helper;

use Application\Helper\IterationModel;
use PHPUnit\Framework\TestCase;

class IterationModelTest extends TestCase
{
    // Abstracted string literals into private constants
    private const PROPERTIES_TEST_THREE = ['first', 'second', 'third'];
    private const PROPERTIES_TEST_KEYS = ['a' => 'apple', 'b' => 'banana', 'c' => 'cherry'];

    private const FIRST_ELEMENT = 'first';
    private const SECOND_ELEMENT = 'second';
    private const THIRD_ELEMENT = 'third';

    private const KEY_A = 'a';
    private const KEY_B = 'b';
    private const KEY_C = 'c';

    private TestIterationModel $iterator;

    protected function setUp(): void
    {
        // Create an instance of the concrete test class
        $this->iterator = new TestIterationModel();
    }

    /**
     * Test rewind() resets the internal pointer
     */
    public function testRewindResetsPointer()
    {
        // Set some properties to iterate over
        $this->iterator->setProperties(self::PROPERTIES_TEST_THREE);

        // Move the pointer forward manually
        $this->iterator->next();

        // Assert the pointer is no longer at the first position
        $this->assertEquals(self::SECOND_ELEMENT, $this->iterator->current());

        // Rewind and assert the pointer is reset to the beginning
        $this->iterator->rewind();
        $this->assertEquals(self::FIRST_ELEMENT, $this->iterator->current());
    }

    /**
     * Test current() returns the current element
     */
    public function testCurrentReturnsCurrentElement()
    {
        // Set some properties
        $this->iterator->setProperties(self::PROPERTIES_TEST_THREE);

        // Initially, the current element should be the first one
        $this->assertEquals(self::FIRST_ELEMENT, $this->iterator->current());

        // Move forward and check the current element
        $this->iterator->next();
        $this->assertEquals(self::SECOND_ELEMENT, $this->iterator->current());

        // Move forward again and check
        $this->iterator->next();
        $this->assertEquals(self::THIRD_ELEMENT, $this->iterator->current());
    }

    /**
     * Test next() advances the pointer
     */
    public function testNextAdvancesPointer()
    {
        // Set some properties
        $this->iterator->setProperties(self::PROPERTIES_TEST_THREE);

        // Initially, the pointer should be at the first element
        $this->assertEquals(self::FIRST_ELEMENT, $this->iterator->current());

        // Call next() and check the pointer
        $this->iterator->next();
        $this->assertEquals(self::SECOND_ELEMENT, $this->iterator->current());

        // Call next() again
        $this->iterator->next();
        $this->assertEquals(self::THIRD_ELEMENT, $this->iterator->current());
    }

    /**
     * Test key() returns the current key
     */
    public function testKeyReturnsCurrentKey()
    {
        // Set some properties with string keys
        $this->iterator->setProperties(self::PROPERTIES_TEST_KEYS);

        // Initially, the key should be 'a'
        $this->assertEquals(self::KEY_A, $this->iterator->key());

        // Move forward and check the key
        $this->iterator->next();
        $this->assertEquals(self::KEY_B, $this->iterator->key());

        // Move forward again
        $this->iterator->next();
        $this->assertEquals(self::KEY_C, $this->iterator->key());
    }

    /**
     * Test valid() returns true when the current position is valid
     */
    public function testValidReturnsTrueForValidPosition()
    {
        // Set some properties
        $this->iterator->setProperties(self::PROPERTIES_TEST_THREE);

        // Initially, the position is valid
        $this->assertTrue($this->iterator->valid());

        // Move forward and check validity
        $this->iterator->next();
        $this->assertTrue($this->iterator->valid());

        // Move to the end and check validity
        $this->iterator->next();
        $this->assertTrue($this->iterator->valid());

        // Move beyond the end and check validity
        $this->iterator->next();
        $this->assertFalse($this->iterator->valid());
    }
}

class TestIterationModel extends IterationModel
{
    // For testing, we expose a method to set properties
    public function setProperties(array $properties): void
    {
        $this->properties = $properties;
    }
}