<?php

declare(strict_types=1);

namespace UnitTests\Application\Utilities;

use Application\Routing\Instance\RouteInstance;
use Application\Routing\Parameters\RouteUriParameter;
use Application\Utilities\CollectionModel;
use PHPUnit\Framework\TestCase;

class CollectionModelTest extends TestCase
{
    private TestCollection $collection;

    protected function setUp(): void
    {
        $this->collection = new TestCollection();
    }

    // -------------------------------------------------------------------------
    // add()
    // -------------------------------------------------------------------------

    /**
     * Test that add() stores a value retrievable by get().
     */
    public function testAddStoresValue(): void
    {
        $this->collection->add('key', 'value');

        $this->assertSame('value', $this->collection->get('key'));
    }

    /**
     * Test that add() returns self for fluent chaining.
     */
    public function testAddReturnsSelf(): void
    {
        $this->assertSame($this->collection, $this->collection->add('key', 'value'));
    }

    /**
     * Test that add() accepts any value when childClass is null.
     */
    public function testAddAcceptsAnyValueWhenChildClassIsNull(): void
    {
        $this->collection->add('str',   'hello');
        $this->collection->add('int',   42);
        $this->collection->add('arr',   [1, 2]);
        $this->collection->add('obj',   new \stdClass());
        $this->collection->add('null',  null);

        $this->assertSame('hello', $this->collection->get('str'));
        $this->assertSame(42,      $this->collection->get('int'));
    }

    /**
     * Test that add() throws when the value is not an instance of childClass.
     */
    public function testAddThrowsForWrongTypeOnTypedCollection(): void
    {
        $typed = new TestTypedCollection();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('This collection only accepts: ' . TestItem::class . 'type.');

        $typed->add('key', new \stdClass());
    }

    /**
     * Test that add() accepts a value that is an instance of childClass.
     */
    public function testAddAcceptsCorrectTypeOnTypedCollection(): void
    {
        $typed = new TestTypedCollection();
        $item  = new TestItem();

        $typed->add('item', $item);

        $this->assertSame($item, $typed->get('item'));
    }

    // -------------------------------------------------------------------------
    // get() and __get()
    // -------------------------------------------------------------------------

    /**
     * Test that get() returns the stored value.
     */
    public function testGetReturnsStoredValue(): void
    {
        $this->collection->add('key', 'value');

        $this->assertSame('value', $this->collection->get('key'));
    }

    /**
     * Test that get() returns null for a key that has not been set.
     */
    public function testGetReturnsNullForMissingKey(): void
    {
        $this->assertNull($this->collection->get('missing'));
    }

    /**
     * Test that __get() returns the stored value.
     */
    public function testMagicGetReturnsStoredValue(): void
    {
        $this->collection->add('key', 'value');

        $this->assertSame('value', $this->collection->key);
    }

    /**
     * Test that __get() returns null for a key that has not been set.
     */
    public function testMagicGetReturnsNullForMissingKey(): void
    {
        $this->assertNull($this->collection->missing);
    }

    // -------------------------------------------------------------------------
    // __set()
    // -------------------------------------------------------------------------

    /**
     * Test that __set() delegates to add() and stores the value.
     */
    public function testMagicSetDelegatesToAdd(): void
    {
        $this->collection->key = 'value';

        $this->assertSame('value', $this->collection->get('key'));
    }

    // -------------------------------------------------------------------------
    // __isset()
    // -------------------------------------------------------------------------

    /**
     * Test that __isset() returns true for a key that exists.
     */
    public function testMagicIssetReturnsTrueForExistingKey(): void
    {
        $this->collection->add('key', 'value');

        $this->assertTrue(isset($this->collection->key));
    }

    /**
     * Test that __isset() returns false for a key that does not exist.
     */
    public function testMagicIssetReturnsFalseForMissingKey(): void
    {
        $this->assertFalse(isset($this->collection->missing));
    }

    // -------------------------------------------------------------------------
    // removeByName()
    // -------------------------------------------------------------------------

