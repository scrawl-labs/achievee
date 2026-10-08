export default function Summary({ items }: { items: [string, string][] }) {
  return (
    <dl className="summary">
      {items.map(([label, value]) => (
        <div key={label}><dd>{value}</dd><dt>{label}</dt></div>
      ))}
    </dl>
  );
}
