FROM rust:1.68-buster as build
RUN USER=root cargo new --bin tonk-state-service 

COPY ./tonk-shared-lib ./tonk-shared-lib

WORKDIR ./tonk-state-service

COPY ./tonk-state-service/Cargo.toml ./Cargo.toml
COPY ./tonk-state-service/Cargo.lock ./Cargo.lock

RUN cargo build --release
RUN rm src/*.rs

COPY ./tonk-state-service/src ./src

# 5. Build for release.
RUN rm -f ./target/release/deps/tonk_state_service*;
RUN cargo build --release

# deploy stage
FROM debian:buster-slim

RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

# Install the missing library
RUN apt-get update && \
    apt-get install -y libssl1.1 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# # create app directory
RUN mkdir app 
WORKDIR /app

# # copy binary and configuration files
COPY --from=build /tonk-state-service/target/release/tonk-state-service ./
COPY ./tonk-state-service/.env.production ./.env.production
COPY ./tonk-state-service/.env.local ./.env.local

# # set the startup command to run your binary
CMD ["/app/tonk-state-service"]
