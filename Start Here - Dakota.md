# Hey Dakota — read this first

Welcome to the project! This is your one-page guide. You don't need to know any code to follow it.

## The big idea (read this once, then forget it)

Think of the project like a Google Doc with three saved copies:

- **main** — the "real" version of the game that we both share.
- **dakota** — your personal copy. This is where you work.
- **brysen** — Brysen's personal copy.

You only ever touch **your** copy. When your stuff is good and ready, we move it over to **main** so it joins the real game. Brysen handles that part — you don't have to.

**Rule #1:** You work on `dakota`, never on `main`.

## Starting the game

In the main `Frieren` folder, double-click:

```
Launch - Dakota.bat
```

That launcher is set up just for you. It:

1. Opens **your** folder (`Frieren-Dakota`), not Brysen's.
2. Runs **your** version of the game on its own port.
3. Pops the game open in your browser.

Brysen's launcher (`Launch - Brysen.bat`) runs his version at the same time, on a different port. That means you can have both windows open side by side and **see the difference** between what each of you is building. Super useful for showing each other stuff.

Keep the black launcher window open while you play. Close it when you're done.

## Where your work lives

Your stuff lives in this folder:

```
F:\Documents\Frieren-Dakota
```

That's your sandbox. Anything you change in there only affects your copy until we decide to share it.

## What you're working on

We split the game so we don't step on each other:

- **You: Overworld stuff** — the top-down maps, towns, NPCs, travel, world events.
- **Brysen: Dungeons** — the side-view platforming sections, dungeon bosses, etc.

If you want to change something that isn't clearly overworld or dungeon (the menu, the controls, the save system, etc.), just ping Brysen first so you don't both edit the same thing at the same time.

The folders to know:

- `src/overworld/` — your main playground.
- `src/story/` — characters and dialogue. Fair game for you.
- `assets/images/backgrounds/overworld/` — overworld art.
- `assets/audio/` — music and sounds.

Don't worry about the other folders.

## Saving your work and sharing it

When you've got changes you like:

1. Tell Brysen what you did.
2. He'll help you **commit** (save a checkpoint) and **push** (upload it to GitHub) until you're comfortable doing it yourself.
3. Once your stuff is up on GitHub on the `dakota` branch, Brysen will merge it into `main` when it's ready — that's the moment it becomes part of the "real" game.

The GitHub page is here: <https://github.com/Brysen223/Frierentr>

## If something goes weird

- **Game won't load?** Close the launcher window and double-click `Launch - Dakota.bat` again.
- **You see a yellow "uncommitted work" warning?** That's fine — it just means you have unsaved changes. The launcher won't touch them.
- **Anything else?** Text Brysen. Don't try to "fix" git stuff yourself yet — it's easy to lose work if you guess.

That's it. Have fun, break stuff, ask questions.
