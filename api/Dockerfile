FROM rust:alpine AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM alpine:3.20
RUN apk add --no-cache ca-certificates && \
    adduser -D -u 10001 appuser
WORKDIR /app
COPY --from=builder /app/target/release/tiny-myrmidon-api /usr/local/bin/tiny-myrmidon-api
USER 10001
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/tiny-myrmidon-api"]