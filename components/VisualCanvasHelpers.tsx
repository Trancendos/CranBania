import type { VisualNode } from "@/lib/visual-types";

export function nodeCenter(n: VisualNode) {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

export function renderShape(node: VisualNode, selected: boolean) {
  const stroke = selected ? "var(--accent)" : "var(--border)";
  const fill =
    node.kind === "sticky"
      ? node.color ?? "#fef08a"
      : node.kind === "frame"
        ? "transparent"
        : node.color ?? "var(--surface)";

  const common = {
    stroke,
    strokeWidth: selected ? 2 : 1,
    fill,
  };

  switch (node.kind) {
    case "ellipse":
      return (
        <ellipse
          cx={node.width / 2}
          cy={node.height / 2}
          rx={node.width / 2}
          ry={node.height / 2}
          {...common}
        />
      );
    case "diamond": {
      const w = node.width / 2;
      const h = node.height / 2;
      return (
        <polygon
          points={`${w},0 ${node.width},${h} ${w},${node.height} 0,${h}`}
          {...common}
        />
      );
    }
    case "frame":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={4}
          strokeDasharray="6 4"
          {...common}
        />
      );
    case "wire_button":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={8}
          fill={node.color ?? "#6366f1"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
        />
      );
    case "wire_input":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={4}
          fill={node.color ?? "#334155"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
        />
      );
    case "wire_image":
      return (
        <>
          <rect
            width={node.width}
            height={node.height}
            rx={4}
            fill={node.color ?? "#475569"}
            stroke={stroke}
            strokeWidth={selected ? 2 : 1}
          />
          <line
            x1={8}
            y1={node.height - 12}
            x2={node.width - 8}
            y2={12}
            stroke="#94a3b8"
            strokeWidth={1}
          />
        </>
      );
    case "wire_nav":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={0}
          fill={node.color ?? "#475569"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
        />
      );
    case "wire_divider":
      return (
        <rect
          width={node.width}
          height={node.height}
          fill={node.color ?? "#64748b"}
          stroke="none"
        />
      );
    case "wire_checkbox":
    case "wire_heading":
    case "wire_label":
    case "wire_card":
      return (
        <rect
          width={node.width}
          height={node.height}
          rx={node.kind === "wire_card" ? 8 : 4}
          fill={node.kind === "wire_card" ? (node.color ?? "#334155") : "transparent"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1}
          strokeDasharray={node.kind === "wire_label" ? "4 2" : undefined}
        />
      );
    default:
      return <rect width={node.width} height={node.height} rx={6} {...common} />;
  }
}
