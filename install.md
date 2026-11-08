# Install Protopass

Protopass turns an idea into a clickable prototype, built by your coding agent, on your machine.

These steps are for an agent to follow, and short enough for you to read first. They create one folder, `protopass/`, in the current folder. They download the kit from GitHub (MIT license, about 2 MB, 37 MB unpacked) and start a local server on your machine. Nothing is installed globally, and no account is needed. Afterwards, pages load fonts from Google Fonts and the home page asks GitHub if a new version exists. Nothing else leaves your machine.

## 1. Check Node

```bash
node --version
```

Node 20 or later is needed. If it is missing or older, stop and tell the person: "Protopass needs Node 20 or later, from https://nodejs.org." Install it only if they ask you to.

## 2. Download

If `protopass/kit/` already exists here, Protopass is installed: go to step 3. If a `protopass` folder exists without `kit/`, stop and ask what to do with it.

macOS and Linux:

```bash
curl -fsSL -o protopass.tar.gz https://github.com/Haidy-ID/protopass/releases/latest/download/protopass.tar.gz
tar -xzf protopass.tar.gz
rm protopass.tar.gz
```

Windows (PowerShell):

```powershell
curl.exe -fsSL -o protopass.tar.gz https://github.com/Haidy-ID/protopass/releases/latest/download/protopass.tar.gz
tar -xzf protopass.tar.gz
del protopass.tar.gz
```

## 3. Start the server

The same commands on macOS, Linux and Windows. The server runs in the background and keeps running after this step. It takes the first free port from 8000.

```bash
cd protopass
node kit/serve.mjs --background
```

It prints `Serving on http://localhost:<port>`. Keep that address.

## 4. Build the first prototype

Work inside `protopass/`. Read `AGENTS.md` there, then build the prototype with `kit/skills/new-topic.md`.

The idea comes from the person's message. If there is none, ask for it in one sentence. Keep this first prototype small: three screens at most, each with the states that matter.

## 5. Open it

Replace `<address>` with the address from step 3 and `<slug>` with the prototype's folder name. This page shows every screen and state at once.

macOS:

```bash
open "<address>/prototypes/<slug>/?view=canvas&flow=states"
```

Linux:

```bash
xdg-open "<address>/prototypes/<slug>/?view=canvas&flow=states"
```

Windows (PowerShell):

```powershell
start "<address>/prototypes/<slug>/?view=canvas&flow=states"
```

## 6. Report

Tell the person, in a few lines:

- The address of the prototype and of the home page.
- Which states you looked at and which you did not.
- For the next session: open your agent in `protopass/`, and start the server with `node kit/serve.mjs --background` if it stopped.