    /**
     * Test that removeByName() deletes the entry so get() returns null afterward.
     */
    public function testRemoveByNameRemovesEntry(): void
    {
        $this->collection->add('key', 'value');
        $this->collection->removeByName('key');

        $this->assertNull($this->collection->get('key'));
    }

    /**
     * Test that removeByName() returns self for fluent chaining.
     */
    public function testRemoveByNameReturnsSelf(): void
    {
        $this->collection->add('key', 'value');

        $this->assertSame($this->collection, $this->collection->removeByName('key'));
    }

    /**
     * Test that removeByName() is a no-op when the key does not exist.
     */
    public function testRemoveByNameOnNonExistentKeyIsNoOp(): void
    {
        // Should not throw.
        $this->collection->removeByName('missing');
        $this->assertNull($this->collection->get('missing'));
    }

    // -------------------------------------------------------------------------
    // load()
    // -------------------------------------------------------------------------

    /**
     * Test that load() stores all items from the array.
     */
    public function testLoadAddsAllItemsFromArray(): void
    {
        $this->collection->load(['a' => 1, 'b' => 2, 'c' => 3]);

        $this->assertSame(1, $this->collection->get('a'));
        $this->assertSame(2, $this->collection->get('b'));
        $this->assertSame(3, $this->collection->get('c'));
    }

    /**
     * Test that load() returns self for fluent chaining.
     */
    public function testLoadReturnsSelf(): void
    {
        $this->assertSame($this->collection, $this->collection->load(['a' => 1]));
    }

    /**
     * Test that load() is a no-op and returns self for an empty array.
     */
    public function testLoadWithEmptyArrayReturnsEarly(): void
    {
        $result = $this->collection->load([]);

        $this->assertSame($this->collection, $result);
        $this->assertNull($this->collection->get('anything'));
    }

    /**
     * Test that load() is a no-op and returns self when passed a non-array.
     */
    public function testLoadWithNonArrayReturnsEarly(): void
    {
        $result = $this->collection->load('not-an-array');

        $this->assertSame($this->collection, $result);
        $this->assertNull($this->collection->get('anything'));
    }

    // -------------------------------------------------------------------------
    // foreach()
    // -------------------------------------------------------------------------

    /**
     * Test that foreach() invokes the callback for every stored item.
     */
    public function testForeachAppliesCallbackToAllItems(): void
    {
        $this->collection->add('a', 'alpha');
        $this->collection->add('b', 'beta');

        $visited = [];
        $this->collection->foreach(function ($value, $key) use (&$visited) {
            $visited[$key] = $value;
        });

        $this->assertSame(['a' => 'alpha', 'b' => 'beta'], $visited);
    }

    /**
     * Test that foreach() returns self for fluent chaining.
     */
    public function testForeachReturnsSelf(): void
    {
        $this->collection->add('a', 'alpha');

        $this->assertSame($this->collection, $this->collection->foreach(fn($v) => $v));
    }

    /**
     * Test that foreach() replaces the stored value when the callback returns
     * a truthy result.
     */
    public function testForeachUpdatesValueWhenCallbackReturnsTruthy(): void
    {
        $this->collection->add('key', 'original');

        $this->collection->foreach(fn($value) => strtoupper($value));

        $this->assertSame('ORIGINAL', $this->collection->get('key'));
    }

    /**
     * Test that foreach() does not replace the stored value when the callback
     * returns false.
     */
    public function testForeachDoesNotUpdateValueWhenCallbackReturnsFalse(): void
    {
        $this->collection->add('key', 'original');

        $this->collection->foreach(fn() => false);

        $this->assertSame('original', $this->collection->get('key'));
    }

    /**
     * Test that foreach() does not replace the stored value when the callback
     * returns null (null is falsy / empty).
     */
    public function testForeachDoesNotUpdateValueWhenCallbackReturnsNull(): void
    {
        $this->collection->add('key', 'original');

        $this->collection->foreach(fn() => null);

        $this->assertSame('original', $this->collection->get('key'));
    }

