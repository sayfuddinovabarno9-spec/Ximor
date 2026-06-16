const PALETTE = [
  '#0d9488', // teal
  '#2563eb', // blue
  '#7c3aed', // purple
  '#db2777', // pink
  '#ea580c', // orange
  '#16a34a', // green
  '#0284c7', // sky
  '#b45309', // amber-brown
  '#9333ea', // violet
  '#be123c', // rose
  '#0369a1', // dark sky
  '#15803d', // dark green
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
