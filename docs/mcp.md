# MCP server (itinerář, hráči, hlasování)

NaVlastniKuzi vystavuje svá data přes **MCP** (Model Context Protocol), takže
externí Claude (Claude Desktop nebo claude.ai custom connector) může číst a
upravovat hru — např. _„přidej snídani 8:00–9:00 do Dne 1“_.

## Endpoint

- **URL (lokálně):** `http://127.0.0.1:3000/api/mcp`
- **Transport:** Streamable HTTP, **stateless** (jeden JSON-RPC požadavek na POST).
- **Runtime:** Node.js.

## Autentizace

Každý požadavek musí nést statický bearer token z proměnné prostředí `MCP_TOKEN`:

```
Authorization: Bearer <MCP_TOKEN>
```

- Chybí/špatný token → **401**.
- `MCP_TOKEN` není nastaven → **503**.

Token nastav v `.env.local` (lokálně) nebo v prostředí nasazení (Vercel). Je to
jediná brána organizátora — stejná role jako přihlášení v webové aplikaci.

## Připojení Claude connectoru

1. Spusť appku: `npm run dev` (poslouchá na `:3000`).
2. V Claude (Desktop / claude.ai) přidej **custom connector** typu MCP s URL
   `http://127.0.0.1:3000/api/mcp` a hlavičkou `Authorization: Bearer <token>`.
3. Claude si načte seznam nástrojů (`tools/list`) a může je volat.

## Nástroje

### Itinerář

| Nástroj        | Vstup                                                                                                   | Co dělá                                              |
| -------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `list_days`    | –                                                                                                       | Dny + události se **zobrazenými (posunutými) časy**. |
| `create_day`   | `date` (YYYY-MM-DD), `label`                                                                            | Vytvoří den.                                         |
| `create_event` | `dayId`, `title`, `startTime`/`endTime` (HH:mm), `location?`, `note?`, `link?`, `items?`, `organizers?` | Vytvoří událost (čas se spojí s datem dne).          |
| `update_event` | jako `create_event` + `id`                                                                              | Upraví událost (nahradí položky i organizátory).     |
| `add_delay`    | `eventId`, `minutes` (1–600)                                                                            | Přidá zpoždění; posune pozdější události dne.        |

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

Nástroje používají **stejná Zod schémata a invarianty** jako webové akce
(sdílené jádro v `lib/services/*` a `lib/db/*`), takže pravidla hry platí stejně
z webu i z MCP.

## Nasazení

Na Vercelu nastav `MCP_TOKEN` (dlouhý náhodný řetězec) a použij veřejnou URL
`https://<app>/api/mcp`.