    /**
     * Test that foreach() is a no-op and returns self when the collection is empty.
     */
    public function testForeachReturnsEarlyOnEmptyCollection(): void
    {
        $called = false;
        $result = $this->collection->foreach(function () use (&$called) {
            $called = true;
        });

        $this->assertSame($this->collection, $result);
        $this->assertFalse($called);
    }

    /**
     * Test that foreach() is a no-op and returns self when given a non-callable.
     */
    public function testForeachReturnsEarlyForNonCallable(): void
    {
        $this->collection->add('key', 'value');

        $result = $this->collection->foreach('not-a-callable');

        $this->assertSame($this->collection, $result);
    }

    /**
     * Test that foreach() silently skips items whose stored value is empty
     * (null, false, 0, '' — anything empty() considers true).
     */
    public function testForeachSkipsEmptyValues(): void
    {
        $this->collection->add('empty', null);
        $this->collection->add('real',  'value');

        $visited = [];
        $this->collection->foreach(function ($value, $key) use (&$visited) {
            $visited[] = $key;
        });

        $this->assertSame(['real'], $visited);
    }

    // -------------------------------------------------------------------------
    // toArray() — scalar / typed values
    // -------------------------------------------------------------------------

    /**
     * Test that toArray() returns scalar values as-is.
     */
    public function testToArrayReturnsScalarValuesAsIs(): void
    {
        $this->collection->add('name', 'Alice');
        $this->collection->add('age',  30);

        $this->assertSame(['name' => 'Alice', 'age' => 30], $this->collection->toArray());
    }

    /**
     * Test that toArray() calls toArray() on RouteInstance values and uses
     * the result in place of the object.
     */
    public function testToArraySerializesRouteInstanceValues(): void
    {
        $routeInstance = $this->createConfiguredMock(RouteInstance::class, [
            'toArray' => ['_uri' => '/test'],
        ]);
        $this->collection->add('route', $routeInstance);

        $this->assertSame(['route' => ['_uri' => '/test']], $this->collection->toArray());
    }

    /**
     * Test that toArray() calls toArray() on RouteUriParameter values and uses
     * the result in place of the object.
     */
    public function testToArraySerializesRouteUriParameterValues(): void
    {
        $param = $this->createConfiguredMock(RouteUriParameter::class, [
            'toArray' => ['name' => 'id', 'defaultValue' => null, 'type' => '\d+'],
        ]);
        $this->collection->add('param', $param);

        $expected = ['param' => ['name' => 'id', 'defaultValue' => null, 'type' => '\d+']];
        $this->assertSame($expected, $this->collection->toArray());
    }

    // -------------------------------------------------------------------------
    // toArray() — $properties filter and key remapping
    // -------------------------------------------------------------------------

    /**
     * Test that passing an indexed $properties array limits output to those keys.
     */
    public function testToArrayWithIndexedPropertiesFilterExcludesOtherFields(): void
    {
        $this->collection->add('keep',   'yes');
        $this->collection->add('discard', 'no');

        $result = $this->collection->toArray(['keep']);

        $this->assertArrayHasKey('keep',    $result);
        $this->assertArrayNotHasKey('discard', $result);
    }

    /**
     * Test that passing an associative $properties array remaps the output keys.
     */
    public function testToArrayWithAssociativePropertiesFilterRemapsKeys(): void
    {
        $this->collection->add('original', 'value');

        $result = $this->collection->toArray(['original' => 'renamed']);

        $this->assertArrayHasKey('renamed',    $result);
        $this->assertArrayNotHasKey('original', $result);
        $this->assertSame('value', $result['renamed']);
    }

    /**
     * Test that passing null (the default) returns all fields without remapping.
     */
    public function testToArrayWithNullPropertiesReturnsAllFields(): void
    {
        $this->collection->add('a', 1);
        $this->collection->add('b', 2);

        $this->assertSame(['a' => 1, 'b' => 2], $this->collection->toArray(null));
    }

    // -------------------------------------------------------------------------
    // toArray() — nested CollectionModel (non-RouteInstance inner items)
    // -------------------------------------------------------------------------

