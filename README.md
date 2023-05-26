
# Backend test

A brief description of how to build and start
## Prerequirements

Required MongoDB database

Database link setup in `DB_URI` column in ` .env` file.
You can find example in `.env.example` file

## Installation

Install all dependencies with npm

```bash
  npm install
```
    
## Start 

At first build
```bash
  npm run build
```


start app
```bash
  npm run app
```

start sync
```bash
  npm run sync
```

start sync --full-reindex
```bash
  npm run sync -- --full-reindex
```

## Start with installed  `ts-node`

start app
```bash
  npm run app:dev
```

start sync
```bash
  npm run sync:dev
```

start sync --full-reindex
```bash
  npm run sync:dev -- --full-reindex
```