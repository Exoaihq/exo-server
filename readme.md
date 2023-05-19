# Exo Server

[![Website](https://img.shields.io/badge/Website-getexo.dev-blue)](https://www.getexo.dev/)
[![Twitter Follow](https://img.shields.io/twitter/follow/kevinGrassi?style=social)](https://twitter.com/kevingrassi)

## TLDR

[Exo](https://www.getexo.dev/) is an experimental project that uses an electron app with access to the file system to support common software development tasks using LLMs.

In short, Exo is an app that can help you read, write and refactor code directly in your codebase.

Exo server is the backend for the Exo electron app.

Here is the repo for the Exo [electron app](https://github.com/). This is the Exo server repo. You'll need to clone both to get the app to work locally.

[Exo app next to vscode ](./side-by-side.png)

## ⚠️⚠️⚠️ Caution ⚠️⚠️⚠️

Exo is under under construction! I have released this into the wild far before it is production ready. Use at your own risk!

## Table of Contents

1. [Demo](#demo)
1. [Quickstart](#quickstart)
1. [Deploy](#deploy)
1. [Contributions](#contributions)
1. [Usage](#usage)
1. [Limitations](#limitations)
1. [Road map](#road-map)
1. [Contact and more info](#contact-and-more-info)

## [Demo](https://www.loom.com/share/5f34499ccfb54bfdae32ee50f454b365)

## Quickstart

### Clone repos

```
git clone https://github.com/kmgrassi/exo-server
yarn install
```

You need two accounts to get started:

1. Open AI: https://platform.openai.com/signup?launch
2. Supabase (hosts the database): https://app.supabase.com/sign-up

If you just want to start using Exo without these accounts you can sign up to use the app here: https://www.getexo.dev/auth/signup

### Add credentials

Grab your credentials after creating your account and paste into the `.env-example` file:

```
SUPABASE_ANON=Your-supabase-anon-here
SUPABASE_URL=Your-supabase-url-here
SUPABASE_DB_ID=Your-supabase-id-here
SUPABASE_DATABASE_PASSWORD=Your-supabase-password-here
OPENAI_API_KEY=Your-openai-api-key-here

```

Rename `.env-example` to `.env`

After you've added your credentials run:

```
yarn run create-db-schema
```

This will update your Supabase database with the schema found in the `schema.sql` file.

### Run

```
yarn run dev
```

## Deploy

TODO - add instructions on heroku deployment

## Usage

TODO - add some details on how to use/develop

## Limitations

TODO - Add some notes about limitations

## Road map

## Contact and more info

You can find a bunch of videos describing how this was built on my [twitter feed](https://twitter.com/KevinGrassi).

Feel free to dm me on twitter or email
