#!/bin/bash
docker exec -it maxr-app /app/vendor/phpunit/phpunit/phpunit /app/tests/"$@" --configuration /app/tests/phpunit.xml.dist
