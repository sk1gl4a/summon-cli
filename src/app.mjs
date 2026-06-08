import {spawnSync} from 'node:child_process';
import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';

const HIDDEN_CONFIG = {
  showHeader: false,
  title: 'CLI-Level'
};

const gray = '#6f737a';
const dimGray = '#3f4348';
const white = '#ffffff';

export const tools = [
  {
    id: 'codex',
    label: 'Codex',
    command: 'codex',
    hint: 'OpenAI',
    palette: ['#4750d8', '#6b75f2', '#9aa2ff', '#cdd2ff', '#5b63e6', '#3d44c4']
  },
  {
    id: 'claude',
    label: 'Claude',
    command: 'claude',
    hint: 'Anthropic',
    palette: ['#ca7c5e', '#e3a888', '#b5654a']
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    command: 'agy',
    hint: 'Google',
    palette: ['#2e88f5', '#3fb0a0', '#66b37f', '#f0883e', '#e15550', '#8d77c4', '#4f7ce0']
  },
  {
    id: 'cursor',
    label: 'Cursor',
    command: 'agent',
    hint: 'Anysphere',
    palette: ['#ffffff', '#111111']
  },
  {
    id: 'copilot',
    label: 'Copilot',
    command: 'copilot',
    hint: 'GitHub',
    palette: ['#c88ce0', '#89bc84', '#99dbdf']
  },
  {
    id: 'opencode',
    label: 'opencode',
    command: 'opencode',
    hint: 'SST',
    palette: ['#757676', '#ffffff']
  }
];

// Logos lifted from each tool's own splash screen (captured via pty).
// Static colours; cells carry an optional bg so half-block glyphs render two tones.
const LOGO_W = 26;
const LOGO_H = 16;

const g = (ch, fg = null, bg = null) => ({ch, fg, bg});
const solid = (str, fg) => Array.from(str).map(ch => g(ch, ch === ' ' ? null : fg, null));
const SHADE = {'█': '#dcdcdc', '▓': '#b4b4b4', '▒': '#909090', '░': '#6a6a6a'};
const shade = str => Array.from(str).map(ch => g(ch, SHADE[ch] || null));

const LOGO_DATA = {
  codex: [
    solid('█▄      ', '#7e88f5'),
    solid(' ▀█▄    ', '#7e88f5'),
    solid(' ▄█▀    ', '#7e88f5'),
    solid('█▀ ▄▄▄▄▄', '#7e88f5')
  ],
  claude: [
    solid(' ▐▛███▜▌ ', '#d77757'),
    solid('▝▜█████▛▘', '#d77757'),
    solid('  ▘▘ ▝▝  ', '#d77757')
  ],
  antigravity: [
    [g('▄', '#dbb131'), g('▀', '#f2922e', '#f6912e'), g('▀', '#f07236', '#f37337'), g('▄', '#f0583b')],
    [g('▀', '#9ec345', '#86c64e'), g('▀', '#b5b43e', '#75b45e'), g('▀', '#e2993d', '#cc954d'), g('▀', '#f67a34', '#ef7947'), g('▀', '#f86a35', '#e16652'), g('▀', '#ef5442', '#e14f59')],
    [g('▀', '#7cc251', '#80c654'), g('▀', '#71c25c', '#54b881'), g('▀', '#5ca98f', '#4097de'), g('▀', '#5c91b3'), g('▀', '#8373b0'), g('▀', '#746fc3', '#4a7ee4'), g('▀', '#995da8', '#706ece'), g('▀', '#9c5b97', '#8f64b4')],
    [g('▄', '#6dc694'), g('▀', '#61c37d', '#62bad5'), g('▀', '#43aeab', '#47a8dc'), g(' '), g(' '), g(' '), g(' '), g('▀', '#4a80ea', '#3d89fb'), g('▀', '#6c73d8', '#4a81f0'), g('▄', '#6579e1')],
    [g('▄', '#67b9f4'), g('▀', '#6bc7a3', '#64b6f6'), g('▀', '#64b6f6'), g(' '), g(' '), g(' '), g(' '), g(' '), g(' '), g('▀', '#3886fb'), g('▀', '#4881f4', '#3883f9'), g('▄', '#3d85fc')]
  ],
  cursor: [
    shade('        ▓███▓        '),
    shade('     ▒█████████▒     '),
    shade('  ░███████████████░  '),
    shade(' ███████████████████ '),
    shade('░███░             ▒█░'),
    shade('░█████▓          ░██░'),
    shade('░████████▒      ░███░'),
    shade('░█████████▓     ████░'),
    shade('░█████████▓    █████░'),
    shade('░█████████▓   ██████░'),
    shade(' █████████▓  ███████ '),
    shade('  ░███████▓ ██████░  '),
    shade('     ▒████▓▓███▒     '),
    shade('        ▓███▓        ')
  ],
  copilot: [
    solid('╭─╮╭─╮', '#99dbdf'),
    solid('╰─╯╰─╯', '#99dbdf'),
    [g('█', '#c88ce0'), g(' '), g('▘', '#89bc84'), g('▝', '#89bc84'), g(' '), g('█', '#c88ce0')],
    [g(' '), g('▔', '#c88ce0'), g('▔', '#c88ce0'), g('▔', '#c88ce0'), g('▔', '#c88ce0'), g(' ')]
  ],
  opencode: [
    [...solid('▀▀▀▀', '#808080'), g(' '), ...solid('▀▀▀▀', '#eeeeee')],
    [...solid('▀  ▀', '#808080'), g(' '), ...solid('▀   ', '#eeeeee')],
    [...solid('▀▀▀▀', '#808080'), g(' '), ...solid('▀▀▀▀', '#eeeeee')]
  ]
};

