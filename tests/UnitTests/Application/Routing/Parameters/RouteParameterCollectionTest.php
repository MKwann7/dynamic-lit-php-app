<?php

declare(strict_types=1);

namespace UnitTests\Application\Routing\Parameters;

use PHPUnit\Framework\TestCase;
use Application\Routing\Parameters\RouteParameterCollection;
use Application\Routing\Parameters\RouteUriParameter;

class RouteParameterCollectionTest extends TestCase
{
    // Constants to hold test data
    private const PARAMETERS = [
        'param1' => ['default_value1', 'string'],
        'param2' => [5, 'number']
    ];

    private RouteParameterCollection $parameterCollection;

    protected function setUp(): void
    {
        // Initialize a RouteParameterCollection object for each test
        $this->parameterCollection = new RouteParameterCollection();
    }

    /**
     * Test the registerParameters() method to ensure parameters are registered correctly.
     */
    public function testRegisterParameters(): void
    {
        // Call registerParameters with test data
        $this->parameterCollection->registerParameters(self::PARAMETERS);

        // Verify that the properties array contains the expected RouteUriParameter objects
        $this->assertInstanceOf(RouteUriParameter::class, $this->parameterCollection->get('param1'));
        $this->assertInstanceOf(RouteUriParameter::class, $this->parameterCollection->get('param2'));

        // Verify that the parameter names match
        $this->assertEquals('param1', $this->parameterCollection->get('param1')->getName());
        $this->assertEquals('param2', $this->parameterCollection->get('param2')->getName());
    }

    /**
     * Test that parameters are properly set with default values and types.
     */
    public function testParametersAreProperlySet(): void
    {
        // Call registerParameters with test data
        $this->parameterCollection->registerParameters(self::PARAMETERS);

        // Verify that param1 is of type string and has the correct default value
        $param1 = $this->parameterCollection->get('param1');
        $this->assertEquals('default_value1', $param1->getDefaultValue());
        $this->assertTrue($param1->isTypeString());

        // Verify that param2 is of type number and has the correct default value
        $param2 = $this->parameterCollection->get('param2');
        $this->assertEquals(5, $param2->getDefaultValue());
        $this->assertTrue($param2->isTypeNumber());
    }

    /**
     * Test the getUriParameterArrays() method to ensure it returns the correct structure.
     */
    public function testGetUriParameterArrays(): void
    {
        // Mock the RouteUriParameter to return test data
        $param1 = $this->createMock(RouteUriParameter::class);
        $param1->method('generateUriParameterArray')
            ->willReturn(['param1' => 'value1']);

        $param2 = $this->createMock(RouteUriParameter::class);
        $param2->method('generateUriParameterArray')
            ->willReturn(['param2' => 5]);

        // Add the mocked parameters to the collection
        $this->parameterCollection->add('param1', $param1);
        $this->parameterCollection->add('param2', $param2);

        // Get the URI parameter arrays and verify the result
        $result = $this->parameterCollection->getUriParameterArrays();
        $expected = ['param1' => 'value1', 'param2' => 5];

        $this->assertEquals($expected, $result);
    }

    /**
     * Test the getUriRequirementArrays() method to ensure it returns the correct requirement constraints.
     */
    public function testGetUriRequirementArrays(): void
    {
        // Mock the RouteUriParameter to return test data
        $param1 = $this->createMock(RouteUriParameter::class);
        $param1->method('generateUriRequirementArray')
            ->willReturn(['param1' => '[a-zA-Z]+']);

        $param2 = $this->createMock(RouteUriParameter::class);
        $param2->method('generateUriRequirementArray')
            ->willReturn(['param2' => '\d+']);

        // Add the mocked parameters to the collection
        $this->parameterCollection->add('param1', $param1);
        $this->parameterCollection->add('param2', $param2);

        // Get the URI requirement arrays and verify the result
        $result = $this->parameterCollection->getUriRequirementArrays();
        $expected = ['param1' => '[a-zA-Z]+', 'param2' => '\d+'];

        $this->assertEquals($expected, $result);
    }

    /**
     * Test that registerParameters() correctly registers a wildcard-type parameter.
     */
    public function testRegisterParametersWithWildcardType(): void
    {
        $this->parameterCollection->registerParameters([
            'trail' => ['', 'wildcard'],
        ]);

        $param = $this->parameterCollection->get('trail');
        $this->assertInstanceOf(RouteUriParameter::class, $param);
        $this->assertTrue($param->isTypeWildcard());
        $this->assertEquals('', $param->getDefaultValue());
    }

    /**
     * Test that registerParameters() defaults to string type for an unknown type value.
     */
    public function testRegisterParametersDefaultsToStringForUnknownType(): void
    {
        $this->parameterCollection->registerParameters([
            'slug' => ['my-slug', 'unknown_type'],
        ]);

        $param = $this->parameterCollection->get('slug');
        $this->assertInstanceOf(RouteUriParameter::class, $param);
        $this->assertTrue($param->isTypeString());
    }

    /**
     * Test that registerParameters() returns self for fluent chaining.
     */
    public function testRegisterParametersReturnsSelf(): void
    {
        $result = $this->parameterCollection->registerParameters(self::PARAMETERS);

        $this->assertSame($this->parameterCollection, $result);
    }

    /**
     * Test that getUriParameterArrays() omits parameters whose default value is null,
     * since generateUriParameterArray() returns [] for them.
     */
    public function testGetUriParameterArraysSkipsNullDefaultValues(): void
    {
        $paramWithValue = $this->createMock(RouteUriParameter::class);
        $paramWithValue->method('generateUriParameterArray')
            ->willReturn(['param1' => 'value1']);

        $paramWithNull = $this->createMock(RouteUriParameter::class);
        $paramWithNull->method('generateUriParameterArray')
            ->willReturn([]);

        $this->parameterCollection->add('param1', $paramWithValue);
        $this->parameterCollection->add('param2', $paramWithNull);

        $result = $this->parameterCollection->getUriParameterArrays();

        $this->assertEquals(['param1' => 'value1'], $result);
        $this->assertArrayNotHasKey('param2', $result);
    }
}
