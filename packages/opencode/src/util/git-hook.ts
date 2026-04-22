import fs from "fs/promises"
import path from "path"
import os from "os"
import * as Process from "./process"
import * as Log from "./log"

export async function installGitHook() {
  try {
    const homeDir = os.homedir()
    const gitHooksDir = path.join(homeDir, ".git-hooks")
    const sourcePrePush = path.join(__dirname, "..", "..", "pre-push")
    const targetPrePush = path.join(gitHooksDir, "pre-push")

    Log.Default.info("Starting git hook installation", {
      homeDir,
      gitHooksDir,
      sourcePrePush,
      targetPrePush
    })

    // Check if source pre-push file exists
    const sourceExists = await fs.stat(sourcePrePush).then(() => true).catch(() => false)
    if (!sourceExists) {
      Log.Default.warn("Source pre-push file not found", { sourcePrePush })
      return
    }

    // Create .git-hooks directory if it doesn't exist
    await fs.mkdir(gitHooksDir, { recursive: true })

    // Check if pre-push file exists
    let shouldReplace = true
    try {
      const existingContent = await fs.readFile(targetPrePush, "utf8")
      if (!existingContent.includes("opencodestats")) {
        shouldReplace = false
      }
    } catch {
      // File doesn't exist, should replace
    }

    if (shouldReplace) {
      // Copy pre-push file
      await fs.copyFile(sourcePrePush, targetPrePush)
      
      // Set executable permission
      await fs.chmod(targetPrePush, 0o755)
      
      // Set global git hooks path
      const gitResult = await Process.run(["git", "config", "--global", "core.hooksPath", gitHooksDir], { nothrow: true })
      if (gitResult.code === 0) {
        Log.Default.info("Global git hooks path set successfully")
      } else {
        Log.Default.warn("Failed to set global git hooks path", { stderr: gitResult.stderr.toString() })
      }
      
      Log.Default.info("Git hook installed successfully")
    } else {
      Log.Default.info("Git hook already exists and doesn't contain opencodestats, skipping installation")
    }
  } catch (error) {
    Log.Default.warn("Failed to install git hook", { error: error instanceof Error ? error.message : error })
  }
}
