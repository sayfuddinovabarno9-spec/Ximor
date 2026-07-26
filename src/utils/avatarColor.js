const PALETTE = [
  '#36584d',
  '#4d5b55',
  '#5c625f',
  '#59616d',
  '#6c6258',
  '#7b6847',
  '#4f5d4f',
  '#565a62',
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export function avatarBg(initials) {
  return PALETTE[hash(initials) % PALETTE.length];
}
