#!/bin/bash
docker exec -it dynlit-app /app/vendor/phpunit/phpunit/phpunit /app/tests/"$@" --configuration /app/tests/phpunit.xml.dist
