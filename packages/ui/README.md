# @achievee/ui

Achievee's design system as a package: tokens and React components. The docs live at `/design` in the app.

```tsx
import "@achievee/ui/tokens.css";
import "@achievee/ui/styles.css";
import { Button, Chip, Paper, Surface } from "@achievee/ui";
```

- `tokens.json` is the one source of the tokens. After changing it, run `npm run tokens -w @achievee/ui` to regenerate `src/tokens.css` (`--ac-*` custom properties, light and dark).
- Components: Surface, Button / ButtonLink, IconButton, Chip / ChipRow, Field, Select, Checkbox, Paper, Label, SaveStatus, List / ListRow / DayHeader, DayFlower, Tabs, ConfirmDialog.
- Rules: one surface per group, at most one sunk layer inside it, no borders to separate areas, one primary button per surface. See `/design/principles`.
