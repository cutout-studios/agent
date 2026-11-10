# Temporary Agent Setup Notes

> Last updated: November 2026

<img src="./example.png" width=320 />

Not a robust solution; a series of commands that gets an agent running locally
that's mostly functional. Instructions not guaranteed to work exactly as
written.

```sh
cd .temp-setup
brew bundle

# configure search
mkdir -p `~/.search`
cp settings.yml ~/.search/settings.yml

# start search service
podman machine start
podman run -d --name searxng -p 8081:8080 -v "~/.search:/etc/searxng" searxng/searxng

# generate terminal service password
openssl rand -base64 32

# start terminal service
pipx install open-terminal
open-terminal run --host 127.0.0.1 --port 8082 --api-key "[[TERMINAL PASSWORD]]"
```

Finally open Open WebUI and load the [config.json](./config.json),
[SYSTEM.md](./SYSTEM.md) into it.

Turn on the `llama.cpp` service and download the model most appropriate for your
system's requirements.

## Setup-specific Issues

- Policy is enforced at the start of each chat, not per-turn.
- Interrupts are bad - long-running tool calls, previous thinking is not taken
  into context when you interrupt the model to correct it.
- Long-form prompting is not supported. Write out your longer prompts in a
  separate document before sending them.
- Can't lazy-load MoEs.
