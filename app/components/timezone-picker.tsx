'use client';

import { setDisplayZone, storedZone, useDisplayZone } from '@/lib/display-zone';
import { browserZone } from '@/lib/tz';
import { TimezoneSelect } from './timezone-select';

export function TimezonePicker() {
  const zone = useDisplayZone();
  if (!zone) return <span aria-hidden className="hidden h-7 w-28 sm:block" />;

  // `storedZone()` distinguishes "explicitly chose this zone" from "this is
  // simply where the device is" — the two can be the same string and the
  // control has to show them differently.
  const chosen = storedZone();

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <span aria-hidden className="text-sm">
        🌐
      </span>
      <label htmlFor="tz-picker" className="sr-only">
        Display time zone
      </label>
      <TimezoneSelect
        id="tz-picker"
        compact
        allowAuto
        value={chosen}
        deviceZone={browserZone()}
        onChange={setDisplayZone}
      />
    </div>
  );
}
