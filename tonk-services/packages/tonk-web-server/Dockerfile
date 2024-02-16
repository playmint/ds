FROM rust:1.68-buster as build
RUN USER=root cargo new --bin tonk-web-server

COPY ./tonk-shared-lib ./tonk-shared-lib

WORKDIR ./tonk-web-server

COPY ./tonk-web-server/Cargo.toml ./Cargo.toml
COPY ./tonk-web-server/Cargo.lock ./Cargo.lock

RUN cargo build --release
RUN rm src/*.rs

COPY ./tonk-web-server/src ./src

# 5. Build for release.
RUN rm -f ./target/release/deps/tonk_web_server*;
RUN cargo build --release

# deploy stage
FROM debian:buster-slim

# # create app directory
RUN mkdir app 
WORKDIR /app

# # copy binary and configuration files
COPY --from=build /tonk-web-server/target/release/tonk-web-server ./
COPY ./tonk-web-server/.env.production ./.env.production
COPY ./tonk-web-server/.env.local ./.env.local

EXPOSE 8082

# # set the startup command to run your binary
CMD ["/app/tonk-web-server"]
