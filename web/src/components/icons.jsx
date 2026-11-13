const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  width: 20,
  height: 20,
  'aria-hidden': true,
};

const make = (paths) => {
  const Icon = (props) => (
    <svg {...base} {...props}>
      {paths}
    </svg>
  );
  return Icon;
};

export const IconHome = make(
  <>
    <path d="M3 10.7 12 3l9 7.7" />
    <path d="M5.5 9.5V21h13V9.5" />
    <path d="M9.5 21v-5.5h5V21" />
  </>
);

export const IconUsers = make(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" />
    <path d="M16.5 5.4a3.1 3.1 0 0 1 0 5.8" />
    <path d="M18 14.6c2 .6 3.3 2.3 3.3 4.4" />
  </>
);

export const IconWallet = make(
  <>
    <rect x="2.8" y="6" width="18.4" height="13" rx="3" />
    <path d="M2.8 9.5h18.4" />
    <path d="M16.6 14.2h2.4" />
    <path d="M5.6 6V4.9A1.9 1.9 0 0 1 7.5 3h9.4" />
  </>
);

export const IconPalette = make(
  <>
    <path d="M12 3a9 9 0 1 0 0 18c1.3 0 1.9-.9 1.9-1.9 0-.9-.7-1.5-.7-2.3 0-.7.6-1.3 1.4-1.3h1.6A4.8 4.8 0 0 0 21 10.7C21 6.4 17 3 12 3Z" />
    <circle cx="7.6" cy="10" r="1.1" />
    <circle cx="10.4" cy="6.9" r="1.1" />
    <circle cx="15" cy="7.2" r="1.1" />
  </>
);

export const IconLogout = make(
  <>
    <path d="M9.5 21H5.4A2.4 2.4 0 0 1 3 18.6V5.4A2.4 2.4 0 0 1 5.4 3h4.1" />
    <path d="M15.8 16.5 20.5 12l-4.7-4.5" />
    <path d="M20 12H9.2" />
  </>
);

export const IconMenu = make(
  <>
    <path d="M3.5 6.5h17" />
    <path d="M3.5 12h17" />
    <path d="M3.5 17.5h17" />
  </>
);

export const IconPlus = make(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>
);

export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.4" />
    <path d="m20 20-3.6-3.6" />
  </>
);

export const IconCalendar = make(
  <>
    <rect x="3.4" y="5" width="17.2" height="16" rx="2.6" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M3.4 10h17.2" />
  </>
);

export const IconFile = make(
  <>
    <path d="M14 3H7a2.4 2.4 0 0 0-2.4 2.4v13.2A2.4 2.4 0 0 0 7 21h10a2.4 2.4 0 0 0 2.4-2.4V8.4Z" />
    <path d="M14 3v5.4h5.4" />
    <path d="M8.6 12.6h6.8" />
    <path d="M8.6 16.2h5" />
  </>
);

export const IconCopy = make(
  <>
    <rect x="9" y="9" width="11.4" height="11.4" rx="2.4" />
    <path d="M14.6 6.2V5.4A2.4 2.4 0 0 0 12.2 3H6.4A2.4 2.4 0 0 0 4 5.4v5.8a2.4 2.4 0 0 0 2.2 2.4" />
  </>
);

export const IconUpload = make(
  <>
    <path d="M12 16V4" />
    <path d="m7.6 8.4 4.4-4.4 4.4 4.4" />
    <path d="M4 15.4v2.8A2.8 2.8 0 0 0 6.8 21h10.4a2.8 2.8 0 0 0 2.8-2.8v-2.8" />
  </>
);

export const IconDownload = make(
  <>
    <path d="M12 4v12" />
    <path d="m7.6 11.6 4.4 4.4 4.4-4.4" />
    <path d="M4 17.6v.6A2.8 2.8 0 0 0 6.8 21h10.4a2.8 2.8 0 0 0 2.8-2.8v-.6" />
  </>
);

export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7" />
    <path d="m6.4 7 .9 12.1A2.1 2.1 0 0 0 9.4 21h5.2a2.1 2.1 0 0 0 2.1-1.9L17.6 7" />
    <path d="M10.2 11v5.6" />
    <path d="M13.8 11v5.6" />
  </>
);

export const IconCheck = make(<path d="m4.6 12.4 4.8 4.8L19.4 7" />);

export const IconArrowLeft = make(
  <>
    <path d="M20 12H4.4" />
    <path d="m10 5.6-6.4 6.4L10 18.4" />
  </>
);

export const IconX = make(
  <>
    <path d="m6 6 12 12" />
    <path d="M18 6 6 18" />
  </>
);

export const IconCard = make(
  <>
    <rect x="2.8" y="5" width="18.4" height="14" rx="2.8" />
    <path d="M2.8 10h18.4" />
    <path d="M6.6 15h4" />
  </>
);

export const IconClipboard = make(
  <>
    <path d="M9 4.4H7.2A2.2 2.2 0 0 0 5 6.6v12.2A2.2 2.2 0 0 0 7.2 21h9.6a2.2 2.2 0 0 0 2.2-2.2V6.6a2.2 2.2 0 0 0-2.2-2.2H15" />
    <rect x="9" y="2.6" width="6" height="3.8" rx="1.4" />
    <path d="M9 11.4h6" />
    <path d="M9 15.6h4.4" />
  </>
);

export const IconSparkle = make(
  <>
    <path d="M12 3.2 13.7 8 18.4 9.7 13.7 11.4 12 16.2 10.3 11.4 5.6 9.7 10.3 8Z" />
    <path d="M18 15.2 18.8 17.4 21 18.2 18.8 19 18 21.2 17.2 19 15 18.2 17.2 17.4Z" />
  </>
);

export const IconShield = make(
  <>
    <path d="M12 3 4.8 6v5.6c0 4.3 3 7.8 7.2 9.4 4.2-1.6 7.2-5.1 7.2-9.4V6Z" />
    <path d="m9 12 2.2 2.2L15.4 10" />
  </>
);

export const IconChevronRight = make(<path d="m9.2 5.6 6.4 6.4-6.4 6.4" />);

export const IconPhone = make(
  <>
    <path d="M20.4 16.9v2.1a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6A19.6 19.6 0 0 1 .7 3.7 2 2 0 0 1 2.7 1.6h2.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6 9.3a16 16 0 0 0 6 6l1.1-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  </>
);

export const IconMail = make(
  <>
    <rect x="2.8" y="5" width="18.4" height="14" rx="2.8" />
    <path d="m3.6 7.4 8.4 5.8 8.4-5.8" />
  </>
);

export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 7.4V12l3 2" />
  </>
);
