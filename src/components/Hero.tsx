// Пиксельный Марио — рисуем по карте, чтобы был узнаваемым (кепка, усы,
// синий комбинезон, бегущие ноги). Без внешнего арта.
const COLORS: Record<string, string> = {
  R: "#e52521", // красный (кепка, рубашка)
  S: "#ffb27a", // кожа
  H: "#7a3b10", // волосы/усы/бакенбарды
  B: "#2a3fd0", // синий комбинезон
  Y: "#f7c331", // пуговица
  K: "#000000", // глаз
  W: "#5a3410", // ботинки
};

// 13 столбцов × 16 строк.
const MAP = [
  "   RRRRR     ",
  "  RRRRRRRRR  ",
  "  HHHSSSSSS  ",
  " HSHSSSKSSS  ",
  " HSHHSSKSSSS ",
  " HHSSSSSSSS  ",
  "  SHHHHHSS   ",
  "  RRRRRRRR   ",
  " SRRRRBRRRRS ",
  " SRRRBBBRRRS ",
  "  RRBBYBBRR  ",
  "  BBBBBBBB   ",
  "  BBB BBB    ",
  " BBB   BBB   ",
  " WWW   BBB   ",
  " WWWW WWWW   ",
];

export function Hero() {
  const rects: React.ReactNode[] = [];
  MAP.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== " " && COLORS[ch]) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLORS[ch]} />);
      }
    }
  });
  return (
    <svg viewBox="0 0 13 16" width="52" height="64" shapeRendering="crispEdges">
      {rects}
    </svg>
  );
}
