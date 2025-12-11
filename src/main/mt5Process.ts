import { spawn } from "child_process";
import path from "path";

export interface Mt5SummaryParams {
    dateFrom?: string; // "YYYY-MM-DD"
    dateTo?: string;   // "YYYY-MM-DD"
}

export function runMt5Summary(params: Mt5SummaryParams): Promise<any> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "mt5_service.py");
        const pythonCmd = process.platform === "win32" ? "python" : "python3";

        const args = [scriptPath, "summary"];
        if (params.dateFrom) {
            args.push("--from", params.dateFrom);
        }
        if (params.dateTo) {
            args.push("--to", params.dateTo);
        }

        const child = spawn(pythonCmd, args);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {
            if (stderr.trim().length > 0) {
                console.error("mt5_service stderr:", stderr);
            }

            if (code !== 0) {
                return reject(new Error(`mt5_service exited with code ${code}`));
            }

            try {
                const json = JSON.parse(stdout);
                resolve(json);
            } catch (err) {
                reject(
                    new Error("Failed to parse mt5_service JSON output: " + String(err))
                );
            }
        });

        child.on("error", (err) => {
            reject(err);
        });
    });
}
