<template>
  <svg
    class="mx-auto"
    width="1.5rem"
    height="1.5rem"
    viewBox="0 0 38 38"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#fff" stop-opacity="0.2" />
      </linearGradient>
    </defs>
    <g transform="translate(19,19)">
      <circle r="16" fill="none" stroke="url(#ringGrad)" stroke-width="3">
        <animate
          attributeName="stroke-dasharray"
          dur="1.2s"
          repeatCount="indefinite"
          values="0 150;100 150;0 150"
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="1.2s"
          repeatCount="indefinite"
          values="0;360"
        />
      </circle>
    </g>
  </svg>
</template>
