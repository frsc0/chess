import { createMuiTheme, ThemeOptions } from "@material-ui/core";
import { colourTemplateSplitChar } from "./globalConstants";

export const themeConstants = {
  backgroundColour: "#121212",
  board: {
    light: "#f0dab5",
    dark: "#b58962",
  },
  moveTrail: `rgba(66, 133, 244, ${colourTemplateSplitChar})`,
};

const muiThemeOptions: ThemeOptions = {
  palette: {
    type: "dark",
  },
};

const muiTheme = createMuiTheme(muiThemeOptions as ThemeOptions);

export default muiTheme;
