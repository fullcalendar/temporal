
next
----
- fixed root .d.ts exports (only affects legacy node)
- TODO: ensure <root>/impl.d.ts exported


v0.0.7 (2022-05-06)
-------------------

- BREAKING: side-effect-free entrypoint now exports named exports instead of default `Temporal`
  - No longer works: `import Temporal from 'temporal-polyfill'`
  - Works: `import { Temporal } from 'temporal-polyfill'`
  - Allows access to `Intl` side-effect-free export
- Uses types created by TC39 Committee


v0.0.6 (2022-04-06)
-------------------

- Improved spec-compliance. Passes all tests from @js-temporal/polyfill repo.


v0.0.5 (2022-03-16)
-------------------

- Intl.DateTimeFormat corretly polyfilled to customize output based on Temporal type
- fixes to TimeZone object


v0.0.4 (2022-03-10)
-------------------

- improved support for non-ISO calendars
- fixed `Now` methods returning wrong results (#5)
