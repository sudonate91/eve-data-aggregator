# EVE Data Aggregator

A CLI tool for importing EVE Online corporation wallet and contract data from the ESI API to MySQL databases.

## Installation

Choose your preferred installation method:

- **🚀 [Quick Install Guide](INSTALL.md)** - All installation methods in one place
- **🐳 [Docker Hub](INSTALL.md#option-1-docker-hub-recommended)** - Pull pre-built image (easiest!)
- **📦 [Git + Docker](INSTALL.md#option-2-git--docker-compose)** - Clone and build locally
- **🖥️ [Unraid](UNRAID.md)** - Deploy on Unraid with WebUI configuration
- **📚 [Docker Details](DOCKER.md)** - Advanced Docker configuration
- **⚙️ Native Node.js** - Install and run directly with Node.js (see below)

## Prerequisites

You need to have Node.js installed on your computer to run this project. Follow the instructions below to install Node.js:

### Installing Node.js

1. **Download Node.js**:
   Go to the [Node.js download page](https://nodejs.org/) and download the installer for your operating system.

2. **Run the Installer**:
   Run the downloaded installer and follow the prompts in the setup wizard. The installer will install both Node.js and npm (Node Package Manager).

3. **Verify Installation**:
   Open a terminal or command prompt and run the following commands to verify that Node.js and npm are installed correctly:

   ```bash
   node -v
   npm -v
   ```

   You should see the version numbers of Node.js and npm.

## Installation

After installing Node.js, you can install the CLI globally:

```bash
npm install -g eve-import-cli
```

## Configuration

### For Docker/Unraid Users
See [DOCKER.md](DOCKER.md) or [UNRAID.md](UNRAID.md) for deployment-specific configuration.

### For Native Node.js
Create a `.env` file in the root of your project (use `.env.example` as a template):

```bash
cp .env.example .env
```

Then edit `.env` with your configuration:

```env
CLIENT_ID=your-client-id
CALLBACK_URL=https://localhost/callback/
SCOPE="esi-wallet.read_corporation_wallets.v1 esi-contracts.read_corporation_contracts.v1"
STATE=unique-state
CORPORATION_ID=your-corporation-id
# ... see .env.example for all options
```

### Database Setup

Ensure your MySQL database server is running and accessible. The application supports multiple corporation databases:
- Main corporation database (S0b)
- Structure management database (S0b_Struct)
- Additional corporation databases (Ven0m, KryTek, S0b_Mart)

## Usage

### Docker/Unraid
See deployment-specific guides:
- [DOCKER.md](DOCKER.md) - Docker commands and configuration
- [UNRAID.md](UNRAID.md) - Unraid WebUI deployment

### Native Node.js

Start the CLI:
```bash
node bin/index.mjs
```

Or if installed globally:
```bash
eve-import-cli
```

The application will:
1. Connect to your databases
2. Prompt you to select which jobs to run
3. Ask for an interval if you want recurring imports
4. Execute the selected jobs

### Features

- **Interactive Job Selection** - Choose which corporation data to import
- **OAuth Flow** - Secure EVE Online SSO authentication
- **Wallet Import** - Import corporation wallet transactions
- **Contract Import** - Import corporation contracts
- **Scheduled Execution** - Run jobs at regular intervals
- **Multi-Corporation Support** - Manage multiple corporations

## Contributing

Contributions are welcome ...

## License

This project is licensed ...
