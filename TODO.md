## Parser Status (Lezer Grammar)

The army list parser (`frontend/src/utils/armyListParser/`) is functional and passes all 10 test files.

**Grammar fixes implemented:**
- CommandClause is optional (some lists have only points, no command points)
- BlankLine rule added (handles empty lines between tactical groups)
- Numeric mount types `[1]`-`[9]`, `[0]` for tercio-style lists
- Quantity multiplier `(x2)`, `(x3)` etc. after units
- Token precedences configured (Name is greedy, needs lower priority than markers)

**Current grammar tokens:**
- `Document`, `Header`, `HeaderInfoLine`, `DelineatorLine`
- `TacticalGroup`, `UnitComplex`, `Unit`, `MountedUnitLine`
- `PointsMarker` (pts/PTS/POINTS), `CommandMarker` (cmd/CMD/COMMAND)
- `TacomDesignator` (TACOM), `Multiplier` (x2, X3, etc.)
- `MountedPrefix` with `mountType` ([E], [D], [T], [1]-[9], [0])

**Test files:** 10 `.army` files in `/test/` - all passing

---

I want to restructure the UI, make it simpler I want to have everything inan ascii-art style

first, the header is beautiful, let's leave it

delineation

then an example of when is to be entered something like:
	SECURITY TASK ELEMENT JASPER-15
	EXAMPLE - 100 PTS, 2 COMMAND
	__________________________
	Task Unit 1 - Headquarters
	P1 “Parallax” - 35 pts
	- [D] Tactical Team - 15 pts
	- [E] Node Team - 0 pts (TACOM)
	- [T] Automated Sentry -15 pts
with each part of the text highlightable on mouseover, with explanations  of the different elements

then a text box, where the army's faction is entered with autocomplete

delineation

then a text box, where the army list is entered that is limited by the text width (variable to be set in dev)
according to the army's faction, autocomplete suggestions are given for entries
same with entering an - triggers an autocomplete selection of a choice between D E T for the infantry mounting modes

to the right of the entry field is an empty text display field, that is enough to show unit information of the text where the cursor currently is, maybe even an ASCII image
certain texts, like weapon or unit special rules, can the hovered over with thee mosue cursor and a tooltip explainer is displayed

and to the right of that, if in a widescreen setting, an image of the currently cursor-highlighted unit, in ascii-like art

after that a communications text field, where an email adress can be entered to keep track of the army list


future stuff:
basic user management

a booru like site where armies are automatically shared and can be looked at
potentially with small images of the units in a preview, but also in a terminal like display



another thing, I think I figured out how to present some of the army lists submitted:
a marquee of ascii boxes, going from left to right, with little art inside of the boxes, prepresenting a faction, the army
number and the name of the person who posted it and the army name.
it is supposed to be remeniscent of very early websites
please add this to @TODO.md

I think I would like to have an ascii image generator for this project
function inputs:
text_width
string of different characters to show brightness (future proof it so it can be custom or chosen from a list of characters)
color quantization number color_quant_num
image
font to be used (might need to know how tall the characters are in relation to how wide they are (is this always the same?))

how it works:
get height and width of image
if image_width mod text_width is not 0: enough (probably white) pixels to the right edge so that it is 0
fields_horizontal = image_width / text_width
find out how many fields can be put into the vertical (also add pixels to the bottom if there are not enough)
make an array to save the characters of the ascii image
iterate through every field of the image (every field is a part of image with width: fields_horizontal and fields_vertical)
get the average brightness of the pixels (or value? maybe?)
get the average hue of the pixels

then cluster all the hues and get the color_quant_num strongest clusters, replace the colors in the array with the cluster
colors

on a linear scale, assign the string of different characters to show brightness a number in the brighness spectrum
assign each field a corresponding character out of the string of diff characters to show brightness

print the array with each character colored in with is corresponding color quant

build a prototype for this in /ascii

ASCII GENERATOR DEBUGGING:
- [ ] why green is not displayed (color issue)
- [ ] look at brightness quantization

FUTURE ENHANCEMENTS:
- [ ] Stats analysis tooltips: Show comparative data like "T6/4/4 is average for a vehicle of this point budget of the federal states" based on faction statistics
- [ ] Decision needed: where should rules text files be permanently stored? Currently in public/rules for faster iteration
- [ ] Long tooltip handling: Some rules (e.g., tercio.txt) are too long for tooltips. Need links to separate rules pages
  - [ ] Create ASCII version of FM 100-4-8X page 71 image
  - [ ] Create ASCII version of FM 100-3-8X page 68 image

● Implementation complete!

  Changes made:
  - Updated AsciiArtPanel.tsx to:
    - Fetch ASCII JSON from /unit_ascii/{unit_id}_40.json when unit selected
    - Parse indexed format and render with fg/bg colors
    - Show "NO ASCII DATA" message if file not found
    - Removed old placeholder ASCII art
  - Generated 161 ASCII files at width 40 in public/unit_ascii/

  To test:
  1. Run npm run dev
  2. Go to the army editor page
  3. Type a unit name to trigger autocomplete
  4. Select a unit - VISUAL panel should show the colored ASCII art

  Remaining TODOs:
  | Task                                               | Status  |
  |----------------------------------------------------|---------|
  | Investigate autocomplete with renamed unit IDs     | Pending |
  | Responsive width + user control (+/- cycle widths) | Pending |
  | Loading animation (charset sharpening effect)      | Pending |

  Want me to test it by starting the dev server, or shall we move on to the next task?

TODO: lowercase uppercase mismatch when detecting units
TODO: black background should not be, transparency should be implemented



