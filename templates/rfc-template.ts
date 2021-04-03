import React, { useEffect } from "react";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles((theme) => ({}));

interface RFCTemplateProps {
  example?: string;
}

export default function RFCTemplate(props: RFCTemplateProps): JSX.Element {
  const { example } = props;
  const classes = useStyles();

  useEffect(() => {}, []);

  return <div />;
}
