# The Zmanim Flyer Maker — How To Use It

This is for making the shul's weekly Zmanim flyer. You don't need to install
anything and you don't need to know anything about computers. If you can use
email, you can use this.

Read the **Before you print** section near the end. It is the one part that
really matters.

---

## 1. Opening it

**Go to this address:**

```
https://oly-zmanim.oly-flyer-app.workers.dev
```

That's it. It opens like any website — nothing to download, nothing to install,
and nothing to leave running.

**Do these two things the first time:**

1. **Use Google Chrome or Microsoft Edge.** If it opens in something else, copy
   the address and paste it into Chrome or Edge instead. A couple of features
   don't work in other browsers.
2. **Bookmark it** so you don't have to hunt for it every week. Click the ☆ star
   at the right-hand end of the address bar, then click **Done**.

**One important warning:** don't use a "private" or "incognito" window. Those
throw everything away when you close them, and you would lose your flyers.

---

<details>
<summary>Running it from a copy on your own computer instead (only if you were
given the files rather than the address)</summary>

### If it's on your own computer

Find the folder called **oly-flyer-app** and double-click:

- **Windows** — `Start Flyer Maker.bat`
- **Mac** — `Start Flyer Maker.command`

A black (or white) window opens with text scrolling in it. **The very first time
it will take several minutes** — it's getting itself ready. Every time after
that it's quick.

Then your web browser opens by itself and the flyer maker appears. If it doesn't
open on its own, open Chrome and type this into the address bar:

```
localhost:3000
```

**Two things to remember:**

- **Leave that black window open the whole time you're working.** It's what keeps
  the flyer maker running. Closing it turns the flyer maker off.
- When you've finished for the week, close the black window to shut it down.

If double-clicking gives you an error about **Node.js** not being installed,
install it from <https://nodejs.org> — click the big green **LTS** button, accept
all the defaults, then double-click the start file again.

</details>

---

## 2. What you're looking at

When it opens you'll see the flyer itself in the middle of the screen. That is
your actual flyer — what you see is what prints.

Along the **top right** there are three buttons:

| Button | What it does |
| --- | --- |
| **Print / PDF** | Prints the flyer, or saves it as a PDF |
| **Save version** | Keeps a permanent copy of this week (see section 8) |
| **Export PNG** | Saves the flyer as a picture, for WhatsApp or email |

Just **below** those, on the right, are three more:

| Button | What it does |
| --- | --- |
| **Zmanim** | Fills in all the times automatically — the big one |
| **More settings** | Sponsors, Mazal Tovs, text size, dates |
| **Flyers** (far left) | Your list of saved flyers, and starting a new one |

In the middle of that row you'll see **1:1**, **3:4**, and **8.5 × 11**. Those
change the shape of the flyer. **8.5 × 11** is normal paper — leave it there for
printing. The other two are squarer shapes, useful for WhatsApp or Instagram.

---

## 3. Making this week's flyer — the short version

Every week, this is the whole routine:

1. Click **Flyers** (top left) → **New weekly flyer**.
2. Click **Zmanim** (top right) → **Refresh for this week**.
3. Click the **Auto-fill** button that appears.
4. Fix anything that needs fixing by clicking on it and typing.
5. Add the Kiddush sponsors and any Mazal Tovs (section 6).
6. **Check the times** (section 9).
7. Print it, or send it out (section 7).

The rest of this guide explains each of those in more detail.

---

## 4. Getting the times filled in automatically

This is the part that saves you the most work.

1. Click **Zmanim** at the top right. A panel opens on the right side.
2. Check the **Friday date** at the top of that panel is the Friday you want. If
   not, click it and pick the right date.
3. Click **Refresh for this week**. Wait a moment — it's fetching the real times
   from Chabad.org.
4. A list of times appears. Click the orange **Auto-fill** button.

It will fill in candle lighting, all the Minchas and Maarivs, Seder Niggunim, the
Halacha shiur, and the Monday night Chassidus shiur — all at once. It also fills
in the Parsha name at the top.

**It deliberately leaves some things alone.** Anything unusual — a fast day, a
shiur that happens "between Mincha & Maariv", the Shabbos morning shiurim — is
left exactly as it was, because the computer can't safely guess those. Type those
in yourself.

**This needs internet.** If it says it can't load the times, check your internet
first. If your internet is fine and it still fails, tell Yaakov — it means the
Chabad.org website changed something.

---

## 5. Changing the words on the flyer

**Click directly on any text on the flyer and type.** That's all there is to it.
Click a time, click a name, click a heading — it all works the same way.

- Press **Enter** when you're done, or just click somewhere else.
- Press **Esc** to undo what you just typed in that spot.

**To move a row up or down:** hover your mouse over the row. A small handle
(**⋮⋮**) appears on the left. Hold your mouse button down on it and drag the row
where you want it.

