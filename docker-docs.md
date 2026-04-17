# Build Docker Image

## Dev
- docker compose -f docker-compose.dev.yml --env-file dev.env build

## Run Dev using compose locally
- docker compose -f docker-compose.dev.yml --env-file dev.env up

## Prod
- docker compose -f docker-compose.prod.yml --env-file prod.env build

# Deploy image to Google Artifact, running docker push [docker-compose.dev.yml] image name (Compare the image name in docker-compose.dev.yml to ensure it matches the specified name.)

## Dev     
- docker push us-east1-docker.pkg.dev/q6dev-186015/smartcollector-master-v2/smartcollector-master:v1.0.0

## Prod
- docker push us-east1-docker.pkg.dev/stable-glass-183220/smartcollector-master-v2/smartcollector-master:v1.0.1