    /**
     * Test that a nested CollectionModel whose items are not RouteInstances are
     * appended with numeric keys when $collectionKeys is false (default).
     */
    public function testToArraySerializesNestedCollectionWithoutCollectionKeys(): void
    {
        $inner = new TestCollection();
        $inner->add('x', 'foo');
        $inner->add('y', 'bar');

        $this->collection->add('nested', $inner);

        $result = $this->collection->toArray();

        // Items serialised as indexed (numeric) array.
        $this->assertSame(['foo', 'bar'], $result['nested']);
    }

    /**
     * Test that a nested CollectionModel whose items are not RouteInstances
     * preserve their original string keys when $collectionKeys is true.
     */
    public function testToArraySerializesNestedCollectionWithCollectionKeys(): void
    {
        $inner = new TestCollection();
        $inner->add('x', 'foo');
        $inner->add('y', 'bar');

        $this->collection->add('nested', $inner);

        $result = $this->collection->toArray(null, true);

        $this->assertSame(['x' => 'foo', 'y' => 'bar'], $result['nested']);
    }

    // -------------------------------------------------------------------------
    // toArray() — nested CollectionModel (RouteInstance inner items)
    // -------------------------------------------------------------------------

    /**
     * Test that RouteInstance items inside a nested CollectionModel are
     * serialised via toArray() and appended with numeric keys when
     * $collectionKeys is false.
     */
    public function testToArraySerializesNestedRouteInstanceInCollectionWithoutKeys(): void
    {
        $routeInstance = $this->createConfiguredMock(RouteInstance::class, [
            'toArray' => ['_uri' => '/nested'],
        ]);

        $inner = new TestCollection();
        $inner->add('r1', $routeInstance);

        $this->collection->add('routes', $inner);

        $result = $this->collection->toArray();

        $this->assertSame([['_uri' => '/nested']], $result['routes']);
    }

    /**
     * Test that RouteInstance items inside a nested CollectionModel are
     * serialised via toArray() and preserve their string keys when
     * $collectionKeys is true.
     */
    public function testToArraySerializesNestedRouteInstanceInCollectionWithKeys(): void
    {
        $routeInstance = $this->createConfiguredMock(RouteInstance::class, [
            'toArray' => ['_uri' => '/nested'],
        ]);

        $inner = new TestCollection();
        $inner->add('r1', $routeInstance);

        $this->collection->add('routes', $inner);

        $result = $this->collection->toArray(null, true);

        $this->assertSame(['r1' => ['_uri' => '/nested']], $result['routes']);
    }

    // -------------------------------------------------------------------------
    // toJson()
    // -------------------------------------------------------------------------

    /**
     * Test that toJson() returns a valid JSON string reflecting the collection.
     */
    public function testToJsonReturnsJsonEncodedString(): void
    {
        $this->collection->add('key', 'value');

        $json = $this->collection->toJson();

        $this->assertIsString($json);
        $this->assertSame(['key' => 'value'], json_decode($json, true));
    }

    /**
     * Test that toJson() returns '{}' (empty JSON object) for an empty collection.
     */
    public function testToJsonReturnsEmptyObjectForEmptyCollection(): void
    {
        $this->assertSame('[]', $this->collection->toJson());
    }

    // -------------------------------------------------------------------------
    // getChildClass()
    // -------------------------------------------------------------------------

    /**
     * Test that getChildClass() returns null for an untyped collection.
     */
    public function testGetChildClassReturnsNullForUntypedCollection(): void
    {
        $this->assertNull($this->collection->getChildClass());
    }

    /**
     * Test that getChildClass() returns the class name for a typed collection.
     */
    public function testGetChildClassReturnsClassNameForTypedCollection(): void
    {
        $this->assertSame(TestItem::class, (new TestTypedCollection())->getChildClass());
    }
}

// -----------------------------------------------------------------------------
// Test doubles
// -----------------------------------------------------------------------------

/** Untyped concrete collection — accepts any value. */
class TestCollection extends CollectionModel {}

/** Typed concrete collection — only accepts TestItem instances. */
class TestTypedCollection extends CollectionModel
{
    protected string|null $childClass = TestItem::class;
}

/** Minimal value class used as the accepted type in TestTypedCollection. */
class TestItem {}

