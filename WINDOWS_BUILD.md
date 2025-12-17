# Building Trade Journal on Windows

Since I (Antigravity) run on your Mac, I cannot directly build the `.exe` file on your Windows machine. You will need to clone the project on Windows and run the build command there.

Here is the step-by-step guide:

## 1. Prerequisites (On Windows)
Ensure you have these installed on your Windows computer:

1.  **Git**: [Download Git for Windows](https://git-scm.com/download/win)
2.  **Node.js (LTS Version)**: [Download Node.js](https://nodejs.org/) (Choose the LTS version, e.g., v20.x or v22.x).

## 2. Clone the Repository
Open **Command Prompt** (cmd) or **PowerShell** on Windows and run:

```bash
git clone https://github.com/Deniz2028/traderjournal.git
cd traderjournal
```

## 3. Install Dependencies
Run the following command to install all necessary libraries:

```bash
npm install
```

## 4. Build the App (.exe)
I have added a special script for you. Run this command:

```bash
npm run build:win
```

**What this does:**
1.  Compiles the React/TypeScript code.
2.  Packages it into a Windows installer.

## 5. Locate the Output
Once the command finishes successfully, look in the `dist` or `out` folder inside the project directory.
You should find a file named something like:
`Trade Journal Setup 1.1.21.exe`

You can send this `.exe` file to your friend! 🚀