function padBox(rows) {
  const blank = n => Array.from({length: Math.max(0, n)}, () => g(' '));
  const top = Math.floor((LOGO_H - rows.length) / 2);
  const out = [];
  for (let i = 0; i < LOGO_H; i += 1) {
    const src = rows[i - top];
    if (!src) {
      out.push(blank(LOGO_W));
      continue;
    }
    const left = Math.floor((LOGO_W - src.length) / 2);
    out.push([...blank(left), ...src, ...blank(LOGO_W - left - src.length)]);
  }
  return out;
}

function LogoPanel({tool}) {
  const rows = padBox(LOGO_DATA[tool.id] || []);

  return React.createElement(Box, {flexDirection: 'column', marginLeft: 4},
    rows.map((cells, row) => (
      React.createElement(Box, {key: row, height: 1},
        cells.map((cell, col) => (
          React.createElement(Text, {
            key: col,
            bold: true,
            color: cell.fg || undefined,
            backgroundColor: cell.bg || undefined
          }, cell.ch)
        ))
      )
    ))
  );
}

export function App({items = tools, logo = false, initialId = null, onSelect, onCancel}) {
  const {exit} = useApp();
  const {stdout} = useStdout();
  const [active, setActive] = useState(() => {
    const idx = items.findIndex(tool => tool.id === initialId);
    return idx >= 0 ? idx : 0;
  });
  const [tick, setTick] = useState(0);
  const [spin, setSpin] = useState(0);
  const [flash, setFlash] = useState(0);

  const availability = useMemo(() => {
    return new Map(items.map(tool => [tool.id, commandExists(tool.command)]));
  }, [items]);

  const width = stdout?.columns || 80;

  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 110);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSpin(value => value + 1), 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setFlash(6);
    const timer = setInterval(() => {
      setFlash(value => Math.max(0, value - 1));
    }, 35);

    return () => clearInterval(timer);
  }, [active]);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      onCancel();
      return;
    }

    if (key.upArrow || input === 'k') {
      setActive(value => previousAvailable(value, availability, items));
      return;
    }

    if (key.downArrow || input === 'j') {
      setActive(value => nextAvailable(value, availability, items));
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const index = Number(input) - 1;
      if (index < items.length && availability.get(items[index].id)) {
        setActive(index);
      }
      return;
    }

    if (key.return) {
      const selected = items[active];
      if (!availability.get(selected.id)) {
        return;
      }

      exit();
      onSelect(selected);
    }
  });

  const showLogo = logo && width >= 74;

  return (
    React.createElement(Box, {flexDirection: 'column', paddingX: 2, paddingY: 1},
      HIDDEN_CONFIG.showHeader && React.createElement(Header, {title: HIDDEN_CONFIG.title, tick}),
      React.createElement(Box, {flexDirection: 'row', alignItems: 'center'},
        React.createElement(Box, {flexDirection: 'column', width: 40, gap: 1},
          items.map((tool, index) => (
            React.createElement(ToolRow, {
              key: tool.id,
              tool,
              active: index === active,
              available: availability.get(tool.id),
              tick,
              spin,
              flash
            })
          ))
        ),
        showLogo && React.createElement(LogoPanel, {tool: items[active], spin})
      ),
      React.createElement(Box, {marginTop: 1},
        React.createElement(Text, {color: dimGray}, '↑/↓ or j/k move · enter open · esc quit')
      )
    )
  );
}

