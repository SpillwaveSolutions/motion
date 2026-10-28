# Screen: Theme settings

## Goal

You pick an export theme, or make your own, and set the colors that PDF and Word export use. This includes the table colors.

## Layout

The **Theme settings** dialog opens from the **Themes** button in the header.

```
+------------------------------------------------------------+
| Themes                                                     |
| Ice Snowstorm is navy and ice. Clay is ...                 |
+------------------+-----------------------------------------+
| [Ice Snowstorm]  | Name            [Harbor            ]    |
| [Clay]           | Page            [#] [#F3F6FB]           |
| [Harbor]         | Text            [#] [#111111]           |
|                  | Headings        [#] [#0B1F4B]           |
|                  | Accent          [#] [#1D4E89]           |
|                  | Tables                                  |
|                  | Table header         [#] [#1D4E89]      |
|                  | Table header text    [#] [#FFFFFF]      |
|                  | Table row            [#] [#FFFFFF]      |
|                  | Table alternate row  [#] [#E4EDF7]      |
|                  | Table border         [#] [#B8C7DB]      |
|                  | Body font       [sans v]                |
|                  | Heading font    [sans v]                |
|                  | (o) Use for export                      |
+------------------+-----------------------------------------+
| [New theme] [Delete]              [Cancel] [Save themes]   |
+------------------------------------------------------------+
```

## Key elements

| Element | Type | Behavior or notes |
| --- | --- | --- |
| Theme list | Toggle buttons | Selects the theme that the form shows. |
| Color fields | Color picker and hex input | One pair per color. Disabled for builtin themes. |
| **Tables** | Group heading | Groups the five table colors. It is a heading, not a control. |
| **Table header** | Color field | Header row fill in the preview, PDF, and Word. |
| **Table header text** | Color field | Header row text. The header text is bold. |
| **Table row** | Color field | Fill for odd body rows. |
| **Table alternate row** | Color field | Fill for even body rows, for the stripes. |
| **Table border** | Color field | Cell border lines. |

## States

- **Default**: The form shows the selected theme. Builtin themes show all values, disabled.
- **Empty**: Not applicable. The two builtins always exist.
- **Loading**: Not applicable. The themes come from settings that are already loaded.
- **Error**: A hex value that does not parse falls back to the default color for that field when you save.

## Acceptance criteria

- [x] The five table color fields show under a **Tables** heading, after **Accent**.
- [x] Each table field has the accessible names `<label> color` and `<label> hex`.
- [x] The table fields are disabled for Ice Snowstorm and Clay.
- [x] **New theme** copies the table colors from the selected theme.
- [x] A saved table color persists after you reopen the dialog.
- [x] The export preview, PDF, and Word file all use the saved table colors.
- [ ] The export preview, PDF, and Word file do not show YAML front matter. The note's H1 is the title.
- [ ] Headings, paragraphs, and tables have space above and below them in PDF and Word. Two tables in a row stay apart.

## Notes

- The dialog is desktop only. It does not change layout at narrow widths.
- The **Tables** heading is an `h3`, so screen readers can jump to the group.
