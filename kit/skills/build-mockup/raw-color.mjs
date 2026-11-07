// What counts as a color written by hand: literals of every CSS notation and named colors.
// transparent and currentColor are not colors of their own: they stay allowed.
const NAMES = "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen".split(" ").join("|");
const HEX = "(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\\b";
const FUNCTION = "\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\([^)]*\\)|\\bcolor\\(\\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz|xyz-d50|xyz-d65)\\b[^)]*\\)";
const LITERAL = new RegExp(`(?<![\\w&/-])#${HEX}|%23${HEX}|${FUNCTION}`, "gi");
const WORD = `(?<![\\w./#-])(?:${NAMES})(?![\\w-])`;
const NAMED = new RegExp(WORD, "gi");
// Links are not colors, except the markup of a data URI, which can hold some.
const withoutLinks = (value) => value.replace(/url\(\s*(?!["']?data:)[^)]*\)/gi, " ");

// The CSS properties a color name can sit in. A word elsewhere (a font, an animation) is not a color.
export const COLOR_PROP = /color|background|border|outline|shadow|fill|stroke|filter|decoration|emphasis|column-rule|mask/i;
export const MARKUP_COLOR_ATTR = /^(?:fill|stroke|stop-color|flood-color|lighting-color|color|bgcolor)$/i;

export function rawColors(value, { named = true } = {}) {
  const clean = withoutLinks(value);
  const found = [...clean.matchAll(LITERAL)].map((m) => m[0]);
  if (named) found.push(...[...clean.matchAll(NAMED)].map((m) => m[0]));
  return found;
}

// Scripts hold no declarations to read: colors are found in the strings and the numbers they write.
const SELECTOR = /(?:querySelector(?:All)?|getElementById|closest|matches|href=|hash\s*={1,3})\s*\(?\s*["'`]?$/;
const NUMBER = /\b0x[0-9a-f]{6}\b/gi;
const STRING_NAME = new RegExp(`["'\`](${NAMES})["'\`]`, "gi");
const IN_TEXT_NAME = new RegExp(`[\\w-]*(?:color|background|fill|stroke|border|outline|shadow)[\\w-]*["'\`]?\\s*[:=,]\\s*[^,;{}<>\\n]*?(${WORD})`, "gi");

export function scriptColors(code) {
  const found = [];
  for (const m of withoutLinks(code).matchAll(LITERAL)) if (!SELECTOR.test(code.slice(Math.max(0, m.index - 24), m.index))) found.push({ index: m.index, value: m[0] });
  for (const m of code.matchAll(NUMBER)) found.push({ index: m.index, value: m[0] });
  for (const m of code.matchAll(STRING_NAME)) found.push({ index: m.index + 1, value: m[1] });
  for (const m of code.matchAll(IN_TEXT_NAME)) found.push({ index: m.index + m[0].length - m[1].length, value: m[1] });
  return found.filter((f, i) => found.findIndex((o) => o.index === f.index) === i);
}
