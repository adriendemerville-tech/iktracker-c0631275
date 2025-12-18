import { SVGProps } from 'react';

export const WazeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.16.05.34-.03.41-.18.07-.15.02-.33-.12-.43-.89-.64-1.49-1.68-1.49-2.88 0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5c0 1.2-.6 2.24-1.49 2.88-.14.1-.19.28-.12.43.07.15.25.23.41.18C17.13 20.17 20 16.42 20 12c0-5.52-4.48-10-10-10z"
      fill="currentColor"
    />
    <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="10" r="1.5" fill="currentColor" />
    <path
      d="M12 15c-1.1 0-2.1-.45-2.83-1.17-.2-.2-.2-.51 0-.71.2-.2.51-.2.71 0 .53.53 1.26.88 2.12.88s1.59-.35 2.12-.88c.2-.2.51-.2.71 0 .2.2.2.51 0 .71C14.1 14.55 13.1 15 12 15z"
      fill="currentColor"
    />
  </svg>
);
