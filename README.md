# FastJsonRenderer

A web-based ePaper screen designer for [FastJsonDL](https://github.com/martinberlin/FastJsonDL).

Design screens visually in the browser, then export the resulting **FastJsonDL JSON** payload to be rendered on an ESP32-C5 (or similar) using the [FastEPD](https://github.com/bitbank2/FastEPD) library.

---

## 🚀 Getting started (DDEV + Docker)

> **Prerequisites** – you only need two tools installed on your host machine:
>
> - **Docker** – [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS / Windows) or Docker Engine (Linux)
> - **DDEV** – follow the [DDEV installation guide](https://ddev.readthedocs.io/en/stable/users/install/ddev-installation/) for your OS

Everything else (PHP 8.3, Composer, Node 20, MariaDB) runs inside Docker containers managed by DDEV.

### Step-by-step

```bash
# 1 – Clone the repository
git clone https://github.com/martinberlin/FastJsonRenderer.git
cd FastJsonRenderer

# 2 – Start the DDEV environment
#     On first run this pulls the Docker images (~few minutes).
ddev start

# 3 – Install PHP dependencies (runs Composer inside the container)
ddev composer install

# 4 – Install Node.js dependencies
ddev npm install

# 5 – Build the React frontend assets
ddev npm run build

# 6 – Create the database schema (runs Doctrine migrations)
ddev exec php bin/console doctrine:migrations:migrate --no-interaction

# 7 – Open the app in your browser  🎉
ddev launch
```

DDEV will print a URL such as `https://fastjsonrenderer.ddev.site` — open it and you will see the screen designer.

### One-command shortcut (Makefile)

If you have `make` available you can run everything above in a single step:

```bash
make setup
```

### Frontend development mode (live rebuild)

During development you can keep a file-watcher running so the browser updates automatically on every save:

```bash
# In a second terminal – keep this running while you edit React files
ddev npm run watch
```

---

## Features

- **Visual canvas** – 1:1 scale representation of the target display (default: ED052TC4 1280×780)
- **Drag-and-drop** – click an element on the canvas and drag it to reposition
- **Element types** – text (`drawString`), filled/outline rectangles, lines, filled/outline circles
- **Fonts** – Ubuntu40, Ubuntu30, Ubuntu20 (matching FastJsonDL font registry)
- **Grayscale colour picker** – 0 (black) → 15 (white) for 4BPP displays
- **Layer ordering** – move elements up/down in rendering order
- **Live JSON preview** – see the FastJsonDL payload update in real time
- **Export JSON** – download a `.json` file ready to POST to your ESP32
- **Persistence** – screens saved to MariaDB via Doctrine ORM (Symfony 7)

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Backend | Symfony 7, PHP 8.3 |
| ORM | Doctrine ORM + Migrations |
| Frontend | React 18 |
| Build tool | Webpack Encore |
| Dev environment | DDEV (Docker) |
| Database | MariaDB 10.11 |

---

## Useful commands

| Command | What it does |
|---------|-------------|
| `ddev start` | Start all containers |
| `ddev stop` | Stop all containers |
| `ddev npm run build` | Build frontend assets (production) |
| `ddev npm run watch` | Rebuild assets on every file change |
| `ddev exec php bin/console doctrine:migrations:migrate` | Apply new DB migrations |
| `ddev exec php bin/console cache:clear` | Clear Symfony cache |
| `ddev launch` | Open the site URL in your browser |
| `ddev mysql` | Open a MySQL shell to the DB |
| `ddev ssh` | SSH into the web container |

Or use `make <target>` shortcuts: `make start`, `make stop`, `make build`, `make watch`, `make migrate`, `make cc`, `make shell`, `make db-shell`.

---

## API reference

The Symfony backend exposes a REST API at `/api/screens`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/screens` | List all screens |
| `POST` | `/api/screens` | Create a new screen |
| `GET` | `/api/screens/{id}` | Get a single screen with all items |
| `PUT` | `/api/screens/{id}` | Update a screen |
| `DELETE` | `/api/screens/{id}` | Delete a screen |
| `GET` | `/api/screens/{id}/export` | Download FastJsonDL JSON payload |

### Screen payload (request / response)

```json
{
  "title": "My ePaper Design",
  "displayType": "ED052TC4",
  "displayWidth": 1280,
  "displayHeight": 780,
  "displayBpp": 4,
  "items": [
    { "type": "fillRect",   "x": 0,  "y": 0,  "w": 540, "h": 120, "c": 14 },
    { "type": "drawString", "font": "Ubuntu40", "string": "Hello!", "x": 30, "y": 80, "c": 0 }
  ]
}
```

### FastJsonDL export format

The `/api/screens/{id}/export` endpoint returns a payload ready to be sent directly to your ESP32:

```json
{
  "display_bpp": 4,
  "clear": true,
  "items": [ ... ]
}
```

---

## Supported element types

| Type | Required properties |
|------|-----------|
| `drawString` | `x`, `y` (baseline), `string`, `font` (Ubuntu40 / Ubuntu30 / Ubuntu20), `c` |
| `fillRect` | `x`, `y`, `w`, `h`, `c` |
| `drawRect` | `x`, `y`, `w`, `h`, `c` |
| `drawLine` | `x1`, `y1`, `x2`, `y2`, `c` |
| `fillCircle` | `x`, `y`, `r`, `c` |
| `drawCircle` | `x`, `y`, `r`, `c` |

`c` = grayscale colour value: `0` = black … `15` = white (4BPP) · `0`…`3` (2BPP) · `0`/`1` (1BPP)

---

## Roadmap / future ideas

- SVG import → convert to line elements or `loadG5Image`
- Undo / Redo history
- Copy / paste elements
- Grid snapping
- Custom display resolution
- User accounts (multi-user)
- Live preview push to device via MQTT

---

## License

MIT — see [LICENSE](LICENSE).


- **Visual canvas** – 1:1 scale representation of the target display (default: ED052TC4 1280×780)
- **Drag-and-drop** – click an element on the canvas and drag it to reposition
- **Element types** – text (`drawString`), filled/outline rectangles, lines, filled/outline circles
- **Fonts** – Ubuntu40, Ubuntu30, Ubuntu20 (matching FastJsonDL font registry)
- **Grayscale colour picker** – 0 (black) → 15 (white) for 4BPP displays
- **Layer ordering** – move elements up/down in rendering order
- **Live JSON preview** – see the FastJsonDL payload update in real time
- **Export JSON** – download a `.json` file ready to POST to your ESP32
- **Persistence** – screens saved to MariaDB via Doctrine ORM (Symfony 7)

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Backend | Symfony 7, PHP 8.3 |
| ORM | Doctrine ORM + Migrations |
| Frontend | React 18 |
| Build tool | Webpack Encore |
| Dev environment | DDEV (Docker) |
| Database | MariaDB 10.11 |

---

## Local development setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose)
- [DDEV](https://ddev.readthedocs.io/en/stable/users/install/ddev-installation/)

### Quick start

```bash
# 1. Clone the repository
git clone https://github.com/martinberlin/FastJsonRenderer.git
cd FastJsonRenderer

# 2. Start DDEV (downloads PHP 8.3 + MariaDB images on first run)
ddev start

# 3. Install PHP dependencies
ddev composer install

# 4. Install Node dependencies and build the frontend
ddev npm install
ddev npm run build

# 5. Run database migrations
ddev exec php bin/console doctrine:migrations:migrate --no-interaction

# 6. Open the app in your browser
ddev launch
```

Or use the Makefile shortcut:

```bash
make setup   # runs start + install + migrate + build
```

### Development mode (file watcher)

```bash
ddev npm run watch   # rebuilds JS/CSS on every save
```

### Useful commands

| Command | Description |
|---------|-------------|
| `make start` | Start DDEV containers |
| `make stop` | Stop DDEV containers |
| `make build` | Build production assets |
| `make watch` | Start Webpack watcher |
| `make migrate` | Run pending DB migrations |
| `make cc` | Clear Symfony cache |
| `make shell` | SSH into the web container |
| `make db-shell` | Open a MySQL shell |

---

## API reference

The Symfony backend exposes a REST API at `/api/screens`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/screens` | List all screens |
| `POST` | `/api/screens` | Create a new screen |
| `GET` | `/api/screens/{id}` | Get a single screen with all items |
| `PUT` | `/api/screens/{id}` | Update a screen |
| `DELETE` | `/api/screens/{id}` | Delete a screen |
| `GET` | `/api/screens/{id}/export` | Download FastJsonDL JSON payload |

### Screen JSON format (API request/response)

```json
{
  "title": "My EPaper Design",
  "displayType": "ED052TC4",
  "displayWidth": 1280,
  "displayHeight": 780,
  "displayBpp": 4,
  "items": [
    { "type": "fillRect", "x": 0, "y": 0, "w": 540, "h": 120, "c": 14 },
    { "type": "drawString", "font": "Ubuntu40", "string": "Hello!", "x": 30, "y": 80, "c": 0 }
  ]
}
```

### FastJsonDL export format

The `/export` endpoint returns a payload ready to be sent directly to your ESP32:

```json
{
  "display_bpp": 4,
  "clear": true,
  "items": [ ... ]
}
```

---

## Supported element types

| Type | Properties |
|------|-----------|
| `drawString` | `x`, `y` (baseline), `string`, `font` (Ubuntu40/30/20), `c` |
| `fillRect` | `x`, `y`, `w`, `h`, `c` |
| `drawRect` | `x`, `y`, `w`, `h`, `c` |
| `drawLine` | `x1`, `y1`, `x2`, `y2`, `c` |
| `fillCircle` | `x`, `y`, `r`, `c` |
| `drawCircle` | `x`, `y`, `r`, `c` |

`c` = grayscale colour value: `0`=black … `15`=white (4BPP), `0`=black … `3`=white (2BPP), `0/1` (1BPP)

---

## Roadmap / future ideas

- SVG import → convert to line elements or `loadG5Image`
- Undo / Redo history
- Copy / paste elements
- Grid snapping
- Multiple display presets / custom resolution
- User accounts (multi-user)
- Live preview push to device via MQTT

---

## License

MIT — see [LICENSE](LICENSE).