export function ReorderApp({onDone, onCancel}) {
  const {exit} = useApp();
  const [order, setOrder] = useState([]);
  const [active, setActive] = useState(0);

  const seekUnpicked = (from, dir, taken) => {
    for (let step = 0; step <= tools.length; step += 1) {
      const index = (from + dir * step + tools.length * (step + 1)) % tools.length;
      if (!taken.has(tools[index].id)) {
        return index;
      }
    }
    return from;
  };

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit();
      onCancel();
      return;
    }

    if (input === 'r') {
      setOrder([]);
      setActive(0);
      return;
    }

    const taken = new Set(order);

    if (key.upArrow || input === 'k') {
      setActive(value => seekUnpicked(value - 1, -1, taken));
      return;
    }

    if (key.downArrow || input === 'j') {
      setActive(value => seekUnpicked(value + 1, 1, taken));
      return;
    }

    if (key.return) {
      const id = tools[active].id;
      if (taken.has(id)) {
        return;
      }

      const next = [...order, id];
      if (next.length === tools.length) {
        exit();
        onDone(next);
        return;
      }

      setOrder(next);
      setActive(seekUnpicked(active + 1, 1, new Set(next)));
    }
  });

  return (
    React.createElement(Box, {flexDirection: 'column', paddingX: 2, paddingY: 1},
      React.createElement(Box, {marginBottom: 1},
        React.createElement(Text, {bold: true, color: white}, 'Order'),
        React.createElement(Text, {color: dimGray}, '  pick first to last')
      ),
      React.createElement(Box, {flexDirection: 'column', gap: 0},
        tools.map((tool, index) => {
          const pos = order.indexOf(tool.id);
          const picked = pos >= 0;
          const isActive = index === active && !picked;
          const brand = tool.palette[0] || white;
          return (
            React.createElement(Box, {key: tool.id, height: 1},
              React.createElement(Box, {width: 2},
                React.createElement(Text, {bold: true, color: isActive ? brand : dimGray}, isActive ? '›' : ' ')
              ),
              React.createElement(Box, {width: 3},
                React.createElement(Text, {bold: picked, color: picked ? brand : dimGray}, picked ? String(pos + 1) : '·')
              ),
              React.createElement(Text, {bold: picked || isActive, color: picked ? white : isActive ? white : gray}, tool.label)
            )
          );
        })
      ),
      React.createElement(Box, {marginTop: 1},
        React.createElement(Text, {color: dimGray}, 'enter set · ↑/↓ move · r reset · esc cancel')
      )
    )
  );
}

function Header({title, tick}) {
  return (
    React.createElement(Box, {marginBottom: 1},
      React.createElement(GradientText, {
        text: title,
        palette: tools[tick % tools.length].palette,
        offset: tick
      })
    )
  );
}

function ToolRow({tool, active, available, tick, spin, flash}) {
  const arrow = active ? '›' : ' ';
  const markerColor = active ? (tool.palette[0] || white) : dimGray;
  const rowTone = available ? gray : dimGray;

  return (
    React.createElement(Box, {height: 1},
      React.createElement(Box, {width: 2},
        React.createElement(Text, {bold: active, color: markerColor}, arrow)
      ),
      React.createElement(Box, {width: 18},
        active && available
          ? React.createElement(ActiveLabel, {tool, tick, spin, flash})
          : React.createElement(Text, {color: rowTone}, tool.label)
      ),
      React.createElement(Box, {width: 2},
        active && available ? React.createElement(ActiveGlyph, {tool, tick, spin}) : React.createElement(Text, {color: dimGray}, ' ')
      ),
      React.createElement(Text, {color: active && available ? subtle(tool, tick) : dimGray},
        available ? tool.hint : `${tool.command} not found`
      )
    )
  );
}