**To add a row:** hover over a row and click the **＋** that appears.

**To delete a row or change its little icon:** hover over the row and click the
**•••** button that appears at its right.

---

## 6. Kiddush sponsors, Mazal Tovs, and text size

Click **More settings** (top right) and scroll down that panel.

**Kiddush sponsors** — click **＋ Add** once for each sponsor. Each one gets its
own line on the flyer. If there are no sponsors at all, the flyer shows your
"unsponsored notice" instead (for example "Farbrengen in Shul after Musaf"), and
the Kiddush box stretches across the full width.

**Mazal Tov entries** — same thing: **＋ Add** for each one. If there are none,
the Mazal Tov box disappears completely and the Kiddush takes the whole width.
That's on purpose, not a bug.

**If the text looks too big or too small**, there are sliders:

- **Whole-flyer text size** — everything at once.
- **Date line text size** — just the two date lines under the banner.
- **Banner text size** — just the orange **PARSHAS …** bar. Use this when a long
  Parsha name doesn't fit.

**For a Yom Tov:** in **More settings**, clear out the **Banner prefix** box (the
word "PARSHAS"), then type the Yom Tov into the **Parsha / occasion** box. The
banner will then just say e.g. **SUKKOS** instead of "PARSHAS SUKKOS".

---

## 7. Printing it and sending it out

**To print, or to make a PDF:** click **Print / PDF**. Your normal print window
opens. To get a PDF instead of paper, change the printer to **"Save as PDF"** in
that window.

**To send it on WhatsApp or email:** click **Export PNG**. That saves the flyer as
a picture, in your Downloads folder. Attach that picture like you would attach a
photo.

---

## 8. Keeping your flyers — read this bit

**Your flyers are saved automatically, but only on this computer, in this browser.**

It says "Autosaved" at the top of the screen — that's real, you don't have to save
anything manually. Your flyers will still be there next week when you come back.

But please understand the limits, because this catches people out:

- If you use a **different computer**, your flyers are **not** there.
- If you use a **different browser** on the same computer, they are **not** there.
- If somebody **clears the browsing history/data**, they are **gone**.
- Yaakov **cannot** see your flyers or get them back for you. They're only on your
  machine.

**So if a flyer matters, keep a real copy.** Two ways:

1. **Easiest:** click **Export PNG** (or save a PDF) and keep that file somewhere
   sensible. Do this for every week you print.
2. **Better, if you want history:** click **Save version**. The first time, it
   asks you to pick a folder. **Pick a folder inside Dropbox, OneDrive, or Google
   Drive** if you have one — then your flyers get backed up automatically and
   you can get them on another computer. After that, one click saves that week.

   This only works in Chrome or Edge. If **Save version** doesn't do anything,
   that's why — use **Export PNG** instead.

---

## 9. Before you print — please check the times

**The times are filled in by a computer. Check them before you print.**

The times come from Chabad.org for **Baltimore, ZIP 21215**, and the shul's own
rules are applied on top of that. It is usually right. But it is a machine, and
the flyer goes up in shul with your name on it.

Give it ten seconds:

- Does **Candle Lighting** match what you'd expect for this week?
- Do the Mincha and Maariv times look normal — not wildly off from last week?
- Did anything unusual this week (a fast, a Yom Tov, a special event) get missed?
  The auto-fill leaves those alone on purpose.
- Is the **Parsha** at the top correct?

If something looks wrong, click on it and type the right time.

---

## 10. If something goes wrong

**Nothing loads / the page is blank.** If you're running it on your own computer,
check the black window is still open — if you closed it, double-click
**Start Flyer Maker** again. Otherwise check your internet, then close the tab and
open your bookmark again.

**The page says it can't connect.** The black window has been closed or was never
opened. Double-click **Start Flyer Maker** and wait for the browser to open.

**The times won't load.** Check your internet. If that's fine, tell Yaakov.

**I made a mess of the flyer.** Click **Flyers** (top left) and start a
**New weekly flyer**. The old one is still in the list — you haven't lost it.

**My flyers all disappeared.** Almost always one of: a different computer, a
different browser, or the browsing data was cleared. Check section 8. This is why
exporting a copy each week is worth the two seconds.

**"Save version" does nothing.** You're probably not in Chrome or Edge. Use
**Export PNG** instead.

**Something's just broken.** Tell Yaakov, and say what you clicked right before it
happened — that's the most useful thing you can tell him.

---

## 11. The short version

Stick this on a sticky note:

1. Open your bookmark (in Chrome or Edge).
2. **Flyers → New weekly flyer**
3. **Zmanim → Refresh for this week → Auto-fill**
4. Fix anything unusual by clicking on it and typing.
5. Add sponsors and Mazal Tovs in **More settings**.
6. **Check the times.**
7. **Print / PDF** to print · **Export PNG** to send.
