# MCP server (itinerář, hráči, hlasování)

NaVlastniKuzi vystavuje svá data přes **MCP** (Model Context Protocol), takže
externí Claude (Claude Desktop nebo claude.ai custom connector) může číst a
upravovat hru — např. _„přidej snídani 8:00–9:00 do Dne 1“_.

## Endpoint

- **URL (lokálně):** `http://127.0.0.1:3000/api/mcp`
- **Transport:** Streamable HTTP, **stateless** (jeden JSON-RPC požadavek na POST).
- **Runtime:** Node.js.

## Autentizace

Tokeny se **generují přímo v aplikaci** — admin je vytvoří na stránce
**`/mcp-tokeny`** (odkaz „MCP tokeny" na úvodní stránce, jen pro administrátory).
Token se zobrazí **jen jednou** při vytvoření; v databázi se ukládá pouze jeho
**SHA-256 hash**. Každý požadavek musí nést token jako bearer:

```
Authorization: Bearer <token z /mcp-tokeny>
```

- Chybí/špatný/neexistující/odvolaný token → **401**.
- Chyba databáze při ověření → **503** (fail-closed).

Token lze kdykoli **odvolat** (tlačítko „Odvolat") — tím okamžitě přestane
platit. Žádná proměnná prostředí (`MCP_TOKEN`) se už nepoužívá — brána
organizátora jsou výhradně tyto DB tokeny (stejná role jako přihlášení v
webové aplikaci).

## Připojení Claude connectoru

1. Spusť appku: `npm run dev` (poslouchá na `:3000`).
2. Jako admin otevři **`/mcp-tokeny`**, vytvoř token a zkopíruj si ho (zobrazí
   se jen jednou).
3. V Claude (Desktop / claude.ai) přidej **custom connector** typu MCP s URL
   `http://127.0.0.1:3000/api/mcp` a hlavičkou `Authorization: Bearer <token>`.
   (CLI: `claude mcp add --transport http navlastnikuzi
http://localhost:3000/api/mcp --header "Authorization: Bearer <token>"`.)
4. Claude si načte seznam nástrojů (`tools/list`) a může je volat.

## Nástroje

### Itinerář

| Nástroj        | Vstup                                                                                                   | Co dělá                                              |
| -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `list_days`    | –                                                                                                       | Dny + události se **zobrazenými (posunutými) časy**. |
| `create_day`   | `date` (YYYY-MM-DD), `label`                                                                            | Vytvoří den.                                         |
| `create_event` | `dayId`, `title`, `startTime`/`endTime` (HH:mm), `location?`, `note?`, `link?`, `items?`, `organizers?` | Vytvoří událost (čas se spojí s datem dne).          |
| `update_event` | jako `create_event` + `id`                                                                              | Upraví událost (nahradí položky i organizátory).     |
| `add_delay`    | `eventId`, `minutes` (1–600)                                                                            | Přidá zpoždění; posune pozdější události dne.        |

### Rekvizity (checklist)

Rekvizity u události jsou **trvalý checklist** — stav zaškrtnutí se ukládá do
databáze, přežije reload i úpravu události a zaškrtnuté položky si **drží pořadí**
(nikdy se nepřeřazují ani samy neresetují).

| Nástroj              | Vstup                                                                | Co dělá                                                               |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `check_event_item`   | `itemId`                                                             | Zaškrtne rekvizitu.                                                   |
| `uncheck_event_item` | `itemId`                                                             | Zruší zaškrtnutí rekvizity.                                           |
| `list_event_items`   | `eventId?`, `filter?` (`checked`\|`unchecked`\|`all`, výchozí `all`) | Vypíše rekvizity se stavem zaškrtnutí (volitelně jen jedné události). |

### Hráči

| Nástroj            | Vstup                                  | Co dělá                                    |
| ------------------ | -------------------------------------- | ------------------------------------------ |
| `list_players`     | –                                      | Hráči + stav + poznámky + pořadí vyřazení. |
| `create_player`    | `name`, `nickname?`                    | Vytvoří hráče.                             |
| `update_player`    | `id`, `name`, `nickname?`              | Upraví jméno/přezdívku.                    |
| `eliminate_player` | `id`, `reason` (`killed`\|`voted_out`) | Vyřadí hráče ze hry.                       |
| `revive_player`    | `id`                                   | Vrátí hráče do hry.                        |
| `add_player_note`  | `playerId`, `content`                  | Přidá poznámku.                            |

### Hlasování

| Nástroj             | Vstup                              | Co dělá                                                 |
| ------------------- | ---------------------------------- | ------------------------------------------------------- |
| `get_active_voting` | –                                  | Aktivní hlasování; kandidáti seřazení podle hlasů.      |
| `create_voting`     | –                                  | Založí hlasování (snímek hráčů ve hře).                 |
| `cast_vote`         | `candidateId`, `delta` (`1`\|`-1`) | Změní hlasy kandidáta; nikdy pod 0.                     |
| `end_voting`        | `votingId`, `eliminatePlayerId?`   | Ukončí hlasování; eliminovaný musí být kandidát ve hře. |

### Uživatelé

| Nástroj            | Vstup                                | Co dělá                                                                                             |
| ------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `create_organizer` | `email`, `password?`, `displayName?` | Vytvoří přihlašovací účet organizátora; heslo volitelné (když chybí, vygeneruje se a vrátí jednou). |
| `list_organizers`  | –                                    | Vrátí seznam účtů (id, e-mail, jméno) pro propojení organizátorů s událostmi.                       |

Nástroj vytváří **jen organizátory** (ne adminy); vrácené údaje slouží k přihlášení do webové aplikace.

### Místnosti (konkláve)

| Nástroj       | Vstup  | Co dělá                             |
| ------------- | ------ | ----------------------------------- |
| `create_room` | `name` | Vytvoří místnost (volný text).      |
| `list_rooms`  | –      | Vrátí seznam místností s jejich id. |
| `delete_room` | `id`   | Smaže místnost podle id.            |

Nástroje používají **stejná Zod schémata a invarianty** jako webové akce
(sdílené jádro v `lib/services/*` a `lib/db/*`), takže pravidla hry platí stejně
z webu i z MCP.

## Nasazení

Na Vercelu použij veřejnou URL `https://<app>/api/mcp`. Tokeny se negenerují přes
proměnnou prostředí — admin je po nasazení vytvoří na `/mcp-tokeny` (ukládá se jen
jejich hash). Žádný `MCP_TOKEN` už není potřeba.
