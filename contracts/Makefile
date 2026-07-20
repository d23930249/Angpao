# Angpao Escrow — build / test / optimize
# Requires: Rust (stable + wasm32-unknown-unknown) and the Stellar CLI.

WASM = target/wasm32v1-none/release/angpao_escrow.wasm

default: build

build:
	stellar contract build
	@ls -lh $(WASM)

# Pure-Rust unit tests (no network, no toolchain beyond cargo).
test:
	cargo test

optimize: build
	stellar contract optimize --wasm $(WASM)

fmt:
	cargo fmt --all

lint:
	cargo clippy --all-targets -- -D warnings

clean:
	cargo clean

.PHONY: default build test optimize fmt lint clean
