import fs from "fs";
import path from "path";

const themeId = process.argv[2];

if (!themeId) {
  console.error(
    "Please provide a theme ID (e.g., npm run theme:install catppuccin)",
  );
  process.exit(1);
}

async function installTheme() {
  const url = `https://tweakcn.com/r/themes/${themeId}.json`;
  console.log(`Fetching theme from ${url}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch theme: ${response.statusText}`);
    }

    const data = await response.json();
    const { name, cssVars } = data;

    const themeName = name || themeId;
    const cssPath = path.join(
      process.cwd(),
      "app",
      "themes",
      `${themeName}.css`,
    );

    let cssContent = `.theme-${themeName} {\n`;
    for (const [key, value] of Object.entries(cssVars.light)) {
      cssContent += `  --${key}: ${value};\n`;
    }
    cssContent += "}\n\n";

    cssContent += `.dark .theme-${themeName} {\n`;
    for (const [key, value] of Object.entries(cssVars.dark)) {
      cssContent += `  --${key}: ${value};\n`;
    }
    cssContent += "}\n";

    fs.writeFileSync(cssPath, cssContent);
    console.log(`Theme CSS saved to ${cssPath}`);

    // Update globals.css
    const globalsPath = path.join(process.cwd(), "app", "globals.css");
    let globalsContent = fs.readFileSync(globalsPath, "utf8");
    const importStatement = `@import "./themes/${themeName}.css";`;

    if (!globalsContent.includes(importStatement)) {
      // Find the last @import and insert after it
      const lines = globalsContent.split("\n");
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("@import")) {
          lastImportIndex = i;
        }
      }

      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStatement);
        globalsContent = lines.join("\n");
      } else {
        globalsContent = importStatement + "\n" + globalsContent;
      }

      fs.writeFileSync(globalsPath, globalsContent);
      console.log(`Added @import to app/globals.css`);
    }

    // Update theme-customizer.tsx
    const customizerPath = path.join(
      process.cwd(),
      "components",
      "layout",
      "others",
      "theme-customizer.tsx",
    );
    let customizerContent = fs.readFileSync(customizerPath, "utf8");

    // Check if the theme is already in the list
    if (!customizerContent.includes(`name: "${themeName}"`)) {
      const colorsMatch = customizerContent.match(
        /const colors: { name: ThemeColor; label: string; color: string }\[] = \[([\s\S]*?)];/,
      );
      if (colorsMatch) {
        const existingColors = colorsMatch[1];
        const newColorEntry = `    { name: "${themeName}", label: "${themeName.charAt(0).toUpperCase() + themeName.slice(1)}", color: "bg-primary" },\n`;
        const updatedColors = existingColors + newColorEntry;
        customizerContent = customizerContent.replace(
          existingColors,
          updatedColors,
        );
        fs.writeFileSync(customizerPath, customizerContent);
        console.log(`Added theme to ThemeCustomizer`);
      }
    }

    console.log(`Theme ${themeName} installed successfully!`);
  } catch (error) {
    console.error("Error installing theme:", error);
    process.exit(1);
  }
}

installTheme();
