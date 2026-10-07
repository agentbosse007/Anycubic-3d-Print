# Anycubic 3D Print

A multi-material 3D printing preview and slicer-analysis tool for configuring filament assignments, purge planning, tool changes, and color bleed risk before exporting a print-ready workflow.

This project is built with React + TypeScript + Vite and includes a browser-based 3D viewport powered by Three.js for inspecting parts, purge towers, and color transitions.

## Features

- Interactive 3D print preview with orbit controls
- Multi-material filament management
- Purge / wipe tower visualization
- Bleed-risk simulation and analysis
- Nature-inspired material shading for preview realism
- Live slicing telemetry and tool change summary
- 3MF export flow for multi-color 3D printing workflows
- Preset model support and printer configuration

## Tech Stack

- React 19
- TypeScript
- Vite
- Three.js
- Tailwind CSS
- Express
- JSZip
- Lucide React

## Project Structure

```text
.
├── src/
│   ├── components/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── types.ts
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── README.md
```

## Requirements

- Node.js 20+
- npm or pnpm

## Installation

```bash
git clone https://github.com/agentbosse007/Anycubic-3d-Print.git
cd Anycubic-3d-Print
npm install
```

## Run locally

```bash
npm run dev
```

The app will start with the Vite dev server and open the local preview in the browser.

## Production build

```bash
npm run build
```

## Linting

```bash
npm run lint
```

## Notes

This project is focused on visualizing and planning multi-material print behavior, especially around purge volumes, filament swaps, and contamination risk for Anycubic-style multi-color workflows.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Support

For questions or issues related to the project, open a GitHub issue in this repository.
