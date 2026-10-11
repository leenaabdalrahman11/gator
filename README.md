# Gator

Gator is a command-line RSS feed aggregator built with TypeScript, Node.js, PostgreSQL, and Drizzle ORM. It lets users register, add RSS feeds, follow feeds, collect posts, and browse recent articles from the feeds they follow.

## Requirements

- Node.js (use the version in `.nvmrc`, currently 22.15.0) and npm
- PostgreSQL 16 or newer
- A terminal (on Windows, WSL 2 / Ubuntu is recommended)
- Git (if you want to clone the repository)

## Installation

1. Clone this repository and enter the project directory:

   ```bash
   git clone https://github.com/leenaabdalrahman11/gator.git
   cd gator
   ```

2. Install the project's dependencies:

   ```bash
   nvm use           # if using NVM; run `nvm install` first if needed
   npm install
   ```

3. Start PostgreSQL and create the `gator` database if it does not already exist. For example, on Ubuntu / WSL:

   ```bash
   sudo service postgresql start
   sudo -u postgres psql
   ```

   In the PostgreSQL shell:

   ```sql
   CREATE DATABASE gator;
   ```

   Exit with `\q`. If you need to set a password for your PostgreSQL role, use `ALTER USER postgres WITH PASSWORD 'YOUR_PASSWORD';` inside the PostgreSQL shell.

4. Create a configuration file at `~/.gatorconfig.json` (your home directory, not inside this repository):

   ```json
   {
     "db_url": "postgres://postgres:YOUR_PASSWORD@localhost:5432/gator?sslmode=disable"
   }
   ```

   Replace `YOUR_PASSWORD` with the PostgreSQL database user's actual password. This example disables SSL for a local database; use an appropriate secure configuration for other environments. Gator will set `current_user_name` automatically when you register or log in.

5. Apply the database migrations:

   ```bash
   npx drizzle-kit migrate
   ```

## Usage

Run commands from the project root with `npm run start -- <command> [arguments]` (using `npm run start <command>` also works).

| Command | Description |
| --- | --- |
| `register <username>` | Create a user and set them as the current user. |
| `login <username>` | Log in as an existing user. |
| `users` | List users, marking the current user. |
| `addfeed <name> <url>` | Add a feed and automatically follow it. |
| `feeds` | List all feeds and their creators. |
| `follow <url>` | Follow an existing feed. |
| `following` | List the feeds you follow. |
| `unfollow <url>` | Stop following a feed. |
| `agg <duration>` | Continuously fetch feeds, store new posts, and repeat at the requested interval. |
| `browse [limit]` | Display recent posts from followed feeds (default: 2). |
| `reset` | Delete all users and their associated data. For development only. |

### Example workflow

Register a user and add a feed:

```bash
npm run start register alice
npm run start addfeed "Wagslane" "https://www.wagslane.dev/index.xml"
npm run start following
```

Start aggregating posts every minute:

```bash
npm run start agg 1m
```

Leave the aggregator running and, in another terminal, browse posts:

```bash
npm run start browse 5
```

Press Ctrl+C to stop the aggregator. Valid duration units include `ms`, `s`, `m`, and `h` (for example `500ms`, `30s`, `1m`, `1h`). Choose a reasonable interval to avoid overwhelming third-party websites.

## Notes

- Post URLs are unique, so the same article will not be inserted twice.
- The `reset` command permanently clears application data in the connected database. Use it only with a development database.
- Keep your local configuration and database credentials private; do not commit passwords or secrets to Git.