function ActiveLabel({tool, tick, spin, flash}) {
  if (tool.id === 'codex') {
    return React.createElement(GradientText, {
      text: tool.label,
      palette: tool.palette,
      offset: tick,
      bold: true
    });
  }

  if (tool.id === 'claude') {
    return React.createElement(ShimmerText, {text: tool.label, spin});
  }

  if (tool.id === 'antigravity') {
    return React.createElement(RunningLight, {text: tool.label, palette: tool.palette, spin});
  }

  if (tool.id === 'cursor') {
    const color = mix('#000000', '#ffffff', pulse(spin, 32));
    return React.createElement(Text, {bold: true, color}, 'Cursor');
  }

  if (tool.id === 'copilot') {
    return React.createElement(CopilotText, {tick});
  }

  if (tool.id === 'opencode') {
    return React.createElement(Box,
      null,
      React.createElement(Text, {bold: true, color: '#808080'}, 'open'),
      React.createElement(Text, {bold: true, color: '#eeeeee'}, 'code')
    );
  }

  return React.createElement(Text, {bold: true, color: flash > 0 ? white : gray}, tool.label);
}

function ActiveGlyph({tool, tick, spin}) {
  if (tool.id === 'claude') {
    const frame = ['·', '✻', '✽', '✶', '✳', '✢'][Math.floor(spin / 3) % 6];
    return React.createElement(Text, {bold: true, color: mix('#b5654a', '#e8b79c', pulse(spin, 24))}, frame);
  }

  if (tool.id === 'antigravity') {
    const stars = ['·', '✧', '✦', '✷', '✹', '✷', '✦', '✧'];
    const frame = stars[Math.floor(spin / 3) % stars.length];
    const color = cycleColor(['#4285f4', '#9b72cb', '#d96570'], spin * 0.03);
    return React.createElement(Text, {bold: true, color}, frame);
  }

  if (tool.id === 'cursor') {
    return React.createElement(Text, {inverse: tick % 8 < 4}, ' ');
  }

  if (tool.id === 'copilot') {
    return React.createElement(Text, {color: ['#c88ce0', '#89bc84', '#99dbdf', '#89bc84'][tick % 4]}, '◌');
  }

  if (tool.id === 'opencode') {
    return React.createElement(Text, {color: white}, tick % 8 < 4 ? '▌' : ' ');
  }

  return React.createElement(Text, {color: activeArrowColor(tool, tick)}, '✦');
}

function GradientText({text, palette, offset = 0, bold = false}) {
  const chars = Array.from(text);
  return React.createElement(Box,
    null,
    chars.map((char, index) => {
      const color = gradientAt(palette, chars.length <= 1 ? 0 : index / (chars.length - 1), offset);
      return React.createElement(Text, {key: `${char}-${index}`, bold, color}, char);
    })
  );
}

function RunningLight({text, palette, spin, span = 1.4}) {
  const chars = Array.from(text);
  const period = chars.length + span * 3;
  const center = (spin * 0.6) % period - span;

  return React.createElement(Box,
    null,
    chars.map((char, index) => {
      const base = gradientAt(palette, chars.length <= 1 ? 0 : index / (chars.length - 1), 0);
      const light = Math.max(0, 1 - Math.abs(index - center) / span);
      const color = mix(base, '#ffffff', light);
      return React.createElement(Text, {key: `${char}-${index}`, bold: true, color}, char);
    })
  );
}

