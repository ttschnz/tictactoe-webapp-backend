# install dependencies
yarn --cwd /code/front-end --network-timeout 100000
# if skipbuild is not set, make a build
if [ -z "$SKIPBUILD" ]; then
  echo "Building front-end. To skip this set SKIPBUILD as env variable (e.g. docker compose run -e SKIPBUILD=TRUE web)"
  yarn --cwd /code/front-end build
fi
# run the server
python /code/main.py