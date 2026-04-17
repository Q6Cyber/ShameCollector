# syntax=docker/dockerfile:1

FROM node:24.14.0-alpine as local
WORKDIR /app
COPY package.json package.json
RUN --mount=type=secret,id=npmtoken \
    export NPM_TOKEN=$(cat /run/secrets/npmtoken) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    yarn install && \
    rm .npmrc
CMD ["yarn", "start:dev"]

FROM node:24.14.0-alpine as dev-deps
WORKDIR /app
COPY yarn.lock yarn.lock
COPY package.json package.json
RUN --mount=type=secret,id=npmtoken \
    export NPM_TOKEN=$(cat /run/secrets/npmtoken) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    yarn install && \
    rm .npmrc

FROM node:24.14.0-alpine as test
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . . 
RUN yarn test:init

FROM node:24.14.0-alpine as builder
WORKDIR /app
COPY package.json ./package.json
COPY yarn.lock yarn.lock
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM node:24.14.0-alpine as prod-deps
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
RUN --mount=type=secret,id=npmtoken \
    export NPM_TOKEN=$(cat /run/secrets/npmtoken) && \
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc && \
    yarn install --prod && \
    rm .npmrc

FROM node:24.14.0-alpine as production
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY tsconfig.json tsconfig.json
COPY prod.env .env
ENV APP_VERSION=${APP_VERSION}
RUN yarn global add @nestjs/cli
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE ${PORT}
CMD [ "yarn","start"]

FROM node:24.14.0-alpine as dev
WORKDIR /app
COPY package.json package.json
COPY yarn.lock yarn.lock
COPY tsconfig.json tsconfig.json
COPY dev.env .env
ENV APP_VERSION=${APP_VERSION}
RUN yarn global add @nestjs/cli
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE ${PORT}
CMD [ "yarn","start"]