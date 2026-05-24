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
- **Element types** – text (`drawString`), filled/outline rectangles, lines, filled/outline circles, single pixels (`p`)
- **Pixel-paint tool** – click or drag on the canvas to freehand-paint individual pixels; pick a grey-scale colour with the inline slider
- **Fonts** – Ubuntu40, Ubuntu40b, Ubuntu30, Ubuntu20 and Monospace12
- **Grayscale colour picker** – 0 (black) → 15 (white) for 4BPP displays
- **Layer ordering** – move elements up/down in rendering order
- **Live JSON footer** – click `{ } JSON` in the header to open a dark-themed footer panel spanning the full editor width; see the exact FastJsonDL payload update live as you design; drag the top edge to resize it; copy to clipboard in one click
- **JSON byte counter** – live KB size badge in the JSON footer; turns amber with a ⚠ warning when the payload exceeds 50 KB (BLE threshold)
- **BLE send** – one-click "🔵 BLE" button in the JSON footer; connects via Web Bluetooth (Chrome / Edge, HTTPS) and streams the JSON to your ESP32 in 512-byte chunks using the Nordic UART Service (configurable UUIDs)
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
| `drawString` | `x`, `y` (baseline), `string`, `font` (Ubuntu40 / Ubuntu40b / Ubuntu30 / Ubuntu20 / Monospace12), `c` |
| `fillRect` | `x`, `y`, `w`, `h`, `c` |
| `drawRect` | `x`, `y`, `w`, `h`, `c` |
| `drawLine` | `x1`, `y1`, `x2`, `y2`, `c` |
| `fillCircle` | `x`, `y`, `r`, `c` |
| `drawCircle` | `x`, `y`, `r`, `c` |
| `p` | `x`, `y`, `c` |
| `loadG5Image` | `x`, `y`, `w`, `h`, `fg`, `bg`, `data` (array of 2-char bare hex strings e.g. `"bf"`) |

`c` = grayscale colour value: `0` = black … `15` = white (4BPP) · `0`…`3` (2BPP) · `0`/`1` (1BPP)

### drawPixel example

```json
{ "type": "p", "x": 30, "y": 70, "c": 0 }
```

Use the **✏ Draw Pixel** toolbar tool to paint individual pixels on the canvas.  Click once to place a single pixel, or hold and drag to paint freehand.  Select a grey-scale colour with the colour slider that appears while the tool is active.

### G5 image hex format

The `data` array uses bare 2-character lowercase hex strings (e.g. `"bf"`) rather than the older `"0xbf"` format.  Both formats are accepted by FastJsonDL firmware.  The compact form saves ~33 % of data bytes per entry, which matters when sending payloads over BLE.

---

## Roadmap / future ideas

- SVG import → convert to line elements or `loadG5Image`
- Undo / Redo history
- Copy / paste elements
- Grid snapping
- Custom display resolution
- User accounts (multi-user)

---

## License

MIT — see [LICENSE](LICENSE).
