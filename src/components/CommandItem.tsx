import Icon from "./Icon";
import type { CmdItem } from "./useCommandBar";

type Props = { item: CmdItem; id: string; active: boolean; onHover: () => void; onPick: () => void };

/** One option of the command list. Keyboard focus stays in the input (aria-activedescendant), so this is not focusable. */
export default function CommandItem({ item, id, active, onHover, onPick }: Props) {
  return (
    <li id={id} role="option" aria-selected={active} className={`cmd-item${active ? " on" : ""}`}
      onMouseMove={onHover} onMouseDown={(e) => e.preventDefault()} onClick={onPick}>
      <Icon name={item.icon} size={18} />
      <span className="cmd-label">{item.label}</span>
      {item.hint && <small className="cmd-hint">{item.hint}</small>}
    </li>
  );
}
