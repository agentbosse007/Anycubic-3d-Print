# Anycubic 3D Print

A modern multi-material 3D printing workflow app designed to help makers preview, plan, and optimize filament transitions before they hit the printer.

Built for modern Anycubic-style color printing workflows, this project turns a complex print setup into a more visual, more intelligent, and more confident design experience.

## Why this project exists

Multi-material printing is powerful, but it is often hard to predict:

- when colors will bleed into each other,
- how much purge volume is truly needed,
- which transitions are risky,
- and how a part will look before the job starts.

This app focuses on making those decisions visible and actionable.

## What it does

- Preview a model in a real-time 3D viewport
- Assign and manage multiple filaments with ease
- Simulate purge and wipe tower behavior
- Detect likely color bleed risks
- Estimate waste and flushing requirements
- Explore a part before exporting multi-color workflows

## Built for multi-color printing teams

Whether you are prototyping a small colored part or optimizing a production-quality multi-material model, the app gives you a practical way to understand the print before sending it to the machine.

## Core features

### Interactive 3D modeling view

Orbit, inspect, and analyze your model with a browser-based 3D viewport built with Three.js.

### Filament planning

Assign materials and preview how different color combinations affect the final print flow.

### Purge and bleed simulation

Model transition zones, identify waste-heavy regions, and understand where contamination is most likely to occur.

### Slicing analysis

Monitor total tool swaps, purge volume, and color-switch behavior in a single workflow.

### Export-friendly workflow

Prepare the model for a multi-color 3D printing pipeline with tools designed around print planning and export readiness.

## Product highlights

- Intuitive, visual workflow for filament planning
- More confidence before printing expensive materials
- Cleaner color transitions through better purge intelligence
- Better estimation of waste and tool-change cost
- Flexible for experimentation, testing, and iterative design

## Tech stack

- React 19
- TypeScript
- Vite
- Three.js
- Tailwind CSS
- Express
- JSZip
- Lucide React

## Project structure

```
.
├── src/
│   ├── components/
│   ├── utils/
│   ├── App.tsx
│   ├── main.tsx
│   └── types.ts
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── README.md
└── .gitignore
```

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
git clone https://github.com/agentbosse007/Anycubic-3d-Print.git
cd Anycubic-3d-Print
npm install
```

### Run locally

```bash
npm run dev
```

The dev server will start on `http://localhost:3000` with hot module reloading.

### Build for production

```bash
npm run build
```

Outputs optimized bundle to `dist/`.

### Validate types and linting

```bash
npm run lint
```

## Why it stands out

This project is more than a viewer. It is a planning layer for multi-color 3D printing: helping users understand how a part behaves before they commit to a print.

That means:

- fewer surprises on the printer,
- less wasted filament,
- better color decisions,
- and a more controlled multi-material workflow.

## Use cases

- Reviewing filament transitions before printing
- Planning purge and wipe tower settings
- Simulating material swaps for multi-color parts
- Teaching and exploring multi-material behavior
- Building a visual workflow for advanced print preparation

## Performance

This project includes targeted optimizations for multi-material workflows:

- Cached hex color parsing and luminance calculations
- Precomputed segment bounds for faster layer scanning
- Memoized filament lookups to reduce React reconciliation overhead
- Efficient 3D viewport rendering with O(1) material assignment

For details, see [PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md).

## Roadmap

Potential future improvements include:

- Richer slicer simulation controls
- More detailed purge-optimization recommendations
- Additional preset printer profiles
- Performance improvements for larger geometry sets
- Export enhancements for print preparation pipelines

## Contributing

We welcome contributions, ideas, and improvements. If you have a feature idea or a bug fix:

1. Open an issue to discuss the change
2. Fork the repository
3. Create a feature branch (`git checkout -b feature/amazing-feature`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is provided as-is for experimentation and development use.

## Support

For questions, issues, or feature requests, please use the [GitHub issue tracker](https://github.com/agentbosse007/Anycubic-3d-Print/issues) in this repository.

---

Designed for makers who want more confidence, more clarity, and better outcomes from multi-material 3D printing.
