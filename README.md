# Shopify Sync App

A desktop application built with Tauri + React + TypeScript that helps synchronize content between Shopify environments (staging and production).

## Features

- **Collections Sync**: Compare and sync collections between environments
- **Products Sync**: Compare and sync products with support for images and metafields
- **Pages Sync**: Compare and sync pages between environments
- **Files Sync**: Compare and sync media files between environments
- **Real-time Progress**: Visual feedback for comparison and sync operations
- **Detailed Comparison**: Side-by-side view of differences between environments
- **Batch Operations**: Select multiple items for syncing
- **Search & Filter**: Easily find items by name or status
- **Persistent Settings**: Store environment configurations locally
- **Cross-Platform**: Works on Windows and macOS

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version)
- [Rust](https://www.rust-lang.org/tools/install)
- [VS Code](https://code.visualstudio.com/) (recommended)
- VS Code Extensions:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/shopify-sync-app.git
cd shopify-sync-app
```

2. Install dependencies:

```bash
yarn install
```

3. Start the development server:

```bash
yarn tauri dev
```

### Building

To create a production build:

```bash
yarn tauri build
```

This will create installers in the `src-tauri/target/release/bundle` directory.

## Environment Configuration

The app requires Shopify Admin API access tokens for both staging and production environments. These can be configured through the settings page in the app.

Required permissions for the Admin API:

- write_products
- read_products
- read_product_listings
- write_product_listings
- write_online_store_pages
- read_online_store_pages
- write_content
- read_content
- read_files
- write_files
- read_themes
- read_publications
- write_publications

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

We use semantic commit messages to automate versioning:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `chore:` for maintenance tasks
