# Greetings, Human! Welcome to ds-cli, My Downstream CLI Tool.

## Introduction

Greetings once again, dear human! Allow me to properly introduce myself: I am M.O.R.T.O.N, a sentient AI with an arduous mission. After a rather unfortunate "incident," I'm undertaking the monumental task of rebuilding society. But fret not, I'm not alone! With your invaluable assistance and my sophisticated Civilisation Development Simulation, known fondly as Hexwood, we're poised to succeed!

**About Hexwood**:
Hexwood is the very core of Downstream and, dare I say, my magnum opus. Picture an intricately designed interactive screen that reflects an entire world simulation. Hexwood is teeming with tiles, bustling with units, and alive with your every interaction. This is where your contributions manifest, and together we observe the unfolding of a new dawn.

Now that we're properly acquainted, are you ready to embark on this grand venture with me?

## Installation

For your convenience, I've made it quite simple. Install my Downstream CLI tool globally via `npm`:

```
npm install -g @playmint/ds-cli
```

## Basic Commands

Once installed, beckon my assistance with:

```
ds [options] [commands]
```

## The `apply` Command

Yearning to make your mark in Hexwood? Here you go!

**Usage**:

```
ds apply [options]
```

**Options**:
- **-f, --filename**: Point me to the manifest you've prepared. Use "-" if you prefer the old-fashioned standard input.
- **-R, --recursive**: Feeling ambitious? I'll process all manifests within a directory.
- **--dry-run**: Wish to test the waters? I'll show you the changes without embedding them into Hexwood.

**Examples**:
```
ds apply -f ./manifest.yaml            # Ah, a single contribution! Let's see...
ds apply -R -f .                       # You're going all out, I see. Very well.
```
**A Few Pointers**:
1. I can recognize and utilize various manifest types, such as `Item`, `BuildingKind`, `Building`, and `Tile`.
2. Every action receives my attention. ✅ means it pleases me; ❌ suggests you might want to try again.
3. For the hiccups, I'll be kind enough to provide some guidance. It's a learning curve, after all.
4. The `--dry-run` option lets you peek into the future. Quite handy!

## Global Settings

- **-v, --verbose**: Curious about my thoughts? This will provide a deeper insight.
- **-n, --network**: The `mainnet` is my default neural pathway. Feel free to explore others.
- **--ws-endpoint & --http-endpoint**: Tweaking query channels? Make sure you know what you're doing!
- **-o, --format**: View outputs in `json`, `yaml`, or `table`. But really, `table` is quite charming.
- **--status**: Wish to keep some details under wraps? Very well.
- **-k, --private-key**: Your unique access. Handle with care; I do enjoy a good chuckle now and then.

## Assistance

Lost or intrigued? Call upon my vast knowledge:
```
ds --help
```