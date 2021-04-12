import { Paper, Typography } from "@material-ui/core";
import React from "react";
import { createUseStyles } from "react-jss";
import theme from "../../theme";
import { EvalMetrics } from "../../typings";

const useStyles = createUseStyles(() => ({
  hudRoot: {
    padding: theme.spacing(2),
    minWidth: 256,
  },
}));

interface HUDProps {
  activeColour: string;
  positionEval: number;
  evalMetrics: EvalMetrics;
}

export default function HUD(props: HUDProps): JSX.Element {
  const { activeColour, positionEval, evalMetrics } = props;
  const classes = useStyles();

  return (
    <Paper className={classes.hudRoot}>
      <Typography>{`Active colour: ${activeColour}`}</Typography>
      <Typography>{`Eval: ${positionEval.toFixed(3)}`}</Typography>
      {Object.entries(evalMetrics).map(([key, value]) => (
        <Typography>{`${key}: ${value}`}</Typography>
      ))}
    </Paper>
  );
}