function ShimmerText({text, spin, base = '#d97757', shimmer = '#ffffff', span = 2}) {
  const chars = Array.from(text);
  const period = chars.length + span * 2;
  const center = (spin * 0.5) % period - span;

  return React.createElement(Box,
    null,
    chars.map((char, index) => {
      const weight = Math.max(0, 1 - Math.abs(index - center) / span);
      const color = mix(base, shimmer, weight);
      return React.createElement(Text, {key: `${char}-${index}`, bold: true, color}, char);
    })
  );
}

function CopilotText({tick}) {
  const chars = Array.from('Copilot');
  const orbit = [1, 3, 5, 3][tick % 4];

  return React.createElement(Box,
    null,
    chars.map((char, index) => {
      const isO = char.toLowerCase() === 'o';
      const edge = index === 0 || index === chars.length - 1;
      const orbiting = Math.abs(index - orbit) <= 1;
      const color = isO ? '#89bc84' : edge ? '#c88ce0' : '#99dbdf';
      const backgroundColor = orbiting && !isO && tick % 8 < 4 ? '#143236' : undefined;

      return React.createElement(Text, {key: `${char}-${index}`, bold: true, color, backgroundColor}, char);
    })
  );
}

function renderPlainLine(tool, index, activeIndex) {
  const selected = index === activeIndex;
  const arrow = selected ? '›' : ' ';
  const label = selected ? tool.label : tool.label;
  return `${arrow} ${label.padEnd(16)} ${tool.hint}`;
}

export function renderSnapshot(activeIndex = 0) {
  const bounded = Math.max(0, Math.min(tools.length - 1, activeIndex));
  return `${tools.map((tool, index) => renderPlainLine(tool, index, bounded)).join('\n')}\n`;
}

function commandExists(command) {
  const result = spawnSync('sh', ['-lc', `command -v ${shellQuote(command)} >/dev/null 2>&1`], {
    stdio: 'ignore'
  });

  return result.status === 0;
}

function previousAvailable(current, availability, items) {
  for (let step = 1; step <= items.length; step += 1) {
    const index = (current - step + items.length) % items.length;
    if (availability.get(items[index].id)) {
      return index;
    }
  }

  return current;
}

function nextAvailable(current, availability, items) {
  for (let step = 1; step <= items.length; step += 1) {
    const index = (current + step) % items.length;
    if (availability.get(items[index].id)) {
      return index;
    }
  }

  return current;
}

// Reorder canonical tools by an array of ids; unknown ids ignored, missing appended.
export function orderTools(order = []) {
  const byId = new Map(tools.map(tool => [tool.id, tool]));
  const result = [];
  for (const id of order) {
    if (byId.has(id)) {
      result.push(byId.get(id));
      byId.delete(id);
    }
  }
  for (const tool of tools) {
    if (byId.has(tool.id)) {
      result.push(tool);
    }
  }
  return result;
}

function activeArrowColor(tool, tick) {
  return tool.palette[tick % tool.palette.length] || white;
}

function subtle(tool, tick) {
  if (tool.id === 'cursor') {
    return tick % 8 < 4 ? '#d7d7d7' : '#8b8b8b';
  }

  return mix(tool.palette[0] || gray, gray, 0.55);
}

function cycleColor(stops, phase) {
  const scaled = (((phase % 1) + 1) % 1) * stops.length;
  const left = Math.floor(scaled);
  return mix(stops[left % stops.length], stops[(left + 1) % stops.length], scaled - left);
}

function gradientAt(palette, position, offset) {
  if (palette.length === 1) {
    return palette[0];
  }

  const animated = (position + (offset % 20) / 20) % 1;
  const scaled = animated * (palette.length - 1);
  const left = Math.floor(scaled);
  const right = Math.min(palette.length - 1, left + 1);
  return mix(palette[left], palette[right], scaled - left);
}

function pulse(tick, period) {
  return (Math.sin((tick / period) * Math.PI * 2) + 1) / 2;
}

function mix(left, right, amount) {
  const a = parseHex(left);
  const b = parseHex(right);
  const blend = channel => Math.round(a[channel] + (b[channel] - a[channel]) * amount);
  return toHex(blend('r'), blend('g'), blend('b'));
}

function parseHex(value) {
  const clean = value.replace('#', '');
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function toHex(r, g, b) {
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hex(value) {
  return value.toString(16).padStart(2, '0');
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
